import fs from 'node:fs/promises'
import express from 'express'
import {Transform} from 'node:stream'

// Constants
// sirius 1111111111111111 Eq/QbSt9kKwbdcvYQ+VfuQ==    sirius 2222222222222222 lGu/FRhEiq7F8vgfjraEHA==
const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 3000
const base = process.env.BASE || '/'
const ABORT_DELAY = 10000;
const clients = [];

const registered = new Set(['Eq/QbSt9kKwbdcvYQ+VfuQ==', 'lGu/FRhEiq7F8vgfjraEHA==']);
const connectMap = new Map();

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
  app.use(compression())
  app.use(base, sirv('./dist/client', {extensions: []}))
}

// ---------------------------------- All Paths ----------------------------------
app.post("*", express.urlencoded({extended: false}));
app.post("*", express.json());

app.get('/', requestRoot);

app.post('/auth', (req, res)=>{
  const {token, newUser} = req.body;
  const validUser = authentication(token, newUser);

  res.send({validUser});
})

app.get('/connect', (req, res) => {
  clients.push(res);
  buildConnect(res);
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

app.post('/auth-connect', (req, res) => {
  const {token, newUser} = req.body;
  const isValid = authentication(token, newUser);
  if (isValid) {
    addToGroup(token, res);
    buildConnect(res);
  } else {
    res.send({isValid: false});
  }
})

app.post('/update-text', (req, res) => {
  res.send({content: 'received'});
  const [token, content, update] = [req.body.token, req.body.content, req.body.update];
  groupCast(token, content, update);
})


// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`)
})



function authentication (token, newUser) {
  let validUser = false;
  if (!newUser) {
    if (registered.has(token)) {
      validUser = true;
    }
  }
  return validUser;
}

function addToGroup(token, res) {
  if (!connectMap.has(token)) { connectMap.set(token, []); }
  connectMap.get(token).push(res);
  res.on('close', () => {
    const group = connectMap.get(token);
    group.splice(group.indexOf(res), 1);
    res.end();
  })
}

function buildConnect(res) {
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`event: connect\ndata: 'connected'\n\n`);
  isProduction && res.flush();
}

function groupCast(token, content, update) {
  const group = connectMap.get(token);
  const message = `event: message\ndata: ${JSON.stringify({content, update})}\n\n`;
  group.forEach(client => {
    client.write(message);
    isProduction && client.flush();                              // move to end?
  });
  console.log(`user ${token} has ${group.length} connection`);
}

function broadCast(req) {
  console.log(`CLIENTS LENGTH: ${clients.length}`);
  const ob = req.body;
  console.log(req.body.content);
  // const ob = {content: req.body.content, update: req.body.update}
  const message = `event: message\ndata: ${JSON.stringify(ob)}\n\n`;
  clients.forEach(client => {
    client.write(message);
    isProduction && client.flush();
  });
}


// Vite template code  // Serve HTML
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