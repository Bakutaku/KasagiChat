export type HomeItemKind = "SOUVENIR" | "BOOK";

export type HomeSlotId =
  | "DISPLAY_1"
  | "DISPLAY_2"
  | "DISPLAY_3"
  | "DISPLAY_4"
  | "DISPLAY_5"
  | "DISPLAY_6"
  | "BOOKSHELF_1"
  | "BOOKSHELF_2"
  | "BOOKSHELF_3"
  | "BOOKSHELF_4"
  | "BOOKSHELF_5"
  | "BOOKSHELF_6";

export type HomeItem = {
  topicId: number;
  topicName: string;
  kind: HomeItemKind;
  category: { code: string; name: string } | null;
  displayName: string;
  imagePath: string | null;
  acquiredAt: string;
  sourceConversationId: string | null;
  publicTopic: boolean;
  slotId: HomeSlotId | null;
};

export type HomeSlot = {
  slotId: HomeSlotId;
  acceptedKind: HomeItemKind;
};

export type HomeResponse = {
  npc: {
    name: string;
    presetId: string;
    appearance: Record<string, string> | null;
    level: number;
    exp: number;
    bornAt: string | null;
    nextLevel: {
      level: number;
      requiredTotalExp: number;
      remainingExp: number;
    } | null;
  };
  slots: HomeSlot[];
  items: HomeItem[];
  unlockedItems: Array<{
    unlockedItemId: number;
    code: string;
    itemType: "CLOTHES" | "ACCESSORY";
    name: string;
    imagePath: string;
    acquiredAt: string;
  }>;
};
