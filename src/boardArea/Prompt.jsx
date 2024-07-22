import {Fragment, useState} from "react";
import {FaCat} from "react-icons/fa6";
import {cipher, storageFunc} from "../toolkit/utility.js";

const hintMessages = [
  "If you haven't got a key, please generate one (will disable Cipher Key input), and tell another cat your name and the key.",
  "When turning to a new device, please use your name and generated key for authentication.",
  "Miaouuu~",
];
const issueMessages = [
  "Ehh, may I name you 'Puppy'?",
  "Oh, you don't even have one piece of fish...",
  "Please do not modify the key.",
  "It smells that your name and key do not match."
]
export default function Prompt({setShowOverlay, setUserInfo}) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [generated, setGenerated] = useState(false);
  const [hintText, setHintText] = useState(hintMessages[0]);

  const inputList = [
    {tag: 'Your Name', value: name, handler: handlerMaker(setName)},
    {tag: 'Cipher Key', value: key, handler: handlerMaker(setKey)}
  ];
  const buttonList = [
    {tag: !generated?'Generate Key':"Regenerate", handler: genKey},
    {tag: 'Log In', handler: close},
  ]

  return (
    <div className='overlay'>
      <div className='inputForm'>
        {inputList.map((item, ind) =>
          <Fragment key={item.tag}>
            <label htmlFor={item.tag} className='text-label'>{item.tag}</label>
            <input type="text" id={item.tag} className='input-login' spellCheck='false' maxLength={16}
                   value={item.value} onChange={item.handler} disabled={ind===1 && generated}
                    />
          </Fragment>
        )}
        {
        buttonList.map(item =>
          <button className='button2' key={item.tag} onClick={item.handler}>{item.tag}</button>
        )}

        <div className='hint'>
          <FaCat size={24} className='hint-icon' onClick={strokeCat} />
          {hintText}
        </div>
      </div>
      <p className='cookie-warn'>The service is based on <b>Cookie</b>. Please note that it activates after the first valid login on each device.</p>
    </div>
  )

  function handlerMaker(func) {
    return (e) => {
      func(e.target.value);
    }
  }

  function genKey() {
    setGenerated(true);
    strokeCat(1);
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

  async function close() {
    if (!validInput()) { return ; }
    const token = cipher(name, key);
    console.log(`in Prompt.js, function close() \n ${name} ${key} ${token}`)
    const res = await fetch('/auth', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token, newUser:generated})
    })
    const {validUser} = await res.json();
    if (!validUser) { setHintText(issueMessages[3]); }
    else {
      storageFunc.setFromArray([['name', name], ['key', key]]);
      setUserInfo(name, key);
      setShowOverlay(false);
    }
  }

  function validInput() {
    if (name.length===0) {
      setHintText(issueMessages[0]);
      return false;
    }
    if (key.length!==16) {
      key.length===0? setHintText(issueMessages[1]): setHintText(issueMessages[2]);
      return false;
    }
    return true;
  }

  function strokeCat(specified) {
    if (specified!==void 0&&typeof specified==="number") {
      setHintText(hintMessages[specified]);
      return ;
    }
    const temp = hintMessages.findIndex(text=>text===hintText);
    let next = (temp+1)%hintMessages.length;
    if (next===1&&!generated) { next = (next+1)%hintMessages.length; }
    setHintText(hintMessages[next]);
  }
}
