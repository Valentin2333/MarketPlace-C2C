import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ThemeProvider from "./components/Theme/ThemeProvider";
import ToastProvider from "./components/Toast/ToastProvider";
import AuthProvider from "./lib/auth/AuthContext.tsx";
import WebSocketConnector from "./lib/ws/WebSocketConnector";
import FavoritesProvider from "./components/Favorites/FavoritesProvider";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import ErrorFallback from "./components/ErrorBoundary/ErrorFallback";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary
      fallback={(_error, reset) => <ErrorFallback onRetry={reset} />}
    >
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <WebSocketConnector />
            <FavoritesProvider>
              <App />
            </FavoritesProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
