import {Fragment, useRef, useState} from "react";
import {FaCat} from "react-icons/fa6";
import {randomString} from "../toolkit/utility.js";

const hintMessages = [
  "If you haven't got a key previously, please generate one (will disable Cipher Key input), and tell another cat your name and the key.",
  "When turning to a new device, please use your name and generated key for authentication.",
  "Miaouuu~",
];
const issueMessages = [
  "Ehh, may I name you 'Puppy'?",
  "Oh, you don't even have one piece of fish...",
  "Please do not modify the key.",
  "Whoops, there is some issue.",
  "You know, I'm way nearsighted, can't find space."
];
const hoverMessage = [
  "Restore Input means you already have a key and you'd like to enter it.",
  "Generate Key means you haven't got a key and you'd like to get one.",
  "Smells not too bad, hopefully...",
];
export default function Prompt({tryConnect}) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [generated, setGenerated] = useState(false);
  const [hintText, setHintText] = useState(hintMessages[0]);
  const [goFish, setGoFish] = useState(false);
  const prevText = useRef("");

  const inputList = [
    {tag: 'Your Name', value: name, handler: handleName, stopSpace},
    {tag: 'Cipher Key', value: key, handler: handlerMaker(setKey), stopSpace}
  ];
  const buttonList = [
    {tag: generated ? "Restore Input" : goFish ? "Go Fishing" : "Generate key", handler: genKey},
    {tag: 'Log In', handler: logIn},
  ];

  return (
    <div className='overlay'>
      <div className='inputForm'>
        {inputList.map((item, ind) =>
          <Fragment key={item.tag}>
            <label htmlFor={item.tag} className='text-label'>{item.tag}</label>
            <input type="text" id={item.tag} className='input-login' spellCheck='false' maxLength={16}
                   value={item.value} onChange={item.handler} disabled={ind === 1 && generated} onKeyDown={item.stopSpace}
            />
          </Fragment>
        )}
        {
          buttonList.map(item =>
            <button className='button2 button-click-op' key={item.tag} onClick={item.handler} onMouseEnter={onButton}
                    onMouseLeave={offButton}>{item.tag}</button>
          )}

        <div className='hint'>
          <FaCat size={24} className='hint-icon' onClick={strokeCat}/>
          {hintText}
        </div>
      </div>
    </div>
  )

  function handlerMaker(func) {
    return (e) => {
      func(e.target.value);
    }
  }

  function handleName(e) {
    const str = e.target.value;
    if (str.indexOf(' ')===-1) { setName(str); }
    else { stopSpace({key: ' '}); }
  }

  function stopSpace(e) {
    if (e.key===' ') {
      e.preventDefault();
      setHintText(issueMessages[4]);
    }
    else if (hintText===issueMessages[4]){
      setHintText(hintMessages[2]);
    }
  }

  function genKey() {
    setGenerated(!generated);
    strokeCat(!generated ? 1 : 0);
    !generated && setKey(randomString(16));
  }

  async function logIn() {
    if (!validInput()) { return; }
    tryConnect(name, key, generated, setFailHint);

    function setFailHint(message) {
      setHintText(`${issueMessages[3]} ${message}.`);
    }
  }

  function validInput() {
    if (name.length === 0) {
      setHintText(issueMessages[0]);
      return false;
    }
    if (key.length !== 16) {
      const ind = key.length === 0 ? 1 : 2;
      setGoFish(ind === 1);
      setHintText(issueMessages[ind]);
      return false;
    }
    return true;
  }

  function strokeCat(specified) {
    if (specified !== void 0 && typeof specified === "number") {
      setHintText(hintMessages[specified]);
      return;
    }
    const temp = hintMessages.findIndex(text => text === hintText);
    let next = (temp + 1) % hintMessages.length;
    if (next === 1 && !generated) {
      next = (next + 1) % hintMessages.length;
    }
    setHintText(hintMessages[next]);
  }

  function onButton(e) {
    if (prevText.current !== "") {
      return;
    }
    prevText.current = hintText;
    const message = e.target.innerText === buttonList[0].tag
      ? generated ? hoverMessage[0] : hoverMessage[1]
      : (name.length > 0 && key.length === 16) ? hoverMessage[2] : hintText;
    setHintText(message)
  }

  function offButton() {
    if (hoverMessage.indexOf(hintText) !== -1) {
      setHintText(prevText.current);
    }
    prevText.current = ""
  }

}

/* Abandoned
  async function logIn() {
    if (!validInput()) { return ; }
    const token = cipher(name, key);
    console.log(`in Prompt.js, function logIn() \n ${name} ${key} ${token}`)
    const res = await fetch('/auth', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token, newUser:generated})
    });
    const {validUser} = await res.json();
    if (!validUser) { setHintText(issueMessages[3]); }
    else {
      storageFunc.setFromArray([['name', name], ['key', key]]);
      setUserInfo(name, key);
      setShowOverlay(false);
    }
  }


 */