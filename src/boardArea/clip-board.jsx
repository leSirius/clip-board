import {useEffect, useRef, useState} from "react";
import Prompt from "./Prompt.jsx";
import TitleBox from "./title-box.jsx";
import {
  urls, cipher, decipher, storageFunc, getTimeStamp, makeFetch, promisifyEventSource
} from "../toolkit/utility.js";

const delay = 600;

export default function ClipBoard() {
  // const [connected, setConnected] = useState(false);
  const [content, setContent] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [deviceNum, setDeviceNum] = useState(0);
  const [total, setTotal] = useState(0);

  const timerId = useRef(null);
  const lastUpdate = useRef(0);
  const eventRef = useRef(null);
  const userRef = useRef("");
  const keyRef = useRef("");
  const tokenRef = useRef("");
  const identifierRef = useRef("");
  const textAreaRef = useRef(null);

  const buttonList = [
    {text:'Copy', handler:handleCopy},
    {text:'Cut', handler:handleCut},
    {text:'SelectALL', handler:handleSelectAll},
    // {text:'Paste', handler:handlePaste}
  ]

  useEffect(() => {
    const [name, key] = storageFunc.getIterable(['name', 'key']);
    if (name && key) { tryConnect(name, key, false); }
    else { setShowOverlay(true); }
    return cleanEventRef
  }, []);


// ---------------------------------------------------- return ----------------------------------------------
  return (
    <>
      {showOverlay && <Prompt tryConnect={tryConnect}></Prompt>}
      <TitleBox userName={userRef.current??''} userKey={keyRef.current??''}></TitleBox>
      <textarea ref={textAreaRef} className='text-area' value={content} onChange={handleTextInput}/>
      <div className='button-box'>{
          buttonList.map(item=><EffectedButton key={item.text} handler={item.handler}>{item.text}</EffectedButton>)
      }</div>
      <div className='count-info'>
        <button className='button1 button-click-stretch button-click-shadow' title='Clear storage and disconnect' onClick={handleClear}>Clear</button>
        <p>{deviceNum===0? 'Waiting':`${deviceNum} / ${total}`}</p>
      </div>
    </>
  )

  // ------------------------------------------- Helpers ---------------------------------------------

  function cleanEventRef() {
    if (eventRef.current === null) { return; }
    const identifier = identifierRef.current;
    eventRef.current.close();
    eventRef.current = null;
    identifier!=="" && makeFetch(urls.disconnect, true, {identifier}, false);
  }
  function setEvenRef(eventOb) {
    eventRef.current = eventOb;
  }
  function setUserInfo(name, key, eventOb, identifier) {
    userRef.current = name;                 // Actually unnecessary
    keyRef.current = key;
    tokenRef.current = cipher(name, key);   // Actually unnecessary
    setEvenRef(eventOb);
    identifierRef.current = identifier;
  }

  function setTextAndTime(newContent, update) {
    if (update > lastUpdate.current) {
      lastUpdate.current = update;
      setContent(newContent);
    }
  }

  function handleTextInput(e) {
    const [text, stamp] = [e.target.value, getTimeStamp()];
    timerId.current && clearTimeout(timerId.current);
    setTextAndTime(text, stamp);
    timerId.current = timeoutToSend({content: text, update: stamp});
  }

  function timeoutToSend({content, update}) {
    return setTimeout(encryptFetch, delay);

    function encryptFetch() {
      const encryptText = cipher(content, keyRef.current);
      const body = JSON.stringify({content: encryptText, update: update, identifier: identifierRef.current});
      makeFetch(urls.text, true, body);
    }
  }


  function handleCopy() {
    const textArea = textAreaRef.current;
    textArea.select();
    document.execCommand('copy');
    document.getSelection().removeAllRanges();
  }

  function handleCut() {
    const textArea = textAreaRef.current;
    textArea.select();
    document.execCommand('cut');
  }
  function handleSelectAll() {
    const textArea = textAreaRef.current;
    textArea.select();
  }

  function handleClear() {
    if (confirm('This action will clear your localStorage data (name and key) and disconnect from server.' +
      '\n !!! Your content in textarea will also disappear.')){
      restoreAll();
      storageFunc.clear();
    }
  }

  async function tryConnect(name, key, newUser, setHint = void 0) {
    cleanEventRef();
    const token = cipher(name, key);
    try {
      const result = await promisifyEventSource(token, newUser);
      handleSuccess(result);
      window.onbeforeunload = cleanEventRef;
    }
    catch (e) {
      setHint && setHint(e.message);
      setShowOverlay(true);
    }

    function handleSuccess({eventOb, identifier, count}) {
      setUserInfo(name, key, eventOb, identifier);
      setInfoListeners(eventOb);
      resetDeviceNumbers(count);
      storageFunc.setFromArray([['name', name], ['key', key]]);
      setShowOverlay(false);
    }
  }

  function setInfoListeners(eventOb) {
    eventOb.addEventListener('message', parseWrapper(onMessage));
    eventOb.addEventListener('count', parseWrapper(onCount));
    eventOb.addEventListener('reduce', parseWrapper(onReduce));
    eventOb.addEventListener('error', onError);
  }

  function parseWrapper(func) {
    return (e)=>{
      try {
        const data = JSON.parse(e.data);
        func(data);
      }
      catch(err) { console.error(err); }
    }
  }

  function onCount(data) {
    setTotal(data.count);
  }

  function onReduce(data) {
    setDeviceNum(data.deviceNum);
    setTotal(data.total);
  }

  function onMessage(data) {
    const [message, update] = [
      decipher(data.content, keyRef.current),
      Number(data.update)
    ];
    setTextAndTime(message, update);
  }

  function onError(e) {
    console.error(e);
    restoreAll();
  }

  function resetDeviceNumbers(num=0) {
    setDeviceNum(num);
    setTotal(num);
  }

  function restoreAll() {
    // timerId is not included
    cleanEventRef();
    userRef.current = "";
    keyRef.current = "";
    tokenRef.current = "";
    identifierRef.current = "";
    lastUpdate.current = getTimeStamp();
    setContent("");
    setShowOverlay(true);
    resetDeviceNumbers();
  }
}

