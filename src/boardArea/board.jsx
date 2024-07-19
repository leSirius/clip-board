import './board.css'
import ClipBoard from "./clip-board.jsx";

export default function Board() {
  const title = 'Clip Board'
  return (
    <div className='board'>
      <h2 className='title'>{title}</h2>
      <ClipBoard></ClipBoard>
    </div>
  )
}