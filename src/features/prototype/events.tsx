"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  LuArrowRight,
  LuCalendarDays,
  LuCheck,
  LuCopy,
  LuMail,
  LuPlus,
  LuTicket,
  LuUsers,
} from "react-icons/lu";
import { people } from "./fixtures";
import { eventPhase } from "./service";
import { usePrototype } from "./store";
import { AppLink, Avatar, EmptyState, Missing, PageHeading, Panel } from "./ui";
import type { PrototypeEvent } from "./types";

const phaseLabel = { upcoming: "開催予定", active: "開催中", ended: "終了" };

function EventSummary({ event }: { event: PrototypeEvent }) {
  return (
    <Panel className="flex flex-col">
      <div className="mb-5 flex items-center justify-between">
        <span className="badge badge-soft badge-primary">
          {phaseLabel[eventPhase(event)]}
        </span>
        {event.joined && (
          <span className="text-xs text-primary">
            <LuCheck className="mr-1 inline" />
            参加中
          </span>
        )}
      </div>
      <h2 className="text-xl font-bold">{event.title}</h2>
      <p className="mb-5 mt-3 flex-1 text-sm leading-7 text-base-content/65">
        {event.description}
      </p>
      <p className="mb-5 flex items-center gap-2 text-xs text-base-content/55">
        <LuCalendarDays />
        {event.owned
          ? `${event.start} 〜 ${event.end}`
          : "いつでも体験できるデモイベント"}
      </p>
      <AppLink
        to={event.joined ? `/events/${event.id}` : `/join/${event.code}`}
        className="btn btn-outline w-full"
      >
        {event.joined ? "会場・カードを見る" : "イベントを見てみる"}
        <LuArrowRight />
      </AppLink>
    </Panel>
  );
}

