import './board.css'
import ClipBoard from "./clip-board.jsx";

export default function Board() {

  return (
    <div className='board'>
      <div className='padding-height'></div>
      <ClipBoard></ClipBoard>
    </div>
  )
}