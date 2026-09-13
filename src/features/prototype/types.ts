export type Scene = "birth" | "daily" | "cafe" | "lobby" | "office";
export type Provider = "OpenAI" | "Anthropic" | "デモ";
export type Message = { role: "user" | "assistant"; text: string };
export type Conversation = {
  id: string;
  scene: Scene;
  messages: Message[];
  status: "active" | "pending" | "reviewed";
  review?: string;
};
export type Topic = { id: string; name: string; item: string; public: boolean };
export type PrototypeEvent = {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  code: string;
  joined: boolean;
  owned: boolean;
};
export type ConnectionCard = {
  id: string;
  eventId: string;
  person: string;
  opened: boolean;
  report?: string;
};
export type PrototypeState = {
  version: 1;
  settings: { provider: Provider; configured: boolean; toneEnabled: boolean };
  avatar: string | null;
  born: boolean;
  profile: string;
  exp: number;
  topics: Topic[];
  growth: { id: string; text: string; read: boolean }[];
  conversations: Conversation[];
  events: PrototypeEvent[];
  cards: ConnectionCard[];
};

// UIから渡すのは操作の意味だけ。API接続時はこの境界でリクエストへ変換します。
export type PrototypeAction =
  | { type: "reset"; experienced: boolean }
  | {
      type: "settings";
      provider: Provider;
      configured: boolean;
      toneEnabled: boolean;
    }
  | { type: "avatar"; avatar: string }
  | { type: "profile"; text: string }
  | { type: "topic"; id: string; operation: "toggle" | "delete" }
  | { type: "start"; id: string; scene: Scene }
  | { type: "send"; id: string; text: string; expectedTurn: number }
  | { type: "pause"; id: string }
  | { type: "review"; id: string }
  | { type: "readGrowth" }
  | { type: "createEvent"; event: PrototypeEvent }
  | { type: "join"; eventId: string }
  | { type: "openCard"; id: string };
