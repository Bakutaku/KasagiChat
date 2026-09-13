import type { PrototypeState, Scene, Topic } from "./types";

/** 仮の振り返りで届く品。同じ話題は一つにまとめ、シーンごとの違いを確認できます。 */
export const sceneMemories: Record<Scene, Omit<Topic, "public">> = {
  birth: { id: "first-meeting", name: "はじまり", item: "出会いのしおり" },
  daily: { id: "daily", name: "日々の発見", item: "小さな日記帳" },
  cafe: { id: "coffee", name: "カフェ", item: "おしゃべりのマグカップ" },
  lobby: { id: "connections", name: "出会い", item: "星川の便箋" },
  office: { id: "craft", name: "ものづくり", item: "小さな記念トロフィー" },
};

/** デモのテンポを変えるときはここを調整します。本番のEXP値はサーバ側で管理します。 */
export const demoConfig = {
  birthTurns: 6,
  birthEarlyExit: 3,
  reviewExp: 40,
  levelExp: 60,
  replyDelay: 450,
  revealDelay: 900,
};
export const avatars = [
  {
    id: "student",
    name: "穏やかな相棒",
    src: "/assets/npc/presets/preset-01-student.png",
  },
  { id: "sunny", name: "明るい相棒", src: "/assets/npc/元気な女の子.png" },
  {
    id: "quiet",
    name: "聞き上手な相棒",
    src: "/assets/npc/おとなしめの男の子.png",
  },
  { id: "cool", name: "落ち着いた相棒", src: "/assets/npc/クールな女の子.png" },
  {
    id: "reliable",
    name: "頼れる相棒",
    src: "/assets/npc/かっこいい_お兄さん.png",
  },
] as const;
export const people = [
  {
    id: "haru",
    name: "ハル",
    src: "/assets/npc/おとなしめの男の子.png",
    tags: ["読書", "カフェ"],
    intro: "最近は街の小さな喫茶店を探しています。",
  },
  {
    id: "aoi",
    name: "アオイ",
    src: "/assets/npc/クールな女の子.png",
    tags: ["写真", "散歩"],
    intro: "いつもの道で、新しい景色を見つけるのが好き。",
  },
  {
    id: "rei",
    name: "レイ",
    src: "/assets/npc/かっこいい_お兄さん.png",
    tags: ["ものづくり", "音楽"],
    intro: "作ったものの話を聞くのが楽しみです。",
  },
] as const;

export const scenes: Record<
  Scene,
  {
    title: string;
    partner: string;
    src?: string;
    opening: string;
    prompts: string[];
  }
> = {
  birth: {
    title: "はじめまして、もうひとりの自分",
    partner: "あなたの分身",
    opening: "会えてうれしいな。まずは、最近夢中になっていることを教えて？",
    prompts: [
      "それのどんなところが好き？",
      "お休みの日は、どんなふうに過ごしている？",
      "人と話すとき、大切にしていることはある？",
      "これから一緒に練習してみたいことは？",
      "ありがとう。最後に、どんな自分になれたらうれしい？",
      "いろいろ教えてくれてありがとう。これから一緒に、少しずつ進もうね。",
    ],
  },
  daily: {
    title: "今日のひとこと",
    partner: "あなたの分身",
    opening: "今日、ちょっと心が動いたことはあった？",
    prompts: [
      "そのとき、どんな気持ちだった？",
      "小さな発見も大切にしたいね。もう少し聞かせて。",
    ],
  },
  cafe: {
    title: "カフェで雑談",
    partner: "カフェ店員",
    src: "/assets/npc/カフェ店員.png",
    opening: "こんにちは。今日はどんな一日でしたか？",
    prompts: [
      "そうだったんですね。最近、気分転換にしていることはありますか？",
      "いいですね！それを始めたきっかけも聞いてみたいです。",
      "お話してくれてありがとうございます。次のお休みは何をしたいですか？",
    ],
  },
  lobby: {
    title: "ロビーで初対面",
    partner: "ハル",
    src: people[0].src,
    opening: "はじめまして、ハルです。今日はどんなきっかけで来たんですか？",
    prompts: [
      "そうなんですね！普段はどんなことをしていますか？",
      "少し共通点がありそうです。最近好きなものはありますか？",
      "またお話できたらうれしいです。私に聞いてみたいことはありますか？",
    ],
  },
  office: {
    title: "オフィスで面接",
    partner: "面接官",
    src: "/assets/npc/スーツを着た人.png",
    opening: "本日はありがとうございます。まず、簡単に自己紹介をお願いします。",
    prompts: [
      "これまでに工夫して取り組んだことを教えてください。",
      "その経験から何を学びましたか？",
      "その強みを、これからどのように活かしたいですか？",
    ],
  },
};

export function initialState(experienced = false): PrototypeState {
  return {
    version: 1,
    settings: { provider: "デモ", configured: experienced, toneEnabled: true },
    avatar: experienced ? "student" : null,
    born: experienced,
    profile: experienced
      ? "小さな発見が好き。相手の話をゆっくり聞きながら、自分のことも伝えていきたい。"
      : "",
    exp: experienced ? 80 : 0,
    topics: experienced
      ? [
          { id: "reading", name: "読書", item: "お気に入りの本", public: true },
          {
            id: "coffee",
            name: "カフェ",
            item: "はじめてのマグカップ",
            public: true,
          },
          { id: "walk", name: "散歩", item: "街のポストカード", public: false },
        ]
      : [],
    growth: experienced
      ? [
          {
            id: "welcome",
            text: "レベル2になりました。小さな一歩が、分身の力になっています。",
            read: false,
          },
        ]
      : [],
    conversations: experienced
      ? [
          {
            id: "unfinished",
            scene: "cafe",
            messages: [
              { role: "assistant", text: scenes.cafe.opening },
              {
                role: "user",
                text: "今日は本を読みながら、ゆっくり過ごしました。",
              },
            ],
            status: "pending",
          },
        ]
      : [],
    events: [
      {
        id: "hoshikawa",
        title: "星川の小さな交流会",
        description:
          "好きなものの話から、ゆるやかにつながる交流会。はじめての方も、聞くのが好きな方もどうぞ。",
        start: "2026-01-01",
        end: "2099-12-31",
        code: "HOSHI26",
        joined: experienced,
        owned: false,
      },
    ],
    cards: experienced ? makeCards("hoshikawa") : [],
  };
}

export function makeCards(eventId: string) {
  return people.map((person) => ({
    id: `${eventId}-${person.id}`,
    eventId,
    person: person.id,
    opened: false,
  }));
}
