import {useState} from "react";
import {Fragment} from "react";

export default function Prompt({setShowOverlay}) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');

  const inputList = [
    {tag: 'Your Name', value: name, handler: handlerMaker(setName)},
    {tag: 'Cipher Key', value: key, handler: handlerMaker(setKey)}
  ];
  const buttonList = [
    {tag: 'Generate Key', handler: genKey},
    {tag: 'Log In', handler: close},
  ]

  return (
    <div className='overlay'>
      <div className='inputForm'>
        {inputList.map(item =>
          <Fragment key={item.tag}>
            <label htmlFor={item.tag} className='text-label'>{item.tag}</label>
            <input type="text" id={item.tag} className='input-login' value={item.value} onChange={item.handler}
                   spellCheck='false'/>
          </Fragment>
        )}

        {buttonList.map(item =>
          <button key={item.tag} className='button2' onClick={item.handler}>{item.tag}</button>
        )}

        <p className='hint'>If you haven't got a key, please generate one, and then enter it to another device with the same name.</p>
      </div>

    </div>
  )

  function handlerMaker(func) {
    return (e) => {
      func(e.target.value);
    }
  }

  function genKey() {
    // CryptoJS.lib.WordArray.random(16);
    const charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const size = charSet.length;
    let key = '';
    for (let i = 0; i < 16; i++) {
      const random = Math.floor(Math.random() * size);
      key += charSet[random];
    }
    setKey(key);
  }

  function close() {
    setShowOverlay(false);
  }
}
