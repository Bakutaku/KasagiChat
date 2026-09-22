"use client";

import { useId, type FocusEvent } from "react";
import { LuInfo, LuMousePointer2 } from "react-icons/lu";
import { isInside } from "./map-validation";
import type {
  MapDocument, MapHover, MapSpot, MapTargetDetails, RuntimeMapCharacter,
} from "./map-types";
import styles from "./map-target-overlay.module.css";

/** Canvasの選択結果をDOMの案内とキーボード操作へつなぎます。会話の開始責務は持ちません。 */
export function MapTargetOverlay({
  document, characters, spotDetails, hover, paused, onHover, onSelect, onSelectCharacter,
}: {
  document: MapDocument;
  characters: readonly RuntimeMapCharacter[];
  spotDetails?: Readonly<Record<string, MapTargetDetails>>;
  hover: MapHover | null;
  paused: boolean;
  onHover: (hover: MapHover | null) => void;
  onSelect?: (spot: MapSpot | null) => void;
  onSelectCharacter?: (character: RuntimeMapCharacter) => void;
}) {
  const tooltipId = useId();
  const character = hover?.kind === "character"
    ? characters.find((character) => character.id === hover.id)
    : undefined;
  const target = character ?? document.spots.find((spot) => hover?.kind === "spot" && spot.id === hover.id);
  const details = character?.details ?? (hover?.kind === "spot" ? spotDetails?.[hover.id] : undefined);

  function focusTarget(event: FocusEvent<HTMLButtonElement>, kind: MapHover["kind"], id: string) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const container = event.currentTarget.closest("nav")?.parentElement?.getBoundingClientRect();
    onHover({
      kind, id,
      x: bounds.left - (container?.left ?? 0),
      y: bounds.bottom - (container?.top ?? 0),
    });
  }

  return (
    <>
      {hover && target && !paused && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`${styles.tooltip} card border border-base-300 bg-base-100/95 shadow-xl`}
          style={{
            left: `clamp(1rem, ${hover.x + 18}px, calc(100% - 16rem))`,
            top: `clamp(6rem, ${hover.y + 18}px, calc(100% - 11rem))`,
          }}
        >
          <p className="flex items-center gap-2 font-bold">
            <LuInfo className="shrink-0 text-primary" aria-hidden="true" />{target.name}
          </p>
          {details?.status && <p className="mt-1 text-xs font-medium text-base-content/70">{details.status}</p>}
          {details?.description && <p className="mt-2 text-xs leading-relaxed text-base-content/75">{details.description}</p>}
          {(hover.kind === "spot" || onSelectCharacter) && (
            <p className="mt-3 flex items-center gap-1.5 border-t border-base-300 pt-2 text-xs">
              <LuMousePointer2 aria-hidden="true" />{details?.actionLabel ?? "選択して詳しく見る"}
            </p>
          )}
        </div>
      )}
      {(document.spots.length > 0 || characters.length > 0) && (
        // 確認中もDOMを残し、親のinertで停止。閉じた後に選択元へフォーカスを戻せます。
        <nav
          aria-label="マップのスポット"
          className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4 focus-within:top-24 focus-within:z-20 focus-within:flex focus-within:max-w-[calc(100%-2rem)] focus-within:flex-wrap focus-within:gap-2"
          onKeyDown={(event) => { if (event.key === "Escape") onHover(null); }}
        >
          {document.spots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              className="btn btn-sm"
              aria-describedby={hover?.kind === "spot" && hover.id === spot.id ? tooltipId : undefined}
              onFocus={(event) => focusTarget(event, "spot", spot.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect?.(spot)}
            >
              {spot.name}
            </button>
          ))}
          {characters.filter((character) => onSelectCharacter && isInside(character, document.size)).map((character) => (
            <button
              key={character.id}
              type="button"
              className="btn btn-sm"
              aria-describedby={hover?.kind === "character" && hover.id === character.id ? tooltipId : undefined}
              onFocus={(event) => focusTarget(event, "character", character.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelectCharacter?.(character)}
            >
              {character.name}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
