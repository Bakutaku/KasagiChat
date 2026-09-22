import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CardDetail } from "./card-detail";

export const metadata: Metadata = {
  title: "カード開封 | KasagiChat",
};

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  // カードIDはUUID。形の違うURLはAPIを呼ばずに落とす。
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cardId,
    )
  )
    notFound();
  return <CardDetail cardId={cardId} />;
}
