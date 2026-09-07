import KasagiLogo from "@/components/icon/KasagiLogo";
import type { Metadata } from "next";
import Link from "next/link";
import SignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "新規登録 | KasagiChat",
  description: "KasagiChatに登録して、あなたの分身との暮らしを始めましょう。",
};

export default function SignupPage() {
  return (
    <section className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-base-200 px-5 py-10 text-base-content">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-1/2 bg-linear-to-b from-primary/15 to-transparent" />
      <div aria-hidden="true" className="absolute -left-24 bottom-10 -z-10 size-72 rounded-full bg-secondary/15 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-24 top-16 -z-10 size-80 rounded-full bg-accent/15 blur-3xl" />

      <section className="card w-full max-w-xl border border-base-300 bg-base-100 shadow-2xl">
        <div className="card-body gap-0 p-6 sm:p-9">
          <Link
            href="/"
            className="mx-auto flex items-center gap-2 rounded-lg text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            aria-label="KasagiChat トップへ戻る"
          >
            <KasagiLogo width={50} height={50} />
            <span>Kasagi<span className="text-primary">Chat</span></span>
          </Link>

          <div className="mt-7 text-center">
            <div className="badge badge-primary badge-outline mb-4">CREATE USER</div>
            <h1 className="text-2xl font-black sm:text-3xl">プロフィールを確認</h1>
            <p className="mt-3 text-sm leading-6 text-base-content/65">
              あと少しで登録が完了します。
              <br />
              表示名を確認し、最新の規約に同意してください。
            </p>
          </div>

          <SignupForm />
        </div>
      </section>
    </section>
  );
}
