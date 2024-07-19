import './App.css'
import NavBar from "./navbar/nav-bar.jsx";
import Board from "./boardArea/board.jsx";
// Works also with SSR as expected

function App() {
  return (
    <>
      <div id="main">
        <NavBar></NavBar>
        <Board></Board>
      </div>
    </>
  )
}



export default App
