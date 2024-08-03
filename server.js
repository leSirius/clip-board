import fs from 'node:fs/promises'
import express from 'express'
import {Transform} from 'node:stream'
import {getTimeStamp, randomString, urls} from "./src/toolkit/utility.js";

// Constants

const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 3000
const base = process.env.BASE || '/'
const ABORT_DELAY = 10000;
const clients = [];

// sirius 1111111111111111 Eq/QbSt9kKwbdcvYQ+VfuQ==             // sirius 2222222222222222 lGu/FRhEiq7F8vgfjraEHA==
const registered = new Map([
  ['Eq/QbSt9kKwbdcvYQ+VfuQ==', {content:"", update:0}],
  ['lGu/FRhEiq7F8vgfjraEHA==', {content:"", update:0}]
]);
const connectMap = new Map();                     // set(token, [])
const waitingRes = new Map();                     // set(identifier, {res, time:getTimeStamp()})
const identifierMap = new Map();                  // set(identifier, {token, eventRes:res})
setInterval(()=>{
  cleanTimeOut();
  !isProduction && logging();
}, 5000);
// ---------------------------------- Init ----------------------------------

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile('./dist/client/index.html', 'utf-8')
  : '' ;
const ssrManifest = isProduction
  ? await fs.readFile('./dist/client/.vite/ssr-manifest.json', 'utf-8')
  : undefined ;

// Create http server
const app = express()

// Add Vite or respective production middlewares
let vite
if (!isProduction) {
  const {createServer} = await import('vite')
  vite = await createServer({
    server: {middlewareMode: true},
    appType: 'custom',
    base
  })
  app.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  app.use(compression());
  app.use(base, sirv('./dist/client', {extensions: []}))
}

// ---------------------------------- Paths ----------------------------------
app.get('/', requestRoot);
app.post("*", express.urlencoded({extended: false}));
app.post("*", express.json());

app.get(urls.eventSource, (req, res)=>{
  const identifier = randomString(8);
  setEventHeaders(res);
  addToWaiting(identifier, res);
  sendSingleEvent(res,'identifier', {identifier})
});

app.post(urls.identify, (req, res)=>{
  const {token, identifier, newUser} = req.body;
  const eventRes = popFromWaiting(identifier);
  if (isInvalidAndReject(res, eventRes, token, newUser, identifier)) { return ; }
  res.end();
  addToIdMap(identifier, token, eventRes);
  addToGroup(token, eventRes, identifier);
  sendSingleEvent(eventRes, 'success', {count:getGroupSize(token)});
  sendCache(token, eventRes);
  const message = eventMaker('count', {count:getGroupSize(token)});
  groupCast(token, message, eventRes);
});

app.post(urls.text, (req, res)=>{
  const {identifier, content, update} = req.body;
  if (!hasInIdMap(identifier)) { res.end(); return; }
  const {token, eventRes} = getFromIdMap(identifier);
  updateRegistered(token, content, update);
  const message = eventMaker('message', {content, update});
  groupCast(token, message, eventRes);
  res.end();
})

app.post(urls.disconnect, (req, res)=>{
  const {identifier} = req.body;
  const info = getFromIdMap(identifier);
  if (info!==void 0) { sendSingleEvent(info.eventRes,'test'); }
  res.end();
});

// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`)
})

// ---------------------------------- New Helpers ----------------------------------

// `````````````````````````````````` Response Handlers and others``````````````````````````````````
function authentication (token, newUser) {
  newUser && setRegistered(token);
  return hasRegistered(token);
}

