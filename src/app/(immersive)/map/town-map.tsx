"use client";

import Link from "next/link";
import { useState } from "react";
import { LuHouse } from "react-icons/lu";
import { ImmersiveMapShell, type MapSpot } from "@/components/map";

/** 選択後の振る舞いは街画面が所有。共通Canvasへ遷移・会話の条件分岐を持ち込みません。 */
export function TownMap() {
  const [spot, setSpot] = useState<MapSpot | null>(null);
  return (
    <ImmersiveMapShell
      mapId="hoshikawa-town"
      interaction="explore"
      characters={[]}
      onSelect={setSpot}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100/85 p-3 backdrop-blur">
        <div>
          <p className="font-medium" aria-live="polite">
            {spot ? `${spot.name}を選択中` : "星川の街"}
          </p>
          <p className="text-xs opacity-70">
            ドラッグで移動・ホイール／ピンチで拡大・スポットを選択
          </p>
        </div>
        <Link href="/home" className="btn btn-sm">
          <LuHouse aria-hidden="true" />
          家へ
        </Link>
      </div>
    </ImmersiveMapShell>
  );
}
