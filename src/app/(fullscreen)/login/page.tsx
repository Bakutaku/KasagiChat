import KasagiLogo from "@/components/icon/KasagiLogo";
import type { Metadata } from "next";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";

export const metadata: Metadata = {
  title: "ログイン | KasagiChat",
  description: "KasagiChatにログインして、分身との暮らしを始めましょう。",
};

export default async function LoginPage() {

  return (
    <section className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-base-200 px-5 py-10 text-base-content">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-1/2 bg-linear-to-b from-primary/15 to-transparent" />
      <div aria-hidden="true" className="absolute -left-24 bottom-10 -z-10 size-72 rounded-full bg-secondary/15 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-24 top-16 -z-10 size-80 rounded-full bg-accent/15 blur-3xl" />

      <section className="card w-full max-w-md border border-base-300 bg-base-100 shadow-2xl">
        <div className="card-body gap-0 p-6 sm:p-9">
          <Link
            href="/"
            className="mx-auto flex items-center gap-2 rounded-lg text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            aria-label="KasagiChat トップへ戻る"
          >
            <KasagiLogo width={50} height={50} />
            <span>Kasagi<span className="text-emerald-300">Chat</span></span>
          </Link>

          <div className="mt-7 text-center">
            {/* <div className="badge badge-primary badge-outline mb-4">WELCOME BACK</div> */}
            <h1 className="text-2xl font-black sm:text-3xl">WELCOME BACK</h1>
            <p className="mt-3 text-sm leading-6 text-base-content/65">
              ログインして、あなたの分身との続きを始めましょう。
              <br />
              初めての方もこちらから登録できます。
            </p>
          </div>

          <div className="mt-7 grid gap-3">
            {/* Google */}
            <a href="/oauth2/authorization/google" className="btn bg-white text-black border-[#e5e5e5]">
              <svg aria-label="Google logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g><path d="m0 0H512V512H0" fill="#fff"></path><path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path><path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path><path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path><path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path></g></svg>
              Login with Google
            </a>
            {/* GitHub */}
            <a href="/oauth2/authorization/github" className="btn bg-black text-white border-black">
              <svg aria-label="GitHub logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"></path></svg>
              Login with GitHub
            </a>

          </div>

          <div className="divider my-7 text-xs text-base-content/40">安心して使うために</div>

          <div className="flex gap-3 rounded-box bg-base-200 p-4 text-xs leading-5 text-base-content/65">
            <span aria-hidden="true" className="text-lg text-primary">◆</span>
            <p>
              パスワードをKasagiChatが保存することはありません。
              ログイン後、初回のみ利用規約への同意をご案内します。
            </p>
          </div>

          <Link href="/" className="btn btn-ghost btn-sm mx-auto mt-6 text-base-content/60">
            <LuArrowLeft />トップページへ戻る
          </Link>
        </div>
      </section>
    </section>
  );
}
