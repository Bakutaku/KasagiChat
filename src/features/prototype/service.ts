import {
  avatars,
  demoConfig,
  initialState,
  makeCards,
  people,
  scenes,
  sceneMemories,
} from "./fixtures";
import type { PrototypeAction, PrototypeEvent, PrototypeState } from "./types";

export const levelFor = (exp: number) =>
  Math.floor(exp / demoConfig.levelExp) + 1;
export const turnCount = (messages: { role: string }[]) =>
  messages.filter((message) => message.role === "user").length;
export function eventPhase(
  event: PrototypeEvent,
  today = new Date().toLocaleDateString("sv-SE"),
) {
  return today < event.start
    ? "upcoming"
    : today > event.end
      ? "ended"
      : "active";
}

/** 純粋な状態遷移。時刻・IDは呼び出し側で渡し、テストで同じ操作を再現できます。 */
export function prototypeReducer(
  state: PrototypeState,
  action: PrototypeAction,
): PrototypeState {
  switch (action.type) {
    case "reset":
      return initialState(action.experienced);
    case "settings":
      return {
        ...state,
        settings: {
          provider: action.provider,
          configured: action.configured,
          toneEnabled: action.toneEnabled,
        },
      };
    case "avatar":
      return state.born ||
        !avatars.some((avatar) => avatar.id === action.avatar)
        ? state
        : { ...state, avatar: action.avatar };
    case "profile":
      return { ...state, profile: action.text.slice(0, 1000) };
    case "topic":
      return {
        ...state,
        topics:
          action.operation === "delete"
            ? state.topics.filter((topic) => topic.id !== action.id)
            : state.topics.map((topic) =>
                topic.id === action.id
                  ? { ...topic, public: !topic.public }
                  : topic,
              ),
      };
    case "readGrowth":
      return {
        ...state,
        growth: state.growth.map((item) => ({ ...item, read: true })),
      };
    case "start": {
      if (
        !state.settings.configured ||
        (action.scene === "birth" ? !state.avatar || state.born : !state.born)
      )
        return state;
      if (
        state.conversations.some(
          (item) =>
            item.id === action.id ||
            (item.scene === action.scene && item.status !== "reviewed"),
        )
      )
        return state;
      return {
        ...state,
        conversations: [
          ...state.conversations,
          {
            id: action.id,
            scene: action.scene,
            messages: [
              { role: "assistant", text: scenes[action.scene].opening },
            ],
            status: "active",
          },
        ],
      };
    }
    case "send":
      return {
        ...state,
        conversations: state.conversations.map((item) => {
          const turn = turnCount(item.messages);
          if (
            item.id !== action.id ||
            item.status === "reviewed" ||
            !action.text.trim() ||
            turn !== action.expectedTurn ||
            (item.scene === "birth" && turn >= demoConfig.birthTurns)
          )
            return item;
          const prompts = scenes[item.scene].prompts;
          return {
            ...item,
            status: "active",
            messages: [
              ...item.messages,
              { role: "user", text: action.text.trim().slice(0, 2000) },
              { role: "assistant", text: prompts[turn % prompts.length] },
            ],
          };
        }),
      };
    case "pause":
      return {
        ...state,
        conversations: state.conversations.map((item) =>
          item.id === action.id && item.status !== "reviewed"
            ? { ...item, status: "pending" }
            : item,
        ),
      };
    case "review": {
      const conversation = state.conversations.find(
        (item) => item.id === action.id,
      );
      // 振り返り済みIDには再加算しません。連打や戻る操作でも成長は一度だけです。
      if (
        !conversation ||
        conversation.status === "reviewed" ||
        turnCount(conversation.messages) <
          (conversation.scene === "birth" ? demoConfig.birthEarlyExit : 1)
      )
        return state;
      const exp = state.exp + demoConfig.reviewExp;
      const level = levelFor(exp);
      const review =
        "自分の言葉で、気持ちを伝えられたね。相手にひとつ質問を返すと、会話がもっと広がりそう。";
      const topic = {
        ...sceneMemories[conversation.scene],
        public: false,
      };
      return {
        ...state,
        exp,
        born: state.born || conversation.scene === "birth",
        profile:
          state.profile ||
          "相手の話を聞きながら、自分らしい言葉を探しています。",
        topics: state.topics.some((item) => item.id === topic.id)
          ? state.topics
          : [...state.topics, topic],
        growth: [
          {
            id: action.id,
            text: `「${scenes[conversation.scene].title}」を振り返って +${demoConfig.reviewExp} EXP。${level > levelFor(state.exp) ? `レベル${level}になりました！` : "分身との思い出を記録しました。"}`,
            read: false,
          },
          ...state.growth,
        ],
        conversations: state.conversations.map((item) =>
          item.id === action.id
            ? { ...item, status: "reviewed", review }
            : item,
        ),
      };
    }
    case "createEvent": {
      const event = action.event;
      if (
        !event.title.trim() ||
        !event.start ||
        event.end < event.start ||
        state.events.some(
          (item) => item.id === event.id || item.code === event.code,
        )
      )
        return state;
      return {
        ...state,
        events: [...state.events, { ...event, joined: true, owned: true }],
        cards: [...state.cards, ...makeCards(event.id)],
      };
    }
    case "join": {
      const event = state.events.find((item) => item.id === action.eventId);
      if (
        !state.born ||
        !event ||
        event.joined ||
        eventPhase(event) === "ended"
      )
        return state;
      return {
        ...state,
        events: state.events.map((item) =>
          item.id === event.id ? { ...item, joined: true } : item,
        ),
        cards: [...state.cards, ...makeCards(event.id)],
      };
    }
    case "openCard":
      return {
        ...state,
        cards: state.cards.map((card) => {
          if (card.id !== action.id || card.opened) return card;
          const event = state.events.find((item) => item.id === card.eventId);
          if (!event?.joined || eventPhase(event) === "upcoming") return card;
          const person = people.find((item) => item.id === card.person)!;
          return {
            ...card,
            opened: true,
            report: `あなたの分身と${person.name}は「${person.tags[0]}」の話で盛り上がりました。好きなものを少しずつ話すうちに、もっと聞いてみたい気持ちが生まれたようです。`,
          };
        }),
      };
  }
}

