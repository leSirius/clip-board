import {useRef, useState} from "react";

export default function TitleBox({userName, userKey}) {
  const [showInfo, setShowInfo] = useState(false);
  const container = useRef(void 0);
  const onButton = useRef(false);

  return (
    <div className='titleBox'>
      <h2>Clip Board</h2>
      <div tabIndex={0} ref={container}
           onBlur={ handleDivBlur }>
        <button
          className='button-sm unselect button-click-op button-click-stretch button-click-shadow' tabIndex={-1}
          onClick={ handleClick }
          onBlur={ handleBlur }
          onMouseEnter={ enterButton }
          onMouseLeave={ leaveButton }
        >
          {showInfo ? "Hide Info" : "Show Info"}
        </button>
        {
          showInfo &&
          <div className='info-board'>
            <p>{userName}<br />{userKey}</p>
          </div>
        }
      </div>
    </div>
  )

  function handleClick() {
    container.current.focus();
    setShowInfo(!showInfo);
  }

  function handleBlur(e){
    e.stopPropagation();
  }

  function handleDivBlur() {
    !onButton.current && setShowInfo(false);
  }

  function enterButton() {
    onButton.current = true;
  }
  function leaveButton() {
    onButton.current = false;

  }

}