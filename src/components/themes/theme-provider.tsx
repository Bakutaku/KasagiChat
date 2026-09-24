"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

const themes = ["light", "night"];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={themes}
      value={{ light: "light", night: "night", dark: "night" }}
    >
      {children}
    </NextThemesProvider>
  );
}
