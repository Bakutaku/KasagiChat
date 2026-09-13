"use client";

import { useState } from "react";
import {
  LuArrowRight,
  LuBookOpen,
  LuCoffee,
  LuEye,
  LuEyeOff,
  LuFlower2,
  LuHistory,
  LuMail,
  LuMessageCircle,
  LuSparkles,
  LuTrash2,
} from "react-icons/lu";
import { ConversationDialog } from "./conversation";
import { demoConfig, scenes } from "./fixtures";
import { levelFor } from "./service";
import { usePrototype } from "./store";
import { AppLink, Avatar, EmptyState, Modal, PageHeading, Panel } from "./ui";
import { useConversation } from "./use-conversation";

export function HomeScreen() {
  const { state, dispatch } = usePrototype();
  const { conversationId, setConversationId, start } = useConversation();
  const [tab, setTab] = useState<"memories" | "profile" | "album" | "history">(
    "memories",
  );
  const [profile, setProfile] = useState(state.profile);
  const [saved, setSaved] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pending = state.conversations.filter(
    (item) => item.status !== "reviewed",
  );
  const unread = state.cards.filter((item) => !item.opened).length;
  return (
    <>
      <PageHeading
        eyebrow="MY LITTLE HOME"
        title="おかえりなさい。"
        description="急がなくて大丈夫。今日も、あなたのペースで話してみよう。"
      >
        <AppLink to="/map" className="btn btn-outline rounded-full">
          街へ出かける <LuArrowRight />
        </AppLink>
      </PageHeading>
      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <section className="relative isolate flex min-h-80 items-end overflow-hidden rounded-3xl border border-base-300 bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 p-7 md:min-h-96 md:p-9">
          <div
            aria-hidden="true"
            className="absolute right-[13%] top-9 h-36 w-36 rounded-t-full border-8 border-base-100 bg-info/15 shadow-inner"
          >
            <div className="absolute left-1/2 h-full w-2 bg-base-100" />
            <div className="absolute top-1/2 h-2 w-full bg-base-100" />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-20 border-t border-primary/10 bg-primary/5"
          />
          <div className="relative z-10 mb-8 max-w-[58%]">
            <span className="badge badge-soft badge-primary mb-4 gap-1">
              <LuSparkles /> Lv.{levelFor(state.exp)} の相棒
            </span>
            <h2 className="text-2xl font-bold leading-relaxed">
              小さな一歩が、
              <br />
              思い出になっていく。
            </h2>
            <p className="mt-4 text-sm leading-7 text-base-content/60">
              ここは、あなたと分身の帰る場所。
            </p>
          </div>
          <Avatar
            id={state.avatar}
            className="absolute bottom-7 right-5 z-10 h-64 w-36 md:right-12 md:h-80 md:w-48"
          />
          <LuFlower2
            aria-hidden="true"
            className="absolute bottom-7 left-7 size-12 text-primary/45"
          />
        </section>
        <div className="flex flex-col gap-5">
          <Panel
            className="flex-1"
            title="今日のひとこと"
            action={<LuMessageCircle className="text-primary" />}
          >
            <p className="mb-6 text-lg font-medium leading-8">
              「今日、ちょっと心が動いたことはあった？」
            </p>
            <button
              className="btn btn-primary w-full rounded-full"
              onClick={() => start("daily")}
            >
              分身に話しかける <LuArrowRight />
            </button>
            <p className="mt-3 text-center text-xs text-base-content/50">
              ひとことだけでも、大丈夫。
            </p>
          </Panel>
          <Panel>
            <div className="mb-3 flex justify-between text-sm">
              <span className="font-bold">分身の成長</span>
              <span>
                次のレベルまで{" "}
                {demoConfig.levelExp - (state.exp % demoConfig.levelExp)} EXP
              </span>
            </div>
            <progress
              className="progress progress-primary w-full"
              value={state.exp % demoConfig.levelExp}
              max={demoConfig.levelExp}
            />
            <p className="mt-2 text-xs text-base-content/55">
              Lv.{levelFor(state.exp)} · 累計 {state.exp} EXP
            </p>
          </Panel>
        </div>
      </div>
      <div className="my-6 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: LuBookOpen,
            label: "集まった思い出",
            value: `${state.topics.length} 個`,
          },
          {
            icon: LuHistory,
            label: "話した時間の記録",
            value: `${state.conversations.filter((item) => item.status === "reviewed").length} 回`,
          },
          { icon: LuMail, label: "届いているカード", value: `${unread} 通` },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-base-300 bg-base-100 px-5 py-4"
          >
            <span className="rounded-xl bg-primary/8 p-3 text-primary">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-xs text-base-content/55">{label}</p>
              <p className="mt-1 text-lg font-bold">{value}</p>
            </div>
            {label === "届いているカード" && (
              <AppLink
                to="/events"
                className="btn btn-circle btn-ghost btn-sm ml-auto"
              >
                <LuArrowRight />
                <span className="sr-only">カードを見に行く</span>
              </AppLink>
            )}
          </div>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.65fr_1fr]">
        <Panel>
          <div
            role="tablist"
            aria-label="家の本棚"
            className="tabs tabs-border mb-6 overflow-x-auto"
          >
            {(
              [
                ["memories", "思い出の品"],
                ["profile", "プロフィール帳"],
                ["album", "アルバム"],
                ["history", "成長の記録"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                className={`tab whitespace-nowrap ${tab === id ? "tab-active" : ""}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "memories" &&
            (state.topics.length ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {state.topics.map((topic, index) => (
                  <div
                    key={topic.id}
                    className="rounded-2xl bg-base-200/70 p-4 text-center"
                  >
                    <div className="mx-auto mb-4 grid h-24 place-items-center rounded-xl border-b-4 border-primary/15 bg-base-100">
                      {index % 2 ? (
                        <LuCoffee className="size-10 text-secondary" />
                      ) : (
                        <LuBookOpen className="size-10 text-primary" />
                      )}
                    </div>
                    <p className="text-sm font-semibold">{topic.item}</p>
                    <p className="mt-2 text-xs text-base-content/50">
                      {topic.name}の話から
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="最初の思い出をつくろう">
                会話を振り返ると、ここに思い出の品が届きます。
              </EmptyState>
            ))}
          {tab === "profile" && (
            <div className="space-y-6">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  dispatch({ type: "profile", text: profile });
                  setSaved(true);
                }}
              >
                <label
                  className="block text-sm font-bold"
                  htmlFor="profile-text"
                >
                  分身が知っている、あなたのこと
                </label>
                <textarea
                  id="profile-text"
                  className="textarea mt-3 min-h-32 w-full"
                  maxLength={1000}
                  value={profile}
                  onChange={(event) => {
                    setProfile(event.target.value);
                    setSaved(false);
                  }}
                />
                <div className="mt-3 flex items-center gap-3">
                  <button className="btn btn-primary btn-sm">保存する</button>
                  {saved && (
                    <span role="status" className="text-sm text-success">
                      保存しました
                    </span>
                  )}
                </div>
              </form>
              <div>
                <h3 className="text-sm font-bold">話題の公開範囲</h3>
                <p className="my-3 text-xs leading-6 text-base-content/60">
                  公開した話題をイベントでの共通点探しに使います。新しい話題は非公開から始まります。
                </p>
                {state.topics.length ? (
                  state.topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center gap-3 border-t border-base-300 py-3"
                    >
                      <span className="flex-1 text-sm">{topic.name}</span>
                      <button
                        className="btn btn-ghost btn-sm"
                        aria-pressed={topic.public}
                        aria-label={`${topic.name}を${topic.public ? "非公開" : "公開"}にする`}
                        onClick={() =>
                          dispatch({
                            type: "topic",
                            id: topic.id,
                            operation: "toggle",
                          })
                        }
                      >
                        {topic.public ? <LuEye /> : <LuEyeOff />}
                        {topic.public ? "公開" : "非公開"}
                      </button>
                      <button
                        className="btn btn-square btn-ghost btn-sm text-error"
                        aria-label={`${topic.name}を削除`}
                        onClick={() => setDeleteId(topic.id)}
                      >
                        <LuTrash2 />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-base-content/60">
                    まだ話題がありません。
                  </p>
                )}
              </div>
            </div>
          )}
          {tab === "album" && (
            <>
              <p className="mb-4 text-sm text-base-content/60">
                あなたの言葉から生まれた、小さなコレクション。
              </p>
              {state.topics.length ? (
                <ul className="space-y-3">
                  {state.topics.map((topic) => (
                    <li
                      key={topic.id}
                      className="flex items-center gap-3 rounded-xl bg-base-200 p-4"
                    >
                      <LuBookOpen className="text-primary" />
                      <span className="text-sm">{topic.item}</span>
                      <span className="badge badge-sm ml-auto">獲得済み</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="アルバムはまだまっさらです">
                  会話を重ねて、最初のページを飾りましょう。
                </EmptyState>
              )}
            </>
          )}
          {tab === "history" && (
            <>
              <button
                className="btn btn-ghost btn-sm mb-4"
                onClick={() => dispatch({ type: "readGrowth" })}
              >
                すべて既読にする
              </button>
              {state.growth.length ? (
                <ul className="space-y-4">
                  {state.growth.map((item) => (
                    <li key={item.id} className="flex gap-3 text-sm leading-6">
                      <LuSparkles className="mt-1 shrink-0 text-primary" />
                      <span>
                        {!item.read && (
                          <span className="badge badge-primary badge-xs mr-2">
                            新着
                          </span>
                        )}
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="成長はこれから">
                  最初の会話を振り返ると記録が届きます。
                </EmptyState>
              )}
            </>
          )}
        </Panel>
        <Panel
          title="あとで振り返る会話"
          action={<span className="badge badge-ghost">{pending.length}</span>}
        >
          {pending.length ? (
            <div className="space-y-4">
              {pending.map((item) => (
                <div key={item.id} className="rounded-2xl bg-base-200/65 p-4">
                  <p className="text-sm font-semibold">
                    {scenes[item.scene].title}
                  </p>
                  <p className="mb-3 mt-2 text-xs text-base-content/55">
                    途中までのお話を保存しています。
                  </p>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setConversationId(item.id)}
                  >
                    会話・振り返りを開く <LuArrowRight />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-base-content/55">
              いまはありません。途中で閉じた会話は、ここから続きを開けます。
            </p>
          )}
        </Panel>
      </div>
      {conversationId && (
        <ConversationDialog
          key={conversationId}
          id={conversationId}
          onClose={() => setConversationId(null)}
        />
      )}
      {deleteId && (
        <Modal
          title="この話題を削除しますか？"
          onClose={() => setDeleteId(null)}
        >
          <div className="space-y-5 p-6">
            <p className="text-sm leading-7">
              プロフィール帳・思い出の品・アルバムから、この話題を取り除きます。
            </p>
            <button
              className="btn btn-error"
              onClick={() => {
                dispatch({ type: "topic", id: deleteId, operation: "delete" });
                setDeleteId(null);
              }}
            >
              削除する
            </button>
            <button
              className="btn btn-ghost ml-3"
              onClick={() => setDeleteId(null)}
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
