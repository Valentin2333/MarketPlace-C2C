import { createContext } from "react";

export type Theme = "dark" | "light";

export type ThemeApi = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

export const ThemeContext = createContext<ThemeApi | null>(null);

export const THEME_STORAGE_KEY = "theme";
export const DEFAULT_THEME: Theme = "dark";
