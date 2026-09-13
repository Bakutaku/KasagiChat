"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LuArrowRight,
  LuCirclePlay,
  LuFlower2,
  LuLayoutGrid,
} from "react-icons/lu";
import { usePrototype } from "./store";
import { AppLink, Avatar, EmptyState, Missing, PageHeading, Panel } from "./ui";
import { HomeScreen } from "./home";
import { OnboardingScreen, SettingsScreen } from "./onboarding";
import { MapScreen } from "./map";
import {
  EventCreateScreen,
  EventsScreen,
  EventVenueScreen,
  JoinScreen,
} from "./events";
import { CardScreen } from "./cards";

function PreviewMenu() {
  const { dispatch, href, state } = usePrototype();
  const router = useRouter();
  return (
    <>
      <PageHeading
        eyebrow="KASAGICHAT / SCREEN PREVIEW"
        title="小さな会話から、はじめよう。"
        description="分身と出会い、街で話し、誰かとつながる。KasagiChatの画面と体験を、ここからひと通り確認できます。"
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Panel className="relative overflow-hidden">
          <span className="mb-5 inline-flex rounded-2xl bg-primary/10 p-4 text-primary">
            <LuFlower2 className="size-6" />
          </span>
          <h2 className="mb-3 text-xl font-bold">はじめての出会いから</h2>
          <p className="mb-7 max-w-sm text-sm leading-7 text-base-content/65">
            会話の準備、相棒選び、はじめての会話。まっさらな状態で、最初の一歩を。
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              dispatch({ type: "reset", experienced: false });
              router.push(href("/settings"));
            }}
          >
            初回フローを試す <LuArrowRight />
          </button>
        </Panel>
        <Panel className="relative overflow-hidden border-primary/20 bg-primary/5">
          <div className="relative z-10 max-w-[65%]">
            <span className="mb-5 inline-flex rounded-2xl bg-base-100 p-4 text-primary">
              <LuCirclePlay className="size-6" />
            </span>
            <h2 className="mb-3 text-xl font-bold">暮らしのつづきから</h2>
            <p className="mb-7 text-sm leading-7 text-base-content/65">
              思い出のある家、練習中の会話、届いたカード。ひと通りの画面をすぐに確認。
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                dispatch({ type: "reset", experienced: true });
                router.push(href("/home"));
              }}
            >
              体験済み状態で開く <LuArrowRight />
            </button>
          </div>
          <Avatar className="absolute bottom-5 right-0 h-60 w-[38%]" />
        </Panel>
      </div>
      <Panel
        title="画面を選んで確認"
        className="mt-6"
        action={<LuLayoutGrid className="text-primary" />}
      >
        <p className="mb-5 text-sm leading-7 text-base-content/60">
          {state.born
            ? "現在の変更を引き継いで各画面へ進みます。"
            : "各画面をすぐ確認する場合は「体験済み状態で開く」を選んでください。"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["/home", "わたしの家"],
            ["/settings", "会話の設定"],
            ["/onboarding", "分身の誕生"],
            ["/map", "街と会話"],
            ["/events", "イベント一覧"],
            ["/events/new", "イベント作成"],
            ["/join/HOSHI26", "招待・参加"],
            ["/events/hoshikawa", "会場とカード"],
          ].map(([to, label]) => (
            <AppLink
              key={to}
              to={to}
              className="flex items-center justify-between rounded-xl border border-base-300 px-4 py-4 text-sm hover:bg-primary/5"
            >
              {label}
              <LuArrowRight className="text-primary" />
            </AppLink>
          ))}
        </div>
      </Panel>
      <p className="mt-5 text-xs leading-6 text-base-content/55">
        変更はこのタブに保存されます。初回／体験済みの切り替えと初期化は、プレビュー内の変更をリセットします。
      </p>
    </>
  );
}

function Preparation({ birthOnly = false }: { birthOnly?: boolean }) {
  const { state } = usePrototype();
  return (
    <EmptyState
      title={
        state.settings.configured
          ? "まずは、あなたの分身に会いましょう。"
          : "会話の準備をしましょう。"
      }
    >
      <p className="mb-5">
        {birthOnly
          ? "分身との初会話の前に、接続設定を準備してください。"
          : "設定と分身の誕生を済ませると、家や街での暮らしが始まります。"}
      </p>
      <AppLink to={state.settings.configured ? "/onboarding" : "/settings"}>
        準備をはじめる <LuArrowRight />
      </AppLink>
    </EmptyState>
  );
}

/** 通常ルートと /preview 配下は同じ画面を選択します。認証は通常側のproxyで行います。 */
export function PrototypeScreens() {
  const { state, preview } = usePrototype();
  const pathname = usePathname();
  const path = preview ? pathname.slice("/preview".length) || "/" : pathname;
  if (preview && path === "/") return <PreviewMenu />;
  const parts = path
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
  if (parts[0] === "join" && parts.length === 2)
    return <JoinScreen code={parts[1]} />;
  if (path === "/settings") return <SettingsScreen />;
  if (path === "/onboarding")
    return state.settings.configured ? (
      <OnboardingScreen />
    ) : (
      <Preparation birthOnly />
    );
  const known =
    ["/home", "/map", "/events", "/events/new"].includes(path) ||
    (["events", "cards"].includes(parts[0]) && parts.length === 2);
  if (!known) return <Missing />;
  if (!state.settings.configured || !state.born) return <Preparation />;
  if (path === "/home") return <HomeScreen />;
  if (path === "/map") return <MapScreen />;
  if (path === "/events") return <EventsScreen />;
  if (path === "/events/new") return <EventCreateScreen />;
  if (parts[0] === "events")
    return <EventVenueScreen key={parts[1]} eventId={parts[1]} />;
  if (parts[0] === "cards")
    return <CardScreen key={parts[1]} cardId={parts[1]} />;
  return <Missing />;
}
