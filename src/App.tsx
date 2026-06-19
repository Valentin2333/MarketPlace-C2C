import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";
import ForgotPassword from "./features/auth/ForgotPassword";
import ResetPassword from "./features/auth/ResetPassword";
import ProfilePage from "./features/profile/ProfilePage";
import ListingsPage from "./features/listings/ListingsPage";
import ListingDetailPage from "./features/listings/ListingDetailPage";
import UserListingsPage from "./features/listings/UserListingsPage";
import FaqPage from "./features/info/FaqPage";
import TermsPage from "./features/info/TermsPage";
import PrivacyPage from "./features/info/PrivacyPage";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import FavoritesPage from "./features/favorites/FavoritesPage";
import MessagesPage from "./features/messages/MessagesPage";
import ChatThreadPage from "./features/messages/ChatThreadPage";
import UnreadProvider from "./components/Messages/UnreadProvider";

export default function App() {
  return (
    <BrowserRouter>
      <UnreadProvider>
        <ScrollToTop />
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
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route
          path="/messages/:listingId/:otherId"
          element={<ChatThreadPage />}
        />

        <Route path="/" element={<Navigate to="/listings" replace />} />
        <Route path="*" element={<Navigate to="/listings" replace />} />
      </Routes>
      <Footer />
      </UnreadProvider>
    </BrowserRouter>
  );
}
