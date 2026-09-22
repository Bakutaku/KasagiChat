"use client";

import { useState } from "react";
import { homeItemFallbacks, homeItemImage } from "./home-map-adapter";
import type { HomeItem } from "./types";
import styles from "./home-experience.module.css";

export function HomeItemArtwork({ item, compact = false }: { item: HomeItem; compact?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const source = homeItemImage(item);
  const fallback = homeItemFallbacks[item.kind];
  return (
    // API由来の配信元は固定できないため通常画像で扱い、BOOKを含め失敗時はローカル素材へ戻します。
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failedSrc === source ? fallback : source}
      alt=""
      className={compact ? styles.compactArtwork : styles.artworkImage}
      onError={() => setFailedSrc(source)}
    />
  );
}