/** 古い・壊れた保存内容はUIへ流さず初期化します。実キーのフィールドは持ちません。 */
export function restoreState(raw: string | null): PrototypeState {
  if (!raw) return initialState();
  try {
    const value = JSON.parse(raw) as PrototypeState;
    if (
      value.version !== 1 ||
      !value.settings ||
      !["OpenAI", "Anthropic", "デモ"].includes(value.settings.provider) ||
      typeof value.settings.configured !== "boolean" ||
      typeof value.settings.toneEnabled !== "boolean" ||
      typeof value.profile !== "string" ||
      typeof value.born !== "boolean" ||
      !Number.isFinite(value.exp) ||
      value.exp < 0 ||
      (value.avatar !== null &&
        !avatars.some((item) => item.id === value.avatar))
    )
      return initialState();
    if (
      !Array.isArray(value.topics) ||
      !value.topics.every(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.item === "string" &&
          typeof item.public === "boolean",
      )
    )
      return initialState();
    if (
      !Array.isArray(value.growth) ||
      !value.growth.every(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.text === "string" &&
          typeof item.read === "boolean",
      )
    )
      return initialState();
    if (
      !Array.isArray(value.conversations) ||
      !value.conversations.every(
        (item) =>
          item &&
          typeof item.id === "string" &&
          Object.hasOwn(scenes, item.scene) &&
          (item.review === undefined || typeof item.review === "string") &&
          ["active", "pending", "reviewed"].includes(item.status) &&
          Array.isArray(item.messages) &&
          item.messages.every(
            (message) =>
              message &&
              ["user", "assistant"].includes(message.role) &&
              typeof message.text === "string",
          ),
      )
    )
      return initialState();
    if (
      !Array.isArray(value.events) ||
      !value.events.every(
        (item) =>
          item &&
          ["id", "title", "description", "start", "end", "code"].every(
            (key) => typeof item[key as keyof PrototypeEvent] === "string",
          ) &&
          typeof item.joined === "boolean" &&
          typeof item.owned === "boolean",
      )
    )
      return initialState();
    if (
      !Array.isArray(value.cards) ||
      !value.cards.every(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.eventId === "string" &&
          people.some((person) => person.id === item.person) &&
          typeof item.opened === "boolean" &&
          (item.report === undefined || typeof item.report === "string"),
      )
    )
      return initialState();
    return value;
  } catch {
    return initialState();
  }
}
