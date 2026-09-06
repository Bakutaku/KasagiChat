"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const themes = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "cupcake", label: "Cupcake" },
  { value: "emerald", label: "Emerald" },
  { value: "corporate", label: "Corporate" },
  { value: "night", label: "Night" },
];

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  return (
    <label className="form-control w-full max-w-48">
      <span className="label-text mb-2">テーマ</span>
      <select
        className="select select-bordered w-full"
        value={mounted ? (theme ?? "system") : "system"}
        onChange={(event) => setTheme(event.target.value)}
        aria-label="テーマを選択"
        disabled={!mounted}
      >
        {themes.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
