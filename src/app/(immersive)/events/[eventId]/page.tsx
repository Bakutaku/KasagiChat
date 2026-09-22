import { notFound } from "next/navigation";

import { EventVenue } from "./event-venue";

export default async function EventVenuePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  // イベントIDは現行仕様のUUID。未実装の /events/new 等を会場と誤認しません。
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      eventId,
    )
  )
    notFound();
  // APIクライアントはCSRFトークンをCookieから読むブラウザ専用のため、取得は子の側で行います。
  return <EventVenue eventId={eventId} />;
}
