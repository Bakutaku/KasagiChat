import type { ConversationStatus } from "./types";

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

/** 会話中のマップモーダルだけ、閉じる前に保存確認を挟む。 */
export function needsSaveBeforeClose(
  presentation: ConversationPresentation,
  status: ConversationStatus,
) {
  return presentation === "modal" && status === "IN_PROGRESS";
}
