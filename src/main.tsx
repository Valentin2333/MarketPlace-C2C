import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ToastProvider from "./components/Toast/ToastProvider";
import FavoritesProvider from "./components/Favorites/FavoritesProvider";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <FavoritesProvider>
        <App />
      </FavoritesProvider>
    </ToastProvider>
  </StrictMode>,
);
