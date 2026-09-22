"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LuHouse, LuMapPin } from "react-icons/lu";
import { ImmersiveMapShell } from "@/components/map";
import ConversationSession from "@/features/conversation/conversation-session";
import type { PracticeSceneKey } from "@/features/conversation/scene";
import { npcApi } from "@/features/npc/api";
import type { Npc } from "@/features/npc/types";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import { townCharacters, townSpotDetails, townVisit } from "@/features/town/town-map-presentation";
import { TownVisitDialog } from "@/features/town/town-visit-dialog";

/** 選択後の振る舞いは街画面が所有。共通Canvasへ遷移・会話の条件分岐を持ち込みません。 */
export function TownMap() {
  const router = useRouter();
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [scene, setScene] = useState<PracticeSceneKey | null>(null);
  const [npc, setNpc] = useState<Npc | null>(null);
  const [npcError, setNpcError] = useState<string | null>(null);
  const selectionOrigin = useRef<HTMLElement | null>(null);

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

  const visit = selectedSpotId ? townVisit(selectedSpotId) : null;
  function selectVisit(id: string | null) {
    // 背景がinertになる前に記録し、キャンセル後のキーボード位置を保ちます。
    selectionOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedSpotId(id);
  }
  function closeVisit() {
    setSelectedSpotId(null);
    requestAnimationFrame(() => selectionOrigin.current?.focus());
  }
  function confirmVisit() {
    if (!visit || (visit.scene && !npc)) return;
    if (visit.destination) router.push(visit.destination);
    if (visit.scene && npc) setScene(visit.scene);
    setSelectedSpotId(null);
  }

  return (
    <>
      <ImmersiveMapShell
        mapId="hoshikawa-town"
        interaction="explore"
        characters={townCharacters}
        spotDetails={townSpotDetails}
        paused={scene !== null || visit !== null}
        onSelect={(spot) => selectVisit(spot?.id ?? null)}
        onSelectCharacter={(character) => selectVisit(character.id)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100/85 p-3 backdrop-blur">
          <div>
            <p className="flex items-center gap-2 font-medium">
              <LuMapPin className="text-primary" aria-hidden="true" />星川の街
            </p>
            <p className="text-xs opacity-70">
              {npcError ??
                "ドラッグで移動・ホイール／ピンチで拡大。人や建物を選ぶと案内が開きます。"}
            </p>
          </div>
          <Link href="/home" className="btn btn-sm">
            <LuHouse aria-hidden="true" />
            家へ
          </Link>
        </div>
      </ImmersiveMapShell>

      {visit && <TownVisitDialog visit={visit}
        notice={visit.scene ? npcError ?? (!npc ? "分身の情報を読み込んでいます…" : null) : null}
        onClose={closeVisit} onConfirm={confirmVisit} />}

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
