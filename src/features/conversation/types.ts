/**
 * 会話APIの型定義。
 *
 * サーバー(Spring Boot)のレスポンスをそのまま写したものです。
 * status / turn / canFinish はサーバーが正で、画面側で計算し直しません。
 */

/**
 * 会話の種別。
 * 現在バックエンドが受け付けるのは "BIRTH" だけで、それ以外は
 * 400 INVALID_CONVERSATION_REQUEST になります。
 * 将来 "PRACTICE"(練習) / "DAILY"(今日のひとこと)を足す想定の拡張点です。
 */
export type ConversationType = "BIRTH";

/**
 * 会話のシーン。
 * 現在は null のみ受理されます。練習シーン(CAFE / LOBBY / OFFICE)が
 * 実装されたらここへ追加します。
 */
export type ConversationScene = null;

export type MessageRole = "USER" | "ASSISTANT";

/**
 * IN_PROGRESS: 会話中
 * FINISHED   : 会話は締めくくり済み(振り返り待ち)
 * REVIEWED   : 振り返り完了
 */
export type ConversationStatus = "IN_PROGRESS" | "FINISHED" | "REVIEWED";

export type ConversationMessage = {
  role: MessageRole;
  text: string;
};

/**
 * 会話全体。turn は往復数で、送信時に expectedTurn として渡し、
 * 二重送信や別タブとの画面ずれをサーバー側で検知させる。
 * canFinish が true になると振り返り(BIRTHでは誕生確定)を実行できる。
 */
export type Conversation = {
  id: string;
  type: ConversationType;
  scene: ConversationScene;
  status: ConversationStatus;
  turn: number;
  canFinish: boolean;
  messages: ConversationMessage[];
};

/** メッセージ送信APIのレスポンス(NPCの返答と更新後の会話状態)。 */
export type SendMessageResponse = {
  turn: number;
  reply: ConversationMessage;
  canFinish: boolean;
  /** 上限往復数に達して自動終了したか。true なら status は FINISHED。 */
  finished: boolean;
};

/** 振り返りで新しく覚えた話題。 */
export type ConversationTopic = {
  id: number;
  name: string;
  public: boolean;
};

/**
 * 振り返りAPIのレスポンス。
 * 再実行しても保存済み結果が返るため、EXPは二重加算されない。
 */
export type ReviewResult = {
  feedback: string;
  expGained: number;
  level: number;
  leveledUp: boolean;
  newTopics: ConversationTopic[];
};
