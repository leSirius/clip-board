import CryptoJS from "crypto-js"
import {useEffect, useRef, useState} from "react";

export default function ClipBoard() {
  const [connected, setConnected] = useState(false);
  const [content, setContent] = useState('');
  const timer = useRef(void 0);
  const eventRef = useRef(null);
  const isInit = useRef(true);

  useEffect( () => {
    if (eventRef.current === null) { connectSSE(); }
    return disConnectSSE;
  }, []);

  useEffect(() => {
    if (isInit.current) { isInit.current = false; }
    else {
      const encrypted = cipher(content);
      sendText(encrypted);
    }
    return ()=> { clearTimeout(timer.current); }
  }, [content]);

  return (
    <>
      <div className='titleBox'>
        <h2 className='title'>Clip Board</h2>
        <span>{connected? 'Online':'Offline'}</span>
      </div>

      <textarea className='inputArea' value={content} onChange={handleChange}/>

      <div style={{textAlign: 'right'}}>
        <button>Copy</button>
      </div>
    </>
  )

  function handleChange(e) { setContent(e.target.value); }

  function checkSet(newContent) { newContent!==content && setContent(newContent); }

  function connectSSE() {
    const connect = new EventSource('/connect');
    connect.addEventListener('connect', (e)=>{ setConnected(e.data==='1'); });
    connect.addEventListener('message', e=>{
      const message = decipher(e.data);
      checkSet(message);
    })
    eventRef.current = connect;
  }

  function disConnectSSE() {
    eventRef.current && eventRef.current.close();
    eventRef.current = null;
  }

  function cipher(text, key='hopefully long enough') {
    return CryptoJS.AES.encrypt(content, key).toString();
  }

  function decipher(encrypted, key='hopefully long enough') {
    return CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
  }

  function sendText(content) {
    timer.current = setTimeout(makeRequest, 500);

    const postSet = {
      method:'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content })
    }

    async function makeRequest() {
      try {
        const res = await fetch('/receive', postSet);
        checkRes(res);
      }
      catch (e) { console.error('----------error---------', e.message); }
    }
  }

  function checkRes(res) {
    if (!res.ok || res.status!==200) { throw new Error(`failed to send text: ${res.status}`) }
  }
}

