import type { RuntimeMapObject } from "../../components/map/map-types";
import type { HomeItem, HomeItemKind, HomeSlot, HomeSlotId } from "./types";

export const homeItemFallbacks: Record<HomeItemKind, string> = {
  BOOK: "/assets/home/items/memory-books.png",
  SOUVENIR: "/assets/home/items/ceramic-bird.png",
};

/** APIの配置IDとhome-interior.jsonの静的地点の対応はここだけで扱います。 */
export function homeAnchorId(slotId: HomeSlotId): string {
  return slotId.toLowerCase().replace("_", "-");
}

export function homeItemImage(item: HomeItem): string {
  return item.imagePath?.trim() || homeItemFallbacks[item.kind];
}

export function homeMapObjects(items: readonly HomeItem[]): RuntimeMapObject[] {
  return items.flatMap((item) => item.slotId ? [{
    id: String(item.topicId),
    anchorId: homeAnchorId(item.slotId),
    name: item.displayName,
    src: homeItemImage(item),
    fallbackSrc: homeItemFallbacks[item.kind],
  }] : []);
}

export function availableHomeSlots(slots: readonly HomeSlot[], items: readonly HomeItem[], selected: HomeItem | null): HomeSlot[] {
  if (!selected) return [];
  return slots.filter((slot) => slot.acceptedKind === selected.kind && !items.some((item) => item.slotId === slot.slotId));
}
