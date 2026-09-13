"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LuArrowRight, LuCheck, LuKeyRound, LuSparkles } from "react-icons/lu";
import { avatars } from "./fixtures";
import { usePrototype } from "./store";
import { AppLink, Avatar, PageHeading, Panel } from "./ui";
import { ConversationDialog } from "./conversation";
import { useConversation } from "./use-conversation";
import type { Provider } from "./types";

// 戻り先は招待コードに限定し、任意URLへのリダイレクトを作りません。
export function useInvitationDestination() {
  const search = useSearchParams();
  const code = search.get("join")?.toUpperCase();
  return code && /^[A-Z0-9]{6,8}$/.test(code) ? code : null;
}

export function SettingsScreen() {
  const { state, dispatch } = usePrototype();
  const [provider, setProvider] = useState<Provider>(state.settings.provider);
  const [tone, setTone] = useState(state.settings.toneEnabled);
  const [notice, setNotice] = useState("");
  const code = useInvitationDestination();
  return (
    <>
      <PageHeading
        eyebrow="SETTINGS"
        title="あなたに合った話し方で。"
        description="会話の準備と、分身の話し方をここで整えられます。"
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel
          title="AIの接続設定"
          action={<LuKeyRound className="text-primary" />}
        >
          <p className="mb-6 rounded-2xl bg-info/10 p-4 text-sm leading-7">
            この画面ではダミーの設定だけを使います。実際のAPIキーは入力せずに、登録・削除の流れをお試しください。
          </p>
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              dispatch({
                type: "settings",
                provider,
                configured: true,
                toneEnabled: tone,
              });
              setNotice("仮の接続設定を保存しました。");
            }}
          >
            <label className="block text-sm font-semibold">
              プロバイダ
              <select
                className="select mt-2 w-full"
                value={provider}
                onChange={(event) =>
                  setProvider(event.target.value as Provider)
                }
              >
                <option>デモ</option>
                <option>OpenAI</option>
                <option>Anthropic</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              {provider === "デモ"
                ? "デモの合言葉（サンプル）"
                : "APIキー（サンプル）"}
              <input
                className="input mt-2 w-full font-mono"
                value={
                  provider === "デモ" ? "HOSHIKAWA-DEMO" : "sk-demo-••••••••"
                }
                readOnly
                aria-describedby="dummy-key-help"
              />
            </label>
            <p id="dummy-key-help" className="text-xs text-base-content/55">
              サンプル専用のため編集できません。キー文字列は保存されません。
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-primary">
                {state.settings.configured
                  ? "設定を更新する"
                  : "この設定で準備する"}
                <LuCheck />
              </button>
              {state.settings.configured && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    dispatch({
                      type: "settings",
                      provider,
                      configured: false,
                      toneEnabled: tone,
                    });
                    setNotice("仮の接続設定を削除しました。");
                  }}
                >
                  設定を削除
                </button>
              )}
            </div>
          </form>
          {notice && (
            <p className="mt-4 text-sm text-success" role="status">
              {notice}
            </p>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="分身の話し方">
            <label className="flex items-start justify-between gap-5">
              <span>
                <span className="block text-sm font-medium">
                  口調サンプルを使う
                </span>
                <span className="mt-2 block text-xs leading-6 text-base-content/60">
                  あなたの話し方を、分身の言葉に少しずつ反映します。
                </span>
              </span>
              <input
                className="toggle toggle-primary"
                type="checkbox"
                checked={tone}
                onChange={(event) => {
                  setTone(event.target.checked);
                  dispatch({
                    type: "settings",
                    ...state.settings,
                    toneEnabled: event.target.checked,
                  });
                }}
              />
            </label>
            <p className="mt-4 text-xs text-base-content/50">
              プレビューの応答は定型文です。
            </p>
          </Panel>
          <Panel title={state.born ? "準備ができたら" : "次は、分身との出会い"}>
            <p className="mb-5 text-sm leading-7 text-base-content/65">
              {state.born
                ? "家でひとこと話したり、街で会話を練習してみましょう。"
                : "あなたと一緒に育つ相棒を選んで、最初のお話をしましょう。"}
            </p>
            {state.settings.configured ? (
              <AppLink
                to={
                  state.born
                    ? code
                      ? `/join/${code}`
                      : "/home"
                    : `/onboarding${code ? `?join=${code}` : ""}`
                }
              >
                {state.born ? "続ける" : "分身に会いに行く"}
                <LuArrowRight />
              </AppLink>
            ) : (
              <p className="text-sm text-base-content/55">
                接続設定を準備すると、次へ進めます。
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

export function OnboardingScreen() {
  const { state, dispatch, href } = usePrototype();
  const router = useRouter();
  const code = useInvitationDestination();
  const { conversationId, setConversationId, start } = useConversation();
  const selected = avatars.find((item) => item.id === state.avatar);
  return (
    <>
      <PageHeading
        eyebrow="A NEW COMPANION"
        title={
          state.born ? "分身との出会い" : "あなたと歩く、もうひとりの自分。"
        }
        description="姿はちがっても、これから覚えていくのはあなたのこと。一緒に過ごしたい相棒を選んでください。"
      />
      <ul className="steps mb-10 w-full text-xs md:text-sm">
        <li className="step step-primary">会話の準備</li>
        <li className="step step-primary">分身を選ぶ</li>
        <li className={`step ${state.born ? "step-primary" : ""}`}>
          はじめての会話
        </li>
        <li className={`step ${state.born ? "step-primary" : ""}`}>家へ</li>
      </ul>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                disabled={state.born}
                aria-pressed={state.avatar === avatar.id}
                className={`relative rounded-2xl border-2 p-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-primary ${state.avatar === avatar.id ? "border-primary bg-primary/8" : "border-transparent bg-base-200 hover:border-primary/30"}`}
                onClick={() => dispatch({ type: "avatar", avatar: avatar.id })}
              >
                <Avatar
                  src={avatar.src}
                  name={avatar.name}
                  className="mx-auto h-44 w-full"
                />
                <span className="mt-3 block text-xs font-bold">
                  {avatar.name}
                </span>
                {state.avatar === avatar.id && (
                  <LuCheck className="absolute right-3 top-3 text-primary" />
                )}
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={selected ? selected.name : "どの子と出かけよう？"}>
          <Avatar id={state.avatar} className="mx-auto h-64 w-48" />
          <p className="my-6 text-sm leading-7 text-base-content/65">
            {state.born
              ? "あなたの相棒はもう決まっています。これから会話を重ねて、一緒に育っていきましょう。"
              : "一度誕生した分身の姿は変えられません。気になる子を選んだら、まずは好きなことを話してみましょう。"}
          </p>
          {state.born ? (
            <AppLink to={code ? `/join/${code}` : "/home"}>
              続ける <LuArrowRight />
            </AppLink>
          ) : (
            <button
              className="btn btn-primary w-full"
              disabled={!selected}
              onClick={() => start("birth")}
            >
              この子と話してみる <LuSparkles />
            </button>
          )}
        </Panel>
      </div>
      {conversationId && (
        <ConversationDialog
          key={conversationId}
          id={conversationId}
          onClose={() => setConversationId(null)}
          onComplete={() => router.push(href(code ? `/join/${code}` : "/home"))}
          completeLabel={code ? "参加の確認へ進む" : undefined}
        />
      )}
    </>
  );
}