function invalidMessage(token, newUser, identifier) {
  return !authentication(token, newUser) ?
    `Invalid token: ${token}.` : `Invalid identifier: ${identifier}.`;
}
function setEventHeaders(res) {
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}
function eventMaker(type, data) {
  const typeList = new Set(["identifier", "success", "fail", "count", "message", "reduce", "test"]);
  if (!typeList.has(type)) { console.log(`Non-recorded event type ${type} !!!!!!!!!!!!!!!!!!!!!!!!!!!!`); }

  if (typeof data!=='string') { data = JSON.stringify(data); }
  return `event: ${type}\ndata: ${data}\n\n`;
  // `event: message\ndata: ${JSON.stringify({content, update})}\n\n`;
}
function writeFlush(res, message) {
  res.write(message);
  isProduction && res.flush();
}
function sendSingleEvent(res, type, data) {
  writeFlush(res, eventMaker(type, data));
}
function isInvalidAndReject(res, eventRes, token, newUser, identifier) {
  // waitingRes map has been cleaned in previous pop
  if (!eventRes || !authentication(token, newUser)) {
    const message = invalidMessage(token, newUser, identifier);
    rejectRes(res, message);
    eventRes && sendSingleEvent(eventRes, 'fail', message.split(":")[0]);
    return true;
  }
  return false;
}
function rejectRes(res, reason) {
  res.send({info: reason});
}
function closeCleanWrapper(token, identifier, res) {
  return () =>{
    deleteFromIdMap(identifier);
    cleanGroup(res, token)
    res.end();
  }
}
// `````````````````````````````````` Registered Handlers ``````````````````````````````````
function sendCache(token, res) {
  // just for new connection
  if (hasCachedContent(token)) {
    sendSingleEvent(res, 'message', getRegistered(token))
  }
}
function hasRegistered(token) {
  return registered.has(token);
}
function hasCachedContent(token) {
  if (!hasRegistered(token)) { return false; }
  return getRegistered(token).update > 0;
}
function setRegistered(token, content="", update=0) {
  registered.set(token, {content, update});
}
function getRegistered(token) {
  if (!hasRegistered(token)) { return void 0; }
  return registered.get(token);
}
function updateRegistered(token, content, update) {
  if (!hasRegistered(token)) { return void 0; }
  const existing = getRegistered(token).update;
  if (update>existing) {
    setRegistered(token, content, update);
    return true;
  }
  return false;
}
// `````````````````````````````````` Waiting Handlers ``````````````````````````````````
function addToWaiting(identifier, res) {
  waitingRes.set(identifier, {res, time:getTimeStamp()});
}

function hasInWaiting(identifier) {
  return waitingRes.has(identifier);
}

function popFromWaiting(identifier) {
  if (!hasInWaiting(identifier)) { return void 0; }
  const res = waitingRes.get(identifier).res;
  waitingRes.delete(identifier);
  return res;
}
// `````````````````````````````````` IdentifierMap Handlers ``````````````````````````````````
function addToIdMap(identifier, token, res) {
  identifierMap.set(identifier, {token, eventRes:res});
}

function hasInIdMap(identifier) {
  return identifierMap.has(identifier);
}

function getFromIdMap(identifier) {
  if (!hasInIdMap(identifier)) { return void 0; }
  return identifierMap.get(identifier);
}

function deleteFromIdMap(identifier) {
  identifierMap.delete(identifier)
}

// `````````````````````````````````` ConnectMap Handlers ``````````````````````````````````
function groupCast(token, message, except) {
  const group = getGroup(token);
  group.forEach(client => { (client!==except) && writeFlush(client, message); });
}

function addToGroup(token, res, identifier) {
  if (!hasGroup(token)) { addNewGroup(token); }
  const group = getGroup(token);
  group.push(res);
  res.on('close', closeCleanWrapper(token, identifier, res));
}

function hasGroup(token) {
  return connectMap.has(token);
}
function getGroup(token) {
  return connectMap.get(token);
}
function getGroupSize(token) {
  if (!hasGroup(token)) { return 0; }
  return getGroup(token).length;
}

function addNewGroup(token) {
  if (connectMap.has(token)) { return ; }
  connectMap.set(token, []);
}

function cleanGroup(res, token) {
  let group, index;
  try {
    group = getGroup(token);
    index = group.indexOf(res);
  }
  catch { return ; }

  group.splice(index, 1);
  if (group.length===0) { deleteGroup(token); }
  else {
    group.forEach((client,ind)=>{
      const message = eventMaker('reduce', {deviceNum:ind+1, total:group.length})
      writeFlush(client, message);
    })
  }
}

function deleteGroup(token) {
  connectMap.delete(token);
}

