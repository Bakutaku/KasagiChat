import { PRACTICE_SCENES } from "./scene";
import type {
  ConversationScene,
  ConversationStatus,
  ConversationType,
} from "./types";

/** APIのConversationSceneとは独立した、会話UIだけの背景キー。 */
export type ConversationBackgroundKey = "home" | "cafe" | "lobby" | "office";

export type ConversationPresentation = "fullscreen" | "modal";

export type ConversationAvatar = {
  name: string;
  imageSrc: string;
  imageAlt: string;
};

/**
 * 会話の通信状態を含まない表示設定。
 * 練習・DAILYが追加されても、useConversationを変えずに外見と操作だけ差し替えられる。
 */
export type ConversationDisplaySettings = {
  title: string;
  assistant: ConversationAvatar;
  backgroundKey: ConversationBackgroundKey;
  observer?: ConversationAvatar;
  completionLabel: string;
  presentation: ConversationPresentation;
  onFinish: () => void;
  onClose?: () => void;
};

export type ConversationSceneDisplay = {
  label: string;
  backgroundSrc: string;
};

/** 家は誕生画面で使用し、残り3件は将来の練習シーンから同じキーで選べる。 */
export const CONVERSATION_SCENES = {
  home: {
    label: "家",
    backgroundSrc: "/assets/conversation/home.png",
  },
  cafe: {
    label: "カフェ",
    backgroundSrc: "/assets/conversation/cafe.png",
  },
  lobby: {
    label: "ロビー",
    backgroundSrc: "/assets/conversation/lobby.png",
  },
  office: {
    label: "オフィス",
    backgroundSrc: "/assets/conversation/office.png",
  },
} as const satisfies Record<ConversationBackgroundKey, ConversationSceneDisplay>;

/**
 * 表示設定の組み立てに必要な材料。
 *
 * 立ち絵のパスは呼び出し側で解決して渡します。ここで presetImagePath を
 * 直接使うと @/ エイリアスへの依存が生まれ、tests から読み込めなくなるためです。
 */
export type ConversationDisplayInput = {
  type: ConversationType;
  scene: ConversationScene;
  /** 分身の名前。 */
  npcName: string;
  /** 分身の立ち絵。 */
  npcImageSrc: string;
  /** 練習相手の立ち絵。PRACTICEのときだけ使う。 */
  partnerImageSrc?: string;
  presentation: ConversationPresentation;
  onFinish: () => void;
  onClose?: () => void;
};

/**
 * 会話種別から表示設定を組み立てる。
 *
 * 練習だけは会話相手がシーン専用NPCになり、分身は observer(見守り)へ回ります。
 * 分身の人格はサーバー側でも練習プロンプトへ渡していないため、
 * 画面上でも「相手ではなく付き添い」として扱いを揃えます。
 */
export function conversationDisplay(
  input: ConversationDisplayInput,
): ConversationDisplaySettings {
  const npcAvatar: ConversationAvatar = {
    name: input.npcName,
    imageSrc: input.npcImageSrc,
    imageAlt: `${input.npcName}の姿`,
  };
  const base = {
    presentation: input.presentation,
    onFinish: input.onFinish,
    onClose: input.onClose,
  };

  if (input.type === "PRACTICE" && input.scene) {
    const scene = PRACTICE_SCENES[input.scene];
    return {
      ...base,
      title: scene.title,
      assistant: {
        name: scene.partnerName,
        imageSrc: input.partnerImageSrc ?? input.npcImageSrc,
        imageAlt: `${scene.partnerName}の姿`,
      },
      observer: npcAvatar,
      backgroundKey: scene.backgroundKey,
      completionLabel: "会話を終える",
    };
  }

  if (input.type === "DAILY") {
    return {
      ...base,
      title: `${input.npcName}と今日のひとこと`,
      assistant: npcAvatar,
      backgroundKey: "home",
      completionLabel: "会話を終える",
    };
  }

  return {
    ...base,
    title: `${input.npcName}との最初の会話`,
    assistant: npcAvatar,
    backgroundKey: "home",
    completionLabel: "会話を終えて誕生する",
  };
}

/** 会話中のマップモーダルだけ、閉じる前に保存確認を挟む。 */
export function needsSaveBeforeClose(
  presentation: ConversationPresentation,
  status: ConversationStatus,
) {
  return presentation === "modal" && status === "IN_PROGRESS";
}
