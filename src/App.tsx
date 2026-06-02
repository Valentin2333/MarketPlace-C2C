import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Register from './features/auth/Register'
import Login from './features/auth/Login'
import Navbar from './components/Navbar/Navbar'
import ProfilePage from './features/profile/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  )
}
