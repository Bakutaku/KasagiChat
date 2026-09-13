import { NavigationHeader } from "@/components/layout/navigation-header";

export default function NavigationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-base-200 text-base-content">
      <NavigationHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
