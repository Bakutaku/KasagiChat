import assert from "node:assert/strict";
import test from "node:test";
import { loadTypescript } from "./load-typescript.mjs";

const {
  prototypeReducer: reduce,
  restoreState,
  turnCount,
  eventPhase,
} = loadTypescript("src/features/prototype/service.ts");
const { initialState, demoConfig } = loadTypescript(
  "src/features/prototype/fixtures.ts",
);
const { authDestination, safeInvitationPath } = loadTypescript(
  "src/lib/auth-navigation.ts",
);

function birthState(turns) {
  let state = initialState();
  state = reduce(state, {
    type: "settings",
    provider: "デモ",
    configured: true,
    toneEnabled: true,
  });
  state = reduce(state, { type: "avatar", avatar: "student" });
  state = reduce(state, { type: "start", id: "birth-test", scene: "birth" });
  for (let turn = 0; turn < turns; turn++)
    state = reduce(state, {
      type: "send",
      id: "birth-test",
      text: "読書が好きです。",
      expectedTurn: turn,
    });
  return state;
}

test("初回は設定と分身を準備してから会話し、3往復未満では誕生を確定しない", () => {
  const empty = initialState();
  assert.deepEqual(
    reduce(empty, { type: "start", id: "x", scene: "birth" }),
    empty,
  );
  const short = birthState(2);
  assert.deepEqual(reduce(short, { type: "review", id: "birth-test" }), short);
  const born = reduce(birthState(3), { type: "review", id: "birth-test" });
  assert.equal(born.born, true);
  assert.equal(born.exp, demoConfig.reviewExp);
  assert.ok(born.topics.length);
  assert.deepEqual(reduce(born, { type: "avatar", avatar: "cool" }), born);
});

test("6往復上限・連打・古い送信操作でメッセージが重複しない", () => {
  const state = birthState(6);
  const resent = reduce(state, {
    type: "send",
    id: "birth-test",
    text: "もう一度",
    expectedTurn: 5,
  });
  const overflow = reduce(state, {
    type: "send",
    id: "birth-test",
    text: "7往復目",
    expectedTurn: 6,
  });
  assert.equal(turnCount(overflow.conversations[0].messages), 6);
  assert.deepEqual(resent, state);
  assert.deepEqual(overflow, state);
});

test("中断から復元・再開でき、振り返りは成長と話題を一度だけ反映する", () => {
  let state = birthState(3);
  state = reduce(state, { type: "pause", id: "birth-test" });
  assert.equal(state.conversations[0].status, "pending");
  state = restoreState(JSON.stringify(state));
  state = reduce(state, {
    type: "send",
    id: "birth-test",
    text: "続けます",
    expectedTurn: 3,
  });
  assert.equal(state.conversations[0].status, "active");
  const reviewed = reduce(state, { type: "review", id: "birth-test" });
  assert.deepEqual(
    reduce(reviewed, { type: "review", id: "birth-test" }),
    reviewed,
  );
  assert.equal(reviewed.topics[0].public, false);
  assert.equal(reviewed.growth.length, 1);
});

test("練習は6往復を超えて続けられ、終了後には追加送信しない", () => {
  let state = reduce(initialState(true), {
    type: "start",
    id: "office",
    scene: "office",
  });
  for (let turn = 0; turn < 8; turn++)
    state = reduce(state, {
      type: "send",
      id: "office",
      text: "自己紹介です。",
      expectedTurn: turn,
    });
  assert.equal(
    turnCount(
      state.conversations.find((item) => item.id === "office").messages,
    ),
    8,
  );
  state = reduce(state, { type: "review", id: "office" });
  assert.deepEqual(
    reduce(state, {
      type: "send",
      id: "office",
      text: "追記",
      expectedTurn: 8,
    }),
    state,
  );
});

