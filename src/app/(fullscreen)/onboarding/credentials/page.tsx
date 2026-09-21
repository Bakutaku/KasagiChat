import KasagiLogo from "@/components/icon/KasagiLogo";
import type { Metadata } from "next";
import Link from "next/link";
import CredentialSettings from "./credential-settings";

export const metadata: Metadata = {
  title: "AI利用設定 | KasagiChat",
  description: "KasagiChatで会話を始めるためのAI利用設定を行います。",
};

export default function CredentialSettingsPage() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-base-200 px-5 py-8 text-base-content sm:py-12">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-80 bg-linear-to-b from-primary/15 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute -left-24 bottom-10 -z-10 size-72 rounded-full bg-secondary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 top-16 -z-10 size-80 rounded-full bg-accent/15 blur-3xl"
      />

      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/home"
          className="mx-auto flex w-fit items-center gap-2 rounded-lg text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          aria-label="KasagiChat ホームへ"
        >
          <KasagiLogo width={50} height={50} />
          <span>
            Kasagi<span className="text-[#00BBA7]">Chat</span>
          </span>
        </Link>

        <div className="mt-6 text-center">
          <div className="badge badge-primary badge-outline mb-4">
            AI SETUP
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">
            会話に使うAIを設定
          </h1>
          <p className="mt-3 text-sm leading-6 text-base-content/65 sm:text-base">
            自分のAPIキーを使う方法と、合言葉で試すデモ利用から選べます。
          </p>
        </div>

        <CredentialSettings />
      </div>
    </section>
  );
}
