import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Register from './features/auth/Register'
import Login from './features/auth/Login'
import ForgotPassword from './features/auth/ForgotPassword'
import ResetPassword from './features/auth/ResetPassword'
import ProfilePage from './features/profile/ProfilePage'
import ListingsPage from './features/listings/ListingsPage'
import ListingDetailPage from './features/listings/ListingDetailPage'
import UserListingsPage from './features/listings/UserListingsPage'
import Navbar from './components/Navbar/Navbar'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listings/:id" element={<ListingDetailPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/profile/:id/listings" element={<UserListingsPage />} />

        <Route path="/" element={<Navigate to="/listings" replace />} />
        <Route path="*" element={<Navigate to="/listings" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
