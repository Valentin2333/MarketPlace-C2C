import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Register from './features/auth/Register'
import Login from './features/auth/Login'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}