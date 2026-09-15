import { MarketingFooter } from "@/components/layout/marketing-footer";
import { MarketingHeader } from "@/components/layout/marketing-header";
import styles from "@/components/marketing/landing.module.css";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${styles.shell} flex min-h-screen flex-col bg-base-200 text-base-content`}
      id="top"
    >
      <a
        href="#main-content"
        className="btn btn-primary fixed left-4 top-4 z-[100] -translate-y-24 focus:translate-y-0"
      >
        本文へスキップ
      </a>
      <MarketingHeader />

      <main className="flex-1" id="main-content">
        {children}
      </main>

      <MarketingFooter />
    </div>
  );
}
