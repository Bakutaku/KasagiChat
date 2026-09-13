"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  LuArrowRight,
  LuCoffee,
  LuHouse,
  LuMapPin,
  LuMonitor,
  LuRotateCcw,
  LuTrees,
  LuUsers,
  LuBriefcaseBusiness,
} from "react-icons/lu";
import { useMapPresets } from "@/components/map/use-map-presets";
import { usePrototype } from "./store";
import { avatars } from "./fixtures";
import { useConversation } from "./use-conversation";
import { ConversationDialog } from "./conversation";
import { AppLink, EmptyState, PageHeading } from "./ui";

const MapCanvas = dynamic(
  () =>
    import("@/components/map/map-canvas").then((module) => module.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center" role="status">
        街を準備しています…
      </div>
    ),
  },
);
const spots = [
  { id: "home", title: "家", subtitle: "分身との暮らし", icon: LuHouse },
  { id: "fountain", title: "広場", subtitle: "街のまんなか", icon: LuTrees },
  { id: "cafe", title: "カフェ", subtitle: "気軽な雑談", icon: LuCoffee },
  { id: "lobby", title: "ロビー", subtitle: "初対面・イベント", icon: LuUsers },
  {
    id: "office",
    title: "オフィス",
    subtitle: "面接の練習",
    icon: LuBriefcaseBusiness,
  },
] as const;

const desktopQuery = "(min-width: 768px)";
function subscribeViewport(listener: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
const isDesktop = () => window.matchMedia(desktopQuery).matches;
const serverViewport = () => false;

class MapErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div
        role="alert"
        className="grid h-full place-items-center p-8 text-center"
      >
        マップを表示できませんでした。ページを再読み込みしてください。各スポットは下のボタンから開けます。
      </div>
    ) : (
      this.props.children
    );
  }
}

function Town({
  paused,
  resetKey,
  onSelect,
}: {
  paused: boolean;
  resetKey: number;
  onSelect: (id: string | null) => void;
}) {
  const presets = useMapPresets();
  const { state } = usePrototype();
  if (presets.status === "loading")
    return (
      <div role="status" className="grid h-full place-items-center">
        <span
          className="loading loading-ring loading-lg"
          aria-label="マップを読み込んでいます"
        />
      </div>
    );
  if (presets.status === "error")
    return (
      <div role="alert" className="p-10 text-sm leading-7">
        マップを読み込めませんでした。{presets.error}
        <br />
        「再読み込み」をお試しください。下のスポットからも進めます。
      </div>
    );
  const document = presets.catalog.maps.find(
    (item) => item.id === "hoshikawa-town",
  )?.document;
  if (!document)
    return (
      <p role="alert" className="p-8">
        星川の街のデータがありません。
      </p>
    );
  return (
    <MapErrorBoundary>
      <MapCanvas
        document={document}
        pan
        paused={paused}
        resetKey={resetKey}
        showCharacters
        playerSrc={avatars.find((avatar) => avatar.id === state.avatar)?.src}
        onSelect={paused ? undefined : onSelect}
      />
    </MapErrorBoundary>
  );
}

export function MapScreen() {
  // スマホでは案内だけを出し、非表示のWebGLやテクスチャを読み込まないようにします。
  const desktop = useSyncExternalStore(
    subscribeViewport,
    isDesktop,
    serverViewport,
  );
  const { href } = usePrototype();
  const router = useRouter();
  const { conversationId, setConversationId, start } = useConversation();
  const [spot, setSpot] = useState("fountain");
  const [reload, setReload] = useState(0);
  const selected = spots.find((item) => item.id === spot)!;
  function select(id: string | null) {
    const destination =
      id === "system-cafe" ? "cafe" : id === "system-guide" ? "lobby" : id;
    if (destination && spots.some((item) => item.id === destination))
      setSpot(destination);
  }
  function enter() {
    if (spot === "home") router.push(href("/home"));
    else if (spot === "cafe" || spot === "lobby" || spot === "office")
      start(spot);
  }
  return (
    <>
      <PageHeading
        eyebrow="HOSHIKAWA TOWN"
        title="今日は、どこで話そう。"
        description="場所を選んで、新しい会話へ。うまく話そうとしなくても大丈夫。"
      >
        <span className="badge badge-soft badge-primary gap-2 p-4">
          <LuMapPin />
          星川の街
        </span>
      </PageHeading>
      <div className="md:hidden">
        <EmptyState title="街のお散歩はPCでどうぞ">
          <LuMonitor className="mx-auto mb-4 size-10" />
          <p className="mb-4">
            広い画面でお楽しみください。イベントの参加とカードは、このまま確認できます。
          </p>
          <AppLink to="/events">イベントを見る</AppLink>
        </EmptyState>
      </div>
      <div className="hidden md:block">
        <section
          className="relative isolate h-[min(58vh,560px)] min-h-96 overflow-hidden rounded-3xl border border-base-300 bg-[#f3f2e9]"
          aria-label="星川の街のマップ"
        >
          {desktop && (
            <Town
              key={reload}
              paused={!!conversationId}
              resetKey={reload}
              onSelect={select}
            />
          )}
          <button
            className="btn btn-sm absolute right-4 top-4 z-30 border-base-300 bg-base-100"
            onClick={() => setReload((value) => value + 1)}
          >
            <LuRotateCcw />
            再読み込み
          </button>
          <p className="absolute bottom-4 left-5 z-30 rounded-full bg-base-100/90 px-4 py-2 text-xs text-base-content/65">
            ドラッグで視点移動 · ホイールで拡大 · 建物をクリックして選択
          </p>
        </section>
        <div className="mt-5 grid grid-cols-5 gap-3" aria-label="街のスポット">
          {spots.map(({ id, title, subtitle, icon: Icon }) => (
            <button
              key={id}
              aria-pressed={spot === id}
              className={`rounded-2xl border p-4 text-left transition-colors ${spot === id ? "border-primary bg-primary/8" : "border-base-300 bg-base-100 hover:border-primary/40"}`}
              onClick={() => setSpot(id)}
            >
              <Icon className="mb-3 size-5 text-primary" />
              <span className="block font-bold">{title}</span>
              <span className="mt-1 block text-xs text-base-content/55">
                {subtitle}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-base-300 bg-base-100 p-5">
          <div>
            <h2 className="font-bold">{selected.title}へようこそ</h2>
            <p className="mt-2 text-sm text-base-content/60">
              {spot === "fountain"
                ? "川沿いでひと休み。気になる場所を選んでみましょう。"
                : `${selected.subtitle}を、ここから始めましょう。`}
            </p>
          </div>
          <div className="flex gap-3">
            {spot === "lobby" && (
              <AppLink to="/events" className="btn btn-outline">
                イベントに進む
              </AppLink>
            )}
            {spot !== "fountain" && (
              <button className="btn btn-primary" onClick={enter}>
                {spot === "home" ? "家に帰る" : "会話をはじめる"}
                <LuArrowRight />
              </button>
            )}
          </div>
        </div>
      </div>
      {conversationId && (
        <ConversationDialog
          key={conversationId}
          id={conversationId}
          onClose={() => setConversationId(null)}
        />
      )}
    </>
  );
}
