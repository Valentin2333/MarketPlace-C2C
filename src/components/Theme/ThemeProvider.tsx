import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ThemeContext,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
} from "./theme-context";
import type { Theme, ThemeApi } from "./theme-context";

function readInitialTheme(): Theme {
  if (typeof document !== "undefined") {
    // The boot script in index.html sets this before first paint.
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
  }
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  }
  return DEFAULT_THEME;
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  // Keep the document attribute and storage in sync with state.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* storage may be unavailable (private mode); theme still applies */
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);

  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
    [],
  );

  const api = useMemo<ThemeApi>(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>
  );
}
