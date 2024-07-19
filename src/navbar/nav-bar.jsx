import './nav-bar.css'
export default function NavBar() {
  const selections = ['Clipboard']
  return (
    <div className='selectList'>
      {
        selections.map(item=>
          <p key={item}>{item}</p>
        )
      }
    </div>
  )
}