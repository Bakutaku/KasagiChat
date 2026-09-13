import { Suspense } from "react";
import { PrototypeLayout } from "@/features/prototype/shell";

export default function NavigationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<div className="p-8">画面を準備しています…</div>}>
      <PrototypeLayout>{children}</PrototypeLayout>
    </Suspense>
  );
}
