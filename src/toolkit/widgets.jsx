import Toast from 'react-bootstrap/Toast';
import { FaHandPaper } from "react-icons/fa";

export function Toaster() {
  return (
    <Toast>
      <Toast.Header>
        <FaHandPaper></FaHandPaper>
        <strong className="me-auto">Bootstrap</strong>
        <small>11 mins ago</small>
      </Toast.Header>
      <Toast.Body>Hello, world! This is a toast message.</Toast.Body>
    </Toast>
  );
}
