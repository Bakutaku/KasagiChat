import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InvitationJoin } from "./invitation-join";

export const metadata: Metadata = {
  title: "イベントへの招待 | KasagiChat",
};

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  // 招待コードは6〜8文字の英数字。形の違うURLはAPIを呼ばずに落とす。
  if (!/^[A-Za-z0-9]{6,8}$/.test(code)) notFound();
  return <InvitationJoin code={code.toUpperCase()} />;
}