export function EventsScreen() {
  const { state, href } = usePrototype();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "joined" | "owned">("all");
  const [code, setCode] = useState("");
  const events = state.events.filter(
    (event) =>
      filter === "all" || (filter === "joined" ? event.joined : event.owned),
  );
  return (
    <>
      <PageHeading
        eyebrow="MEET SOMEONE NEW"
        title="好きなことから、つながろう。"
        description="あなたの分身が、会話のきっかけを探してきます。まずは気になる集まりをのぞいてみませんか。"
      >
        <AppLink to="/events/new">
          <LuPlus />
          イベントをつくる
        </AppLink>
      </PageHeading>
      <section className="mb-8 flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-primary/15 bg-primary/5 p-6 md:p-8">
        <div className="flex items-center gap-4">
          <span className="rounded-2xl bg-base-100 p-4 text-primary">
            <LuTicket className="size-7" />
          </span>
          <div>
            <h2 className="font-bold">招待状が届いていますか？</h2>
            <p className="mt-2 text-sm text-base-content/60">
              受け取ったコードから参加できます。
            </p>
          </div>
        </div>
        <form
          className="flex max-w-full gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            router.push(href(`/join/${code.trim().toUpperCase()}`));
          }}
        >
          <label>
            <span className="sr-only">招待コード</span>
            <input
              className="input w-44 uppercase tracking-widest sm:w-52"
              placeholder="HOSHI26"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              pattern="[a-zA-Z0-9]{6,8}"
              maxLength={8}
              title="6〜8文字の英数字で入力してください"
            />
          </label>
          <button className="btn btn-primary">確認する</button>
        </form>
      </section>
      <div className="mb-6 flex gap-2">
        {(
          [
            ["all", "すべて"],
            ["joined", "参加中"],
            ["owned", "つくったイベント"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            aria-pressed={filter === value}
            className={`btn btn-sm rounded-full ${filter === value ? "btn-neutral" : "btn-ghost"}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {events.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventSummary key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState title="まだイベントがありません">
          <p className="mb-4">
            招待コードで参加するか、自分の集まりをつくってみましょう。
          </p>
          <AppLink to="/events/new">イベントをつくる</AppLink>
        </EmptyState>
      )}
    </>
  );
}

export function EventCreateScreen() {
  const { dispatch, href } = usePrototype();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(() =>
    new Date().toLocaleDateString("sv-SE"),
  );
  const [end, setEnd] = useState(start);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    if (!title.trim() || !start || !end || end < start) {
      setError(
        "タイトルと期間を確認してください。終了日は開始日以降にしてください。",
      );
      return;
    }
    submitting.current = true;
    const id = crypto.randomUUID();
    dispatch({
      type: "createEvent",
      event: {
        id,
        title: title.trim(),
        description: description.trim(),
        start,
        end,
        code: id.slice(0, 8).toUpperCase(),
        joined: true,
        owned: true,
      },
    });
    router.push(href(`/events/${id}`));
  }
  return (
    <>
      <PageHeading
        eyebrow="HOST A GATHERING"
        title="小さな集まりを、ひらこう。"
        description="話したいテーマと日程を決めたら、招待状を届けましょう。"
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel>
          <form onSubmit={submit} className="space-y-6">
            <label className="block text-sm font-semibold">
              イベント名
              <input
                className="input mt-2 w-full"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例：本好きの、ゆるいおしゃべり会"
                required
                maxLength={80}
              />
            </label>
            <label className="block text-sm font-semibold">
              どんな集まりですか？
              <textarea
                className="textarea mt-2 min-h-32 w-full"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="テーマや、来てほしい人のことを教えてください。"
                maxLength={500}
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                開始日
                <input
                  type="date"
                  className="input mt-2 w-full"
                  required
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                />
              </label>
              <label className="text-sm font-semibold">
                終了日
                <input
                  type="date"
                  className="input mt-2 w-full"
                  required
                  min={start}
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                />
              </label>
            </div>
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">会場</legend>
              <label className="flex items-center gap-3 rounded-2xl border border-primary bg-primary/5 p-4">
                <input
                  type="radio"
                  className="radio radio-primary"
                  checked
                  readOnly
                  name="venue"
                />
                <span>
                  <span className="block text-sm font-bold">星川ラウンジ</span>
                  <span className="mt-1 block text-xs text-base-content/60">
                    落ち着いて話せる、小さな交流スペース
                  </span>
                </span>
              </label>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            )}
            <button className="btn btn-primary" type="submit">
              イベントを作成する <LuArrowRight />
            </button>
          </form>
        </Panel>
        <Panel title="招待状を届けるまで">
          <ol className="space-y-6 text-sm leading-7">
            <li>
              <span className="badge badge-primary mr-3">1</span>イベントを作成
            </li>
            <li>
              <span className="badge badge-ghost mr-3">2</span>
              招待コードとQRを確認
            </li>
            <li>
              <span className="badge badge-ghost mr-3">3</span>
              会場でカードを受け取る
            </li>
          </ol>
          <p className="mt-6 text-xs leading-6 text-base-content/55">
            プレビューでは、作成したイベントにサンプル参加者が登場します。
          </p>
        </Panel>
      </div>
    </>
  );
}

function Invitation({ event }: { event: PrototypeEvent }) {
  const { href } = usePrototype();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const path = href(`/join/${event.code}`);
  useEffect(() => {
    const destination = `${window.location.origin}${path}`;
    // URLの組み立てとQR生成はブラウザで完結し、外部サービスへ送信しません。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(destination);
    if (canvas.current)
      QRCode.toCanvas(canvas.current, destination, {
        width: 164,
        margin: 2,
        color: { dark: "#23453D", light: "#FFFFFF" },
      }).catch(() =>
        setMessage("QRを生成できませんでした。招待URLをご利用ください。"),
      );
  }, [path]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("招待URLをコピーしました。");
    } catch {
      setMessage(
        "コピーできませんでした。招待URLを選択してコピーしてください。",
      );
    }
  }
  return (
    <Panel title="この集まりの招待状">
      <div className="flex flex-wrap items-center gap-6">
        <canvas
          ref={canvas}
          className="rounded-2xl border border-base-300"
          role="img"
          aria-label={`招待コード ${event.code} のQRコード`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-base-content/55">招待コード</p>
          <p className="my-3 font-mono text-2xl font-bold tracking-[.15em]">
            {event.code}
          </p>
          <label className="block">
            <span className="sr-only">招待URL</span>
            <input
              className="input input-sm w-full"
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-outline btn-sm" onClick={copy}>
              <LuCopy />
              URLをコピー
            </button>
            <AppLink
              to={`/join/${event.code}`}
              className="btn btn-ghost btn-sm"
            >
              参加画面を確認 <LuArrowRight />
            </AppLink>
          </div>
        </div>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
      {event.owned && (
        <p className="mt-4 text-xs leading-6 text-base-content/55">
          作成したイベントは、このタブ内で確認できます。別端末への共有は実API接続後に利用できます。
        </p>
      )}
    </Panel>
  );
}

export function EventVenueScreen({ eventId }: { eventId: string }) {
  const { state } = usePrototype();
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return <Missing title="イベントが見つかりません" />;
  const phase = eventPhase(event);
  if (!event.joined)
    return (
      <EmptyState title="まずは参加を確認しましょう">
        <AppLink to={`/join/${event.code}`}>参加ページへ</AppLink>
      </EmptyState>
    );
  const cards = state.cards.filter((card) => card.eventId === event.id);
  return (
    <>
      <PageHeading
        eyebrow="HOSHIKAWA LOUNGE"
        title={event.title}
        description={event.description}
      >
        <span className="badge badge-soft badge-primary p-4">
          {phaseLabel[phase]}
        </span>
      </PageHeading>
      {phase !== "active" && (
        <p role="status" className="alert mb-6">
          {phase === "upcoming"
            ? `${event.start} から会場とカードを利用できます。`
            : "このイベントは終了しました。届いたカードは引き続き読み返せます。"}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-base-300 bg-gradient-to-b from-primary/8 to-base-100 p-5 md:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold">
                {phase === "active"
                  ? "ラウンジに集まる分身たち"
                  : "参加する分身たち"}
              </h2>
              <span className="flex items-center gap-2 text-xs">
                <LuUsers />
                4人
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="text-center">
                <p className="badge badge-soft badge-primary mb-2">
                  あなたの分身
                </p>
                <Avatar id={state.avatar} className="h-40 w-full md:h-48" />
                <p className="mt-3 text-sm font-bold">あなた</p>
              </div>
              {people.map((person) => (
                <div key={person.id} className="text-center">
                  <span className="badge badge-ghost mb-2">
                    {person.tags[0]}
                  </span>
                  <Avatar
                    src={person.src}
                    name={person.name}
                    className="h-40 w-full md:h-48"
                  />
                  <p className="mt-3 text-sm font-bold">{person.name}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs leading-6 text-base-content/55">
              {phase === "active"
                ? "分身たちが、好きなことを少しずつ話しています。"
                : "開催期間に合わせて、会話がはじまります。"}
            </p>
          </section>
          <Invitation event={event} />
        </div>
        <Panel
          title="カササギからのお便り"
          action={<LuMail className="text-primary" />}
        >
          <p className="mb-5 text-sm leading-7 text-base-content/60">
            気の合いそうな人との、会話のきっかけが届いています。
          </p>
          {cards.length && phase !== "upcoming" ? (
            <div className="space-y-4">
              {cards.map((card) => {
                const person = people.find((item) => item.id === card.person)!;
                return (
                  <AppLink
                    key={card.id}
                    to={`/cards/${card.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-base-300 p-4 transition-colors hover:bg-primary/5"
                  >
                    <Avatar
                      src={person.src}
                      name={person.name}
                      className="h-20 w-14 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        {person.name}との共通点
                      </p>
                      <p className="mt-2 text-xs text-base-content/55">
                        {person.tags.join(" · ")}
                      </p>
                      <span
                        className={`badge badge-sm mt-2 ${card.opened ? "badge-ghost" : "badge-soft badge-primary"}`}
                      >
                        {card.opened ? "開封済み" : "新しいお便り"}
                      </span>
                    </div>
                    <LuArrowRight className="shrink-0" />
                  </AppLink>
                );
              })}
            </div>
          ) : (
            <EmptyState title="お便りを待っています">
              {phase === "upcoming"
                ? "開催日になったら、また見に来てください。"
                : "カードが届くとここに表示されます。"}
            </EmptyState>
          )}
        </Panel>
      </div>
    </>
  );
}

