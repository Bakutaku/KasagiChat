"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { NavigationHeader } from "@/components/layout/navigation-header";
import { MapErrorBoundary } from "./map-error-boundary";
import { loadMap } from "./map-loader";
import { isMapSceneId, mapRegistry, type MapSceneId } from "./map-registry";
import type {
  MapDocument,
  MapInteraction,
  MapSpot,
  RuntimeMapCharacter,
} from "./map-types";
import styles from "./immersive-map-shell.module.css";

/** WebGL・canvas・windowはブラウザの資源なので、SSRせずクライアントで初期化します。 */
const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => <MapLoading />,
});
const noCharacters: readonly RuntimeMapCharacter[] = [];

export type ImmersiveMapShellProps = {
  mapId: MapSceneId;
  interaction: MapInteraction;
  /** 会話などのオーバーレイを開く側が指定。閉じたらfalseに戻します。 */
  paused?: boolean;
  characters?: readonly RuntimeMapCharacter[];
  onSelect?: (spot: MapSpot | null) => void;
  /** HUDの内容・遷移先は画面側が所有します。ボタン等には通常のDOMを渡します。 */
  children?: ReactNode;
};

function MapLoading() {
  return (
    <div
      role="status"
      className="flex h-full items-center justify-center gap-3"
    >
      <span className="loading loading-spinner" />
      マップを読み込んでいます
    </div>
  );
}

function LoadedMap({
  mapId,
  interaction,
  paused = false,
  characters = noCharacters,
  onSelect,
}: ImmersiveMapShellProps) {
  const [document, setDocument] = useState<MapDocument | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    loadMap(mapId, fetch, controller.signal).then(
      (document) => {
        if (!controller.signal.aborted) setDocument(document);
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error
              : new Error("マップを読み込めませんでした。"),
          );
      },
    );
    return () => controller.abort();
  }, [mapId]);
  if (error) throw error;
  if (!document) return <MapLoading />;
  return (
    <>
      <MapCanvas
        document={document}
        interaction={interaction}
        paused={paused}
        characters={characters}
        onSelect={onSelect}
        onError={setError}
      />
      {interaction === "explore" && !paused && (
        <nav
          aria-label="マップのスポット"
          className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4 focus-within:top-24 focus-within:z-20 focus-within:flex focus-within:max-w-[calc(100%-2rem)] focus-within:flex-wrap focus-within:gap-2"
        >
          {document.spots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              className="btn btn-sm"
              onClick={() => onSelect?.(spot)}
            >
              {spot.name}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}

/**
 * 共通の全画面境界。新しい画面はmapId・操作モード・実行時キャラクター・HUDを宣言します。
 * オーバーレイ中はCanvasを保持し、frameloop="never"と入力無効化の両方で背景を停止します。
 * API呼出しやHome・イベント固有の状態は、このコンポーネントへ追加しないでください。
 */
export function ImmersiveMapShell({
  children,
  paused = false,
  ...props
}: ImmersiveMapShellProps) {
  const [attempt, setAttempt] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const stopped = paused || menuOpen;
  return (
    <main className={styles.shell}>
      <NavigationHeader className={styles.header} onMenuToggle={setMenuOpen} />
      <h1 className="sr-only">
        {isMapSceneId(props.mapId) ? mapRegistry[props.mapId].label : "マップ"}
      </h1>
      <div
        className={styles.canvas}
        inert={stopped}
        style={{
          pointerEvents: stopped ? "none" : "auto",
          touchAction: props.interaction === "explore" ? "none" : "auto",
        }}
      >
        <MapErrorBoundary
          key={`${props.mapId}:${attempt}`}
          onRetry={() => setAttempt((value) => value + 1)}
        >
          <LoadedMap {...props} paused={stopped} />
        </MapErrorBoundary>
      </div>
      <div className={styles.hud}>{children}</div>
    </main>
  );
}
