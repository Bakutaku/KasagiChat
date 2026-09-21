import Link from "next/link";
import { notFound } from "next/navigation";
import { ImmersiveMapShell } from "@/components/map";

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
  // 参加者APIを接続する際は、この画面側でRuntimeMapCharacter[]へ変換します。
  return (
    <ImmersiveMapShell
      mapId="komorebi-lounge"
      interaction="fixed"
      characters={[]}
    >
      <div className="flex items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100/85 p-3 backdrop-blur">
        <p className="font-medium">こもれびラウンジ</p>
        <Link href="/map" className="btn btn-sm">
          街へ戻る
        </Link>
      </div>
    </ImmersiveMapShell>
  );
}
