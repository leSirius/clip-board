import {useEffect, useRef, useState} from "react";
import Prompt from "./Prompt.jsx";
import {cipher, decipher, storageFunc, getTimeStamp, makeFetch, postSetting} from "../toolkit/utility.js";

const delay = 600;
const urls = {
  authConnect: '/auth-connect',
  connect: '/connect',
  receive: '/receive',
}


export default function ClipBoard() {
  // const [connected, setConnected] = useState(false);
  const [content, setContent] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const timerId = useRef(null);
  const lastUpdate = useRef(getTimeStamp());
  const eventRef = useRef(null);
  const userRef = useRef("");
  const keyRef = useRef("");
  const tokenRef = useRef("");

  useEffect(() => {
    const [name, key] = storageFunc.getIterable(['name', 'key']);
    if (name && key) { setUserInfo(name, key); }
    else { setShowOverlay(true); }
  }, []);
  /*
  useEffect(() => {
    if (tokenRef.current!=="") {
      eventRef.current = authConnect(tokenRef.current);
    }
    return disAuthConnect;

  }, [showOverlay]);
   */
  useEffect(() => {
    if (eventRef.current === null) { eventRef.current = connectSSE(); }
    return disConnectSSE;
  }, []);


  return (
    <>
      {showOverlay && <Prompt setShowOverlay={setShowOverlay} setUserInfo={setUserInfo}></Prompt>}
      <div className='titleBox'>
        <h2>Clip Board</h2>
        <p>
          <b>{showInfo? `${userRef.current}`: ""}</b>
          <span className='unselect'>&nbsp;&nbsp;</span>
          {showInfo? `${keyRef.current}`: ""}
          <span className='unselect'>&nbsp;&nbsp;&nbsp;</span>
          <button className='button-sm unselect' onClick={()=>setShowInfo(!showInfo)}>
            {showInfo? "Hide Info":"Show Info"}
          </button>
        </p>
      </div>

      <textarea className='text-area' value={content} onChange={handleTextInput}/>

      <div className='button-box'>
        <button className='button1'>Copy</button>
      </div>
    </>
  )

  function setUserInfo(name, key) {
    userRef.current = name;
    keyRef.current = key;
    tokenRef.current = cipher(name, key);
  }

  function handleTextInput(e) {
    timerId.current && clearTimeout(timerId.current);
    const text = e.target.value;
    const stamp = getTimeStamp();
    setTextAndTime(text, stamp);
    timerId.current = sendText({content: text, update: stamp});
  }

  function setTextAndTime(newContent, update) {
    if (update > lastUpdate.current) {
      lastUpdate.current = update;
      setContent(newContent);
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

  function onMessage(e) {
    const ob = JSON.parse(e.data)
    const [message, update] = [
      decipher(ob.content, keyRef.current),
      Number(decipher(ob.update, keyRef.current))
    ];
    setTextAndTime(message, update);
  }

  function disConnectSSE() {
    eventRef.current && eventRef.current.close();
    eventRef.current = null;
  }

  function sendText({content, update}) {
    return setTimeout(encryptFetch, delay);
    function encryptFetch() {
      const encryptText = cipher(content, keyRef.current);
      const encryptTime = cipher(update.toString(), keyRef.current);
      const body = JSON.stringify({content:encryptText, update:encryptTime});
      makeFetch(urls.receive, true, body);
      // don't need the response of the fetch in this function. Error handler is wrapped inside.
    }
  }
}


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
 */