function cleanTimeOut(outTime=2000) {
  for (const [identifier, {res, time}] of waitingRes) {
    if (getTimeStamp()-time>outTime) {
      res.end();
      popFromWaiting(identifier);
      deleteFromIdMap(identifier);
    }
  }
}

function logging() {
  console.log('----------------------------------');
  console.log('Registered', registered.size);
  console.log('connectMap:')
  for (const item of connectMap) {
    console.log('  ', item[0], item[1].length);
  }
  console.log("waitingRes: ", waitingRes.size);
  console.log("identifierMap: ", identifierMap.size);
  console.log(' ');
}

//  ---------------------------------- Serve HTML (vite template) ----------------------------------
async function requestRoot(req, res) {
  try {
    const url = req.originalUrl.replace(base, '')
    let template
    let render
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile('./index.html', 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('/src/entry-server.jsx')).render
    } else {
      template = templateHtml
      render = (await import('./dist/server/entry-server.js')).render
    }

    let didError = false

    const {pipe, abort} = render(url, ssrManifest, {
      onShellError() {
        res.status(500)
        res.set({'Content-Type': 'text/html'})
        res.send('<h1>Something went wrong</h1>')
      },
      onShellReady() {
        res.status(didError ? 500 : 200)
        res.set({'Content-Type': 'text/html'})

        const transformStream = new Transform({
          transform(chunk, encoding, callback) {
            res.write(chunk, encoding)
            callback()
          }
        })

        const [htmlStart, htmlEnd] = template.split(`<!--app-html-->`)

        res.write(htmlStart)

        transformStream.on('finish', () => {
          res.end(htmlEnd)
        })

        pipe(transformStream)
      },
      onError(error) {
        didError = true
        console.error(error)
      }
    })

    setTimeout(() => {
      abort()
    }, ABORT_DELAY)
  } catch (e) {
    vite?.ssrFixStacktrace(e)
    console.log(e.stack)
    res.status(500).end(e.stack)
  }
}


/*
// ---------------------------------- Abandoned APIs ----------------------------------
app.post('/authentication', (req, res)=>{
  const {token, newUser} = req.body;
  let loginKey = 'null';
  if (authentication(token, newUser)) { loginKey = genAddGetKey(token); }
  res.send({loginKey});
})

app.get('/auth-connect/', (req, res) => {
  const token = checkDelKey(res.params.key);
  if (token === null) {
    res.send({content:"Can't find the login key."});
    return ;
  }
  addToGroup(token, res);
  setEventHeaders(res, token);
  const countInfo = eventMaker('count', getGroup(token).length);
  groupCast(token, countInfo);
})

app.post('/update-text', (req, res) => {
  res.send({content: 'received'});
  const [token, content, update] = [req.body.token, req.body.content, req.body.update];
  const message = eventMaker('message', {content, update});
  groupCast(token, message);
})

// `````````````````````````````````` Abandoned Functions ``````````````````````````````````
function genAddGetKey(token) {
  const loginKey = randomString(8);
  loginKeyBuffer.set(loginKey, {token, time:getTimeStamp()});
  return loginKey;
}

function checkDelKey(loginKey) {
  if (!loginKeyBuffer.has(loginKey)) { return null; }
  const token = loginKeyBuffer.get(loginKey).token;
  loginKeyBuffer.delete(loginKey);
  return token;
}
function broadCast(req) {
  console.log(`CLIENTS LENGTH: ${clients.length}`);
  const ob = req.body;
  // const ob = {content: req.body.content, update: req.body.update}
  const message = `event: message\ndata: ${JSON.stringify(ob)}\n\n`;
  clients.forEach(client => {
    client.write(message);
    isProduction && client.flush();
  });
}

// ---------------------------------- Ancient APIs ----------------------------------
app.post('/auth', (req, res)=>{
  const {token, newUser} = req.body;
  const validUser = authentication(token, newUser);
  res.send({validUser});
})

app.get('/connect', (req, res) => {
  clients.push(res);
  setEventHeaders(res);
  res.on('close', removeClient);

  function removeClient() {
    clients.splice(clients.indexOf(res), 1);
    res.end();
  }
})

app.post('/receive', async (req, res) => {
  res.status(200).end();
  broadCast(req);
})


 */