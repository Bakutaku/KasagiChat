"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { NavigationHeader } from "@/components/layout/navigation-header";
import { MapErrorBoundary } from "./map-error-boundary";
import { loadMap } from "./map-loader";
import { MapTargetOverlay } from "./map-target-overlay";
import { isMapSceneId, mapRegistry, type MapSceneId } from "./map-registry";
import type {
  MapDocument,
  MapInteraction,
  MapSpot,
  RuntimeMapCharacter,
  RuntimeMapObject,
  MapObjectEditing,
  MapHover,
  MapTargetDetails,
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
  objects?: readonly RuntimeMapObject[];
  objectEditing?: MapObjectEditing;
  onSelect?: (spot: MapSpot | null) => void;
  onSelectCharacter?: (character: RuntimeMapCharacter) => void;
  spotDetails?: Readonly<Record<string, MapTargetDetails>>;
  /** HUDの内容・遷移先は画面側が所有します。ボタン等には通常のDOMを渡します。 */
  children?: ReactNode;
  /** 家など、画面固有の構成で表示領域だけを調整するための差し込み口。 */
  canvasClassName?: string;
  hudClassName?: string;
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
  objects,
  objectEditing,
  onSelect,
  onSelectCharacter,
  spotDetails,
}: ImmersiveMapShellProps) {
  const [document, setDocument] = useState<MapDocument | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [hover, setHover] = useState<MapHover | null>(null);
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
        objects={objects}
        objectEditing={objectEditing}
        onSelect={onSelect}
        onSelectCharacter={onSelectCharacter}
        onHover={setHover}
        onError={setError}
      />
      <MapTargetOverlay
        document={document}
        characters={characters}
        spotDetails={spotDetails}
        hover={hover}
        paused={paused}
        onHover={setHover}
        onSelect={onSelect}
        onSelectCharacter={onSelectCharacter}
      />
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
  canvasClassName = "",
  hudClassName = "",
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
        className={`${styles.canvas} ${canvasClassName}`}
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
      <div className={`${styles.hud} ${hudClassName}`}>{children}</div>
    </main>
  );
}
