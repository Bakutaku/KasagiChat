import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KasagiChat (auth実験)",
  description: "OAuthログイン実験用フロントエンド",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
