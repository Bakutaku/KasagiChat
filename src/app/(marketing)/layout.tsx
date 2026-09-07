import { MarketingFooter } from "@/components/layout/marketing-footer";
import { MarketingHeader } from "@/components/layout/marketing-header";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-base-200 text-base-content" id="top">
      <MarketingHeader />

      <main className="flex-1">{children}</main>

      <MarketingFooter />
    </div>
  );
}
