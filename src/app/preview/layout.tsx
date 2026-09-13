import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { PrototypeLayout } from "@/features/prototype/shell";

export const metadata: Metadata = {
  title: "画面プレビュー | KasagiChat",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8">画面を準備しています…</div>}>
      <PrototypeLayout preview>{children}</PrototypeLayout>
    </Suspense>
  );
}
