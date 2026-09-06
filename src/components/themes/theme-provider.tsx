"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

const themes = [
  "light",
  "dark",
  "cupcake",
  "emerald",
  "corporate",
  "night",
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={themes}
    >
      {children}
    </NextThemesProvider>
  );
}
