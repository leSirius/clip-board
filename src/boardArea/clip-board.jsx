import {useEffect, useRef, useState} from "react";

function fetchSetting(content) {
  return {
    method:'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: content })
  };
}

export default function ClipBoard() {
  const [init, setInit] = useState(true)
  const [content, setContent] = useState('');
  const timer = useRef(void 0);
  const onlineState = useRef(null)

  function checkSet(newContent) {
    if (newContent!==content) {  setContent(newContent); }
  }

  useEffect( () => {
    if (onlineState.current===null) {
      const connect = new EventSource('/connect');
      connect.addEventListener('connect', e=>{ console.log(e.data); });
      connect.addEventListener('message', e=>{ checkSet(e.data); })
      onlineState.current = connect;
    }
    return ()=>{
      onlineState.current.close();
      onlineState.current = null;
    }
  }, []);

  useEffect(() => {
    if (!init) { timer.current = setTimeout(async ()=>{
      const data = await fetch('/receive', fetchSetting(content));
      const newContent = (await data.json()).content;
      if (newContent!==content) {  setContent(newContent); }
    }, 500); }
    return ()=>{
      clearTimeout(timer.current);
    }
  }, [content]);

  function handleChange(e) {
    setInit(false);
    setContent(e.target.value);
  }

  return (
    <>
      <textarea type="text" className='inputArea' value={content} onChange={handleChange}/>
      <div style={{textAlign: 'right'}}>
        <button>Copy</button>
      </div>

    </>
  )
}