test("プロフィール公開切替・削除・保存と、既読状態を反映する", () => {
  let state = initialState(true);
  state = reduce(state, { type: "topic", id: "reading", operation: "toggle" });
  assert.equal(
    state.topics.find((item) => item.id === "reading").public,
    false,
  );
  state = reduce(state, { type: "topic", id: "reading", operation: "delete" });
  assert.ok(!state.topics.some((item) => item.id === "reading"));
  state = reduce(state, { type: "profile", text: "新しい自己紹介" });
  state = reduce(state, { type: "readGrowth" });
  assert.equal(restoreState(JSON.stringify(state)).profile, "新しい自己紹介");
  assert.ok(state.growth.every((item) => item.read));
});

test("参加・カード開封の繰り返しで重複せず、開封報告を保存する", () => {
  let state = reduce(birthState(3), { type: "review", id: "birth-test" });
  state = reduce(state, { type: "join", eventId: "hoshikawa" });
  assert.equal(state.cards.length, 3);
  assert.deepEqual(
    reduce(state, { type: "join", eventId: "hoshikawa" }),
    state,
  );
  state = reduce(state, { type: "openCard", id: state.cards[0].id });
  assert.ok(state.cards[0].report);
  assert.deepEqual(
    reduce(state, { type: "openCard", id: state.cards[0].id }),
    state,
  );
  assert.equal(restoreState(JSON.stringify(state)).cards[0].opened, true);
});

test("イベント作成の入力と期間、参加開始と終了を区別する", () => {
  const state = initialState(true);
  const event = {
    id: "new-event",
    title: "読書会",
    description: "",
    start: "2026-09-13",
    end: "2026-09-14",
    code: "READ1234",
    joined: true,
    owned: true,
  };
  const created = reduce(state, { type: "createEvent", event });
  assert.equal(created.events.length, 2);
  assert.equal(created.cards.length, 6);
  assert.deepEqual(reduce(created, { type: "createEvent", event }), created);
  assert.deepEqual(
    reduce(state, { type: "createEvent", event: { ...event, title: " " } }),
    state,
  );
  assert.deepEqual(
    reduce(state, {
      type: "createEvent",
      event: { ...event, end: "2026-09-12" },
    }),
    state,
  );
  assert.equal(eventPhase(event, "2026-09-12"), "upcoming");
  assert.equal(eventPhase(event, "2026-09-13"), "active");
  assert.equal(eventPhase(event, "2026-09-14"), "active");
  assert.equal(eventPhase(event, "2026-09-15"), "ended");
  const expired = {
    ...state,
    events: [
      { ...event, joined: false, start: "2000-01-01", end: "2000-01-02" },
    ],
  };
  assert.deepEqual(
    reduce(expired, { type: "join", eventId: event.id }),
    expired,
  );
});

test("初期化は初回状態を復元し、壊れた保存データでもクラッシュしない", () => {
  assert.deepEqual(
    reduce(initialState(true), { type: "reset", experienced: false }),
    initialState(),
  );
  for (const raw of [
    null,
    "{",
    "null",
    "{}",
    JSON.stringify({ ...initialState(), topics: [null] }),
    JSON.stringify({ ...initialState(), version: 99 }),
  ])
    assert.deepEqual(restoreState(raw), initialState());
  assert.deepEqual(
    restoreState(JSON.stringify(initialState(true))),
    initialState(true),
  );
  assert.ok(!JSON.stringify(initialState(true).settings).includes("sk-"));
});

test("登録済みは各画面に進め、未認証と仮登録を振り分ける", () => {
  for (const route of [
    "/home",
    "/settings",
    "/onboarding",
    "/map",
    "/events/new",
    "/join/HOSHI26",
    "/cards/hoshikawa-haru",
  ]) {
    assert.equal(authDestination("registered", route), null);
    assert.equal(authDestination("unauthenticated", route), "/login");
    assert.equal(authDestination("pending", route), "/signup");
  }
  assert.equal(authDestination("registered", "/login"), "/home");
  assert.equal(
    authDestination("registered", "/home", "/join/HOSHI26"),
    "/join/HOSHI26",
  );
  for (const unsafe of [
    "https://example.com",
    "//example.com",
    "/join/../../settings",
    "/join/HOSHI26?next=//evil",
    "/home",
  ])
    assert.equal(safeInvitationPath(unsafe), null);
});