export function JoinScreen({ code }: { code: string }) {
  const { state, dispatch, href } = usePrototype();
  const router = useRouter();
  const normalized = code.toUpperCase();
  const event = /^[A-Z0-9]{6,8}$/.test(normalized)
    ? state.events.find((item) => item.code === normalized)
    : undefined;
  if (!event) return <Missing title="招待コードが見つかりません" />;
  const ended = eventPhase(event) === "ended";
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeading
        eyebrow="YOU ARE INVITED"
        title="会話の、はじまりの招待状。"
      />
      <Panel className="text-center">
        <LuTicket className="mx-auto mb-5 size-10 text-primary" />
        <span className="badge badge-soft badge-primary">
          {phaseLabel[eventPhase(event)]}
        </span>
        <h2 className="mt-5 text-balance text-2xl font-bold">{event.title}</h2>
        <p className="my-5 text-sm leading-8 text-base-content/65">
          {event.description}
        </p>
        <div className="my-6 flex justify-center -space-x-3">
          {people.map((person) => (
            <div
              key={person.id}
              className="rounded-full border-4 border-base-100 bg-base-200"
            >
              <Avatar
                src={person.src}
                name={person.name}
                className="h-20 w-16"
              />
            </div>
          ))}
        </div>
        <p className="mb-6 text-sm text-base-content/60">
          {event.owned
            ? `${event.start} 〜 ${event.end}`
            : "おひとりでも試せる、常設のデモイベントです。"}
        </p>
        {ended ? (
          <p role="status" className="alert">
            このイベントの参加受付は終了しました。
          </p>
        ) : !state.settings.configured || !state.born ? (
          <>
            <p className="mb-4 text-sm">
              先に分身との出会いを済ませてから、参加を確認しましょう。
            </p>
            <AppLink
              to={`${state.settings.configured ? "/onboarding" : "/settings"}?join=${event.code}`}
            >
              会話の準備をする <LuArrowRight />
            </AppLink>
          </>
        ) : (
          <button
            className="btn btn-primary w-full sm:w-auto"
            onClick={() => {
              dispatch({ type: "join", eventId: event.id });
              router.push(href(`/events/${event.id}`));
            }}
          >
            {event.joined ? "会場・カードを見る" : "このイベントに参加する"}
            <LuArrowRight />
          </button>
        )}
        <p className="mt-6 text-xs leading-6 text-base-content/50">
          スマートフォンでも、参加とカードの開封ができます。
        </p>
      </Panel>
    </div>
  );
}
