import type { Metadata } from "next";

import { CardsList } from "./cards-list";

export const metadata: Metadata = {
  title: "出会いカード | KasagiChat",
};

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string | string[] }>;
}) {
  const { eventId } = await searchParams;
  // 複数指定された場合は最初の値だけを使う。
  const normalizedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
  return <CardsList eventId={normalizedEventId || null} />;
}
