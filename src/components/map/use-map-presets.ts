"use client";

import { useEffect, useState } from "react";
import type { MapCatalog } from "./map-data";
import { loadMapCatalog } from "./map-loader";

type PresetState =
  | { status: "loading"; catalog: null; error: null }
  | { status: "ready"; catalog: MapCatalog; error: null }
  | { status: "error"; catalog: null; error: string };

export function useMapPresets(): PresetState {
  const [state, setState] = useState<PresetState>({
    status: "loading",
    catalog: null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    loadMapCatalog((url) => fetch(url))
      .then((catalog) => {
        if (active) setState({ status: "ready", catalog, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            catalog: null,
            error:
              error instanceof Error
                ? error.message
                : "マップを読み込めませんでした。",
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
