import CryptoJS from "crypto-js"
import {useEffect, useRef, useState} from "react";
import Prompt from "./Prompt.jsx";

const delay = 600;

export default function ClipBoard() {
  const [connected, setConnected] = useState(false);
  const [content, setContent] = useState('');
  const [showOverlay, setShowOverlay] = useState(true);

  const timerId = useRef(null);
  const lastUpdate = useRef(getTimeStamp());
  const eventRef = useRef(null);
  const cipherKey = useRef('');

  useEffect(() => {
    let keyString = localStorage.getItem('key');
    if (!keyString) {
      keyString = genKey();
      localStorage.setItem('key', keyString);
    }
    cipherKey.current = keyString;
  }, []);

  useEffect(() => {
    if (eventRef.current === null) {
      eventRef.current = connectSSE();
    }
    return disConnectSSE;
  }, []);

  return (
    <>
      {showOverlay && <Prompt setShowOverlay={setShowOverlay}></Prompt>}
      <div className='titleBox'>
        <h2 className='title'>Clip Board</h2>
        <span>{connected ? 'Online' : 'Offline'}</span>
      </div>

      <textarea className='inputArea' value={content} onChange={handleChange}/>

      <div style={{textAlign: 'right'}}>
        <button className='button1'>Copy</button>
      </div>
    </>
  )

  function handleChange(e) {
    timerId.current && clearTimeout(timerId.current);
    const text = e.target.value;
    const stamp = getTimeStamp();
    setTextAndTime(text, stamp)
    timerId.current = sendText({content: text, update: stamp});
  }

  function setTextAndTime(newContent, update) {
    if (update > lastUpdate.current) {
      lastUpdate.current = update;
      setContent(newContent);
    }
  }

  function connectSSE() {
    const connect = new EventSource('/connect');
    connect.addEventListener('connect', (e) => {
      setConnected(e.data === '1');
    });
    connect.addEventListener('message', e => {
      const ob = JSON.parse(e.data);
      const [message, update] = [decipher(ob.content, cipherKey.current), ob.update];
      setTextAndTime(message, update);
    })
    return connect;
  }

  function disConnectSSE() {
    eventRef.current && eventRef.current.close();
    eventRef.current = null;
  }

  function sendText({content, update}) {
    const postSet = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'}
    }
    return setTimeout(makeRequest, delay);

    async function makeRequest() {
      const encrypted = cipher(content, cipherKey.current);
      try {
        const res = await fetch(
          '/receive', {...postSet, body: JSON.stringify({content: encrypted, update})}
        );
        checkRes(res);
      } catch (e) {
        console.error('----------error---------', e.message);
      }
    }
  }

  function checkRes(res) {
    if (!res.ok || res.status !== 200) {
      throw new Error(`failed to send text: ${res.status}`)
    }
  }
}

function cipher(text, key) {
  return CryptoJS.AES.encrypt(text, key).toString();
}

function decipher(encrypted, key) {
  return CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
}


function getTimeStamp() {
  return new Date().getTime();
}

function genKey() {
  // return  CryptoJS.lib.WordArray.random(16);
  const charSet = "0123456789";
  const size = charSet.length;
  let key = '';
  for (let i = 0; i < 16; i++) {
    const random = Math.floor(Math.random() * size);
    key += charSet[random];
  }
  return key;
}