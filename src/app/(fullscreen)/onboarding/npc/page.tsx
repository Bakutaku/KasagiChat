import type { Metadata } from "next";
import NpcBirth from "./npc-birth";

export const metadata: Metadata = {
  title: "分身の誕生 | KasagiChat",
  description: "あなたの分身となるNPCを選び、最初の会話を始めます。",
};

export default function NpcBirthPage() {
  return <NpcBirth />;
}
