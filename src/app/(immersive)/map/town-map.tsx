"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuHouse } from "react-icons/lu";
import { ImmersiveMapShell, type MapSpot } from "@/components/map";
import ConversationSession from "@/features/conversation/conversation-session";
import { sceneForSpotId } from "@/features/conversation/scene";
import type { PracticeSceneKey } from "@/features/conversation/scene";
import { npcApi } from "@/features/npc/api";
import type { Npc } from "@/features/npc/types";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";

/** 選択後の振る舞いは街画面が所有。共通Canvasへ遷移・会話の条件分岐を持ち込みません。 */
export function TownMap() {
  const router = useRouter();
  const [spot, setSpot] = useState<MapSpot | null>(null);
  const [scene, setScene] = useState<PracticeSceneKey | null>(null);
  const [npc, setNpc] = useState<Npc | null>(null);
  const [npcError, setNpcError] = useState<string | null>(null);

  // 練習会話の見守り役として分身が要るため、街に入った時点で1度だけ取得する。
  useEffect(() => {
    const controller = new AbortController();
    npcApi.get(controller.signal).then(
      (value) => {
        if (!controller.signal.aborted) {
          setNpc(value);
          setNpcError(null);
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setNpcError(
          getErrorMessage(error, {
            codes: {
              NPC_NOT_FOUND:
                "分身がまだいません。最初の会話を終えると街へ出られます。",
            },
            fallback: "分身の情報を読み込めませんでした。",
          }),
        );
      },
    );
    return () => controller.abort();
  }, []);

  function handleSelect(selected: MapSpot | null) {
    setSpot(selected);
    if (!selected) {
      return;
    }

    if (selected.id === "home") {
      router.push("/home");
      return;
    }

    const practiceScene = sceneForSpotId(selected.id);
    // 練習シーンでないスポット(広場)は、選択表示だけで終わる。
    if (practiceScene && npc) {
      setScene(practiceScene);
    }
  }

  // 広場のようにまだ行き先のないスポットは、選択しても会話が開かない。
  const hint = !spot
    ? "星川の街"
    : sceneForSpotId(spot.id)
      ? `${spot.name}を選択中`
      : `${spot.name}はまだ準備中です`;

  return (
    <>
      <ImmersiveMapShell
        mapId="hoshikawa-town"
        interaction="explore"
        characters={[]}
        paused={scene !== null}
        onSelect={handleSelect}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100/85 p-3 backdrop-blur">
          <div>
            <p className="font-medium" aria-live="polite">
              {hint}
            </p>
            <p className="text-xs opacity-70">
              {npcError ??
                "ドラッグで移動・ホイール／ピンチで拡大・スポットを選択して会話"}
            </p>
          </div>
          <Link href="/home" className="btn btn-sm">
            <LuHouse aria-hidden="true" />
            家へ
          </Link>
        </div>
      </ImmersiveMapShell>

      {scene && npc && (
        <ConversationSession
          type="PRACTICE"
          scene={scene}
          npc={npc}
          presentation="modal"
          onClose={() => setScene(null)}
        />
      )}
    </>
  );
}
