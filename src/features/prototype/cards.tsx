"use client";

import { useEffect, useRef, useState } from "react";
import {
  LuArrowLeft,
  LuArrowRight,
  LuBird,
  LuMailOpen,
  LuMessageCircle,
  LuSparkles,
} from "react-icons/lu";
import { demoConfig, people } from "./fixtures";
import { eventPhase } from "./service";
import { usePrototype } from "./store";
import { AppLink, Avatar, EmptyState, Missing, PageHeading, Panel } from "./ui";

export function CardScreen({ cardId }: { cardId: string }) {
  const { state, dispatch } = usePrototype();
  const [opening, setOpening] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lock = useRef(false);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const card = state.cards.find((item) => item.id === cardId);
  if (!card) return <Missing title="カードが見つかりません" />;
  const event = state.events.find((item) => item.id === card.eventId);
  if (!event?.joined)
    return <Missing title="参加中イベントのカードではありません" />;
  if (eventPhase(event) === "upcoming")
    return (
      <EmptyState title="開催までお待ちください">
        {event.start} から開封できます。
      </EmptyState>
    );
  const person = people.find((item) => item.id === card.person)!;
  function open() {
    if (lock.current || card?.opened) return;
    lock.current = true;
    setOpening(true);
    timer.current = setTimeout(() => {
      dispatch({ type: "openCard", id: cardId });
      setOpening(false);
      lock.current = false;
    }, demoConfig.revealDelay);
  }
  return (
    <div className="mx-auto max-w-3xl">
      <AppLink to={`/events/${event.id}`} className="btn btn-ghost btn-sm mb-6">
        <LuArrowLeft />
        イベントに戻る
      </AppLink>
      <PageHeading
        eyebrow="A LITTLE LETTER FOR YOU"
        title={
          card.opened
            ? `${person.name}と、話してみませんか。`
            : "あなたに、会話のきっかけが届きました。"
        }
      />
      {card.opened ? (
        <div className="space-y-5">
          <Panel>
            <div className="flex items-center gap-5">
              <Avatar
                src={person.src}
                name={person.name}
                className="h-36 w-24 shrink-0"
              />
              <div>
                <span className="badge badge-soft badge-primary mb-3">
                  <LuMailOpen />
                  開封済み
                </span>
                <h2 className="text-xl font-bold">{person.name}</h2>
                <p className="mt-3 text-sm leading-7 text-base-content/65">
                  {person.intro}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {person.tags.map((tag) => (
                <span key={tag} className="badge badge-outline p-3">
                  {tag}
                </span>
              ))}
            </div>
          </Panel>
          <Panel
            title="分身たちの会話報告"
            action={<LuBird className="text-primary" />}
          >
            <p className="text-sm leading-8">{card.report}</p>
            <p className="mt-4 text-xs text-base-content/50">
              サンプルの会話報告です。
            </p>
          </Panel>
          <Panel
            className="border-primary/20 bg-primary/5"
            title="最初のひとことに、こんな質問はどう？"
          >
            <p className="flex gap-3 text-lg leading-8">
              <LuMessageCircle className="mt-1 shrink-0 text-primary" />
              「最近おすすめの{person.tags[0]}はありますか？」
            </p>
            <p className="mt-4 text-sm leading-7 text-base-content/65">
              カードは小さなきっかけ。あとは、あなたの言葉で話しかけてみよう。
            </p>
          </Panel>
          <AppLink
            to={`/events/${event.id}`}
            className="btn btn-primary w-full"
          >
            ほかのお便りを見る <LuArrowRight />
          </AppLink>
        </div>
      ) : (
        <section className="flex min-h-[440px] flex-col items-center justify-center gap-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-base-100 to-secondary/8 p-7 text-center shadow-sm">
          <div
            className={`rounded-full border border-primary/15 bg-base-100 p-6 text-primary ${opening ? "motion-safe:animate-pulse" : ""}`}
          >
            <LuBird className="size-12" />
          </div>
          <p className="text-xs font-bold tracking-[.18em] text-primary">
            FROM HOSHIKAWA
          </p>
          <h2 className="text-xl font-bold">
            {person.name}との、小さな共通点。
          </h2>
          <p className="max-w-sm text-sm leading-7 text-base-content/65">
            あなたの分身が、気の合いそうな人と出会ったようです。どんな話をしたのか、聞いてみましょう。
          </p>
          <button
            className="btn btn-primary rounded-full px-8"
            onClick={open}
            disabled={opening}
          >
            {opening ? (
              <>
                <span className="loading loading-dots loading-sm" />
                お便りを開いています
              </>
            ) : (
              <>
                <LuSparkles />
                カードを開く
              </>
            )}
          </button>
          {opening && (
            <p role="status" className="text-xs text-base-content/60">
              カササギが会話の報告を届けています。
            </p>
          )}
        </section>
      )}
    </div>
  );
}