function EffectedButton({children, handler}) {
  return <button className='button1 button-reflect button-click-op button-click-stretch button-click-shadow' onClick={handler}>{children}</button>
}




/*
useEffect(() => {
  if (tokenRef.current!=="") {
    eventRef.current = authConnect(tokenRef.current);
  }
  return disAuthConnect;

}, [showOverlay]);

useEffect(() => {
  if (eventRef.current === null) {
    eventRef.current = connectSSE();
  }
  return disConnectSSE;
}, []);
 */

/*
  async function makeRequest() {
    const encrypted = cipher(content, keyRef.current);
    console.log({ body: JSON.stringify({content: encrypted, update})});
    try {
      const res = await fetch(
        '/receive', {...postSet, body: JSON.stringify({content: encrypted, update})}
      );
      checkRes(res);
      const data = await res;
      return data;
    } catch (e) {
      console.error('----------error---------', e.message);
    }
  }

    function authConnect(token) {
    console.log( {...postSetting, body: JSON.stringify({token})} );
    const authConnect = new EventSource(urls.authConnect, {
      ...postSetting,
      body: JSON.stringify({token})
    });
    authConnect.addEventListener('connect', e=> console.log);
    authConnect.addEventListener('message', onMessage);
    return authConnect;
  }

  function disAuthConnect() {
    eventRef.current && eventRef.current.close();
    eventRef.current = null;
  }

  function connectSSE() {
    const connect = new EventSource(urls.connect);
    connect.addEventListener('connect', (e) => { });
    connect.addEventListener('message', onMessage);
    return connect;
  }

  function disConnectSSE() {
    eventRef.current && eventRef.current.close();
    eventRef.current = null;
  }

 */

