import Image from "next/image";
import { ThemeSelector } from "@/components/themes/theme-selector";

const features = [
  {
    icon: "✦",
    title: "話して、生まれる",
    description:
      "最初の会話から、あなたらしい性格や好きなことを少しずつ覚えます。",
    color: "primary",
  },
  {
    icon: "⌁",
    title: "街で、練習する",
    description:
      "カフェの雑談から面接まで。小さな街を歩いて自然に会話を練習できます。",
    color: "secondary",
  },
  {
    icon: "◌",
    title: "つながりを、見つける",
    description:
      "分身同士が共通点を見つけ、誰かに話しかける最初の一歩をつくります。",
    color: "accent",
  },
];

function KasagiLogo() {
  return <Image src="/kasagi-logo.svg" alt="" width={46} height={46} />;
}

function TownPreview() {
  return (
    <div className="mockup-window w-full max-w-xl border border-base-300 bg-base-100 shadow-2xl">
      <div className="border-t border-base-300 bg-base-200">
        <div className="flex items-center justify-between px-5 py-3 text-xs font-semibold text-base-content/60">
          <span className="flex items-center gap-2">
            <span className="status status-success" />
            星川の街
          </span>
          <span>18:42</span>
        </div>

        <svg
          className="aspect-[4/3] w-full"
          viewBox="0 0 480 360"
          role="img"
          aria-label="川と橋、カフェとオフィスがある星川の街"
        >
          <rect width="480" height="360" fill="var(--color-base-200)" />
          <rect width="480" height="150" fill="var(--color-info)" opacity=".35" />
          <g fill="var(--color-base-100)" opacity=".8">
            <path d="M44 68h73c-3-15-14-24-27-20-5-23-42-18-43 8-13-1-20 5-23 12h20Z" />
            <path d="M336 48h72c-4-12-13-18-24-15-8-19-36-12-38 9-10-1-17 1-20 6h10Z" />
          </g>
          <g stroke="var(--color-base-content)" strokeWidth="4">
            <path fill="var(--color-warning)" d="M27 58h126v116H27z" />
            <path fill="var(--color-accent)" d="M325 48h128v126H325z" />
            <path fill="var(--color-base-100)" d="M46 42h73v24H46z" />
            <path fill="var(--color-base-100)" d="M348 32h82v24h-82z" />
            <path fill="var(--color-info)" d="M43 115h49v43H43z" />
            <path fill="var(--color-base-100)" d="M111 108h27v66h-27z" />
            <path fill="var(--color-info)" d="M344 76h90v48h-90zM374 132h31v42h-31z" />
          </g>
          <g fill="var(--color-base-content)" fontSize="11" fontWeight="800">
            <text x="61" y="58">CAFE</text>
            <text x="365" y="49">OFFICE</text>
          </g>
          <path
            d="M-20 181C119 157 315 220 500 181v92C309 311 126 244-20 277Z"
            fill="var(--color-info)"
            opacity=".75"
          />
          <g transform="translate(218 164) rotate(4)" stroke="var(--color-neutral)" strokeWidth="3">
            <rect width="61" height="125" fill="var(--color-neutral)" />
            <path d="M8 5h45v21H8zM8 29h45v21H8zM8 53h45v21H8zM8 77h45v21H8zM8 101h45v19H8z" fill="var(--color-warning)" />
          </g>
          <g stroke="var(--color-success)" strokeWidth="5">
            <circle cx="70" cy="292" r="34" fill="var(--color-success)" />
            <path d="M70 318v34" stroke="var(--color-warning)" strokeWidth="10" />
            <circle cx="407" cy="306" r="27" fill="var(--color-success)" />
            <path d="M407 328v25" stroke="var(--color-warning)" strokeWidth="9" />
          </g>
          <g>
            <path d="M204 308h22v31h-22z" fill="var(--color-secondary)" stroke="var(--color-neutral)" strokeWidth="4" />
            <circle cx="215" cy="299" r="12" fill="var(--color-warning)" stroke="var(--color-neutral)" strokeWidth="5" />
            <path d="M206 291q9-13 19 0" stroke="var(--color-neutral)" strokeWidth="8" />
            <path d="M237 330q17-26 31 0h-31Z" fill="var(--color-neutral)" />
            <circle cx="259" cy="316" r="10" fill="var(--color-neutral)" />
            <path d="m242 327-14 24 25-15" fill="var(--color-neutral)" />
          </g>
          <g transform="translate(164 249)">
            <path d="M9 0h105a9 9 0 0 1 9 9v22a9 9 0 0 1-9 9H9a9 9 0 0 1-9-9V9a9 9 0 0 1 9-9Z" fill="var(--color-base-100)" stroke="var(--color-base-content)" strokeWidth="3" />
            <text x="16" y="25" fill="var(--color-base-content)" fontSize="11" fontWeight="700">今日はどこへ行く？</text>
          </g>
        </svg>
        
        <div className="stats stats-horizontal w-full rounded-none border-t border-base-300 bg-base-100 shadow-none">
          <div className="stat px-4 py-3">
            <div className="stat-figure">
              <div className="avatar placeholder">
                <div className="w-10 rounded-xl bg-primary text-primary-content">
                  <span className="text-sm font-bold">K</span>
                </div>
              </div>
            </div>
            <div className="stat-title text-xs">あなたの分身</div>
            <div className="stat-value text-lg">Lv. 3</div>
          </div>
          <div className="stat px-4 py-3">
            <div className="stat-title text-xs">次のレベルまで</div>
            <div className="stat-value text-lg text-secondary">64%</div>
            <progress className="progress progress-secondary w-full" value="64" max="100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-base-200 text-base-content" id="top">
      <header className="navbar sticky top-0 z-50 border-b border-base-300 bg-base-100/90 px-4 backdrop-blur sm:px-8">
        <div className="navbar-start">
          <a className="btn btn-ghost gap-2 px-2 text-xl" href="#top" aria-label="KasagiChat トップへ">
            <KasagiLogo />
            <span>Kasagi<span className="text-primary">Chat</span></span>
          </a>
        </div>
        <nav className="navbar-center hidden lg:flex" aria-label="メインナビゲーション">
          <ul className="menu menu-horizontal gap-1 px-1 font-medium">
            <li><a href="#about">KasagiChatとは</a></li>
            <li><a href="#features">できること</a></li>
            <li><a href="#flow">はじめかた</a></li>
          </ul>
        </nav>
        <div className="navbar-end gap-2">
          <div className="hidden sm:block"><ThemeSelector /></div>
          <a className="btn btn-outline btn-primary btn-sm sm:btn-md" href="#login">ログイン</a>
        </div>
      </header>

      <section className="hero min-h-[calc(100vh-65px)] bg-base-200">
        <div className="hero-content max-w-7xl flex-col gap-12 px-5 py-16 lg:flex-row lg:py-24">
          <div className="max-w-2xl flex-1 text-center lg:text-left">
            <div className="badge badge-primary badge-outline mb-6 gap-2 p-4 font-semibold">
              <span>✦</span> あなたらしさから始まる、小さな世界
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              もうひとりの自分と、
              <br />
              <span className="text-primary">会話の橋</span>を架けよう。
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-base leading-8 text-base-content/70 lg:mx-0">
              KasagiChatは、あなたを知り、いっしょに育つ分身NPCと過ごす
              コミュニケーション練習のための小さなメタバースです。
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start" id="login">
              <a className="btn btn-primary btn-lg" href="#">
                はじめてみる
                <span aria-hidden="true">→</span>
              </a>
              <a className="btn btn-ghost btn-lg" href="#about">世界をのぞく</a>
            </div>
            <div className="mt-9 flex items-center justify-center gap-3 lg:justify-start">
              <div className="avatar-group -space-x-3">
                {["K", "H", "M"].map((name, index) => (
                  <div className="avatar placeholder" key={name}>
                    <div className={`w-9 rounded-full ${index === 0 ? "bg-primary text-primary-content" : index === 1 ? "bg-secondary text-secondary-content" : "bg-accent text-accent-content"}`}>
                      <span className="text-xs font-bold">{name}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-left text-xs text-base-content/60">
                <strong className="block text-base-content">あなたのペースで大丈夫。</strong>
                採点のない、やさしい会話練習です。
              </p>
            </div>
          </div>
          <div className="w-full flex-1">
            <div className="mb-3 flex flex-wrap justify-center gap-2 lg:justify-end">
              <span className="badge badge-success gap-2"><span className="status status-success" />会話から成長中</span>
              <span className="badge badge-warning">✦ 新しい思い出</span>
            </div>
            <TownPreview />
          </div>
        </div>
      </section>

      <section className="bg-base-100 px-5 py-20 sm:py-28" id="about">
        <div className="mx-auto max-w-6xl">
          <div className="hero rounded-box bg-base-200">
            <div className="hero-content flex-col gap-10 px-6 py-12 lg:flex-row lg:px-14">
              <div className="flex-1">
                <div className="badge badge-secondary mb-4">ABOUT</div>
                <h2 className="text-3xl font-black leading-tight sm:text-4xl">
                  話すほど、<br />「わたし」が見えてくる。
                </h2>
              </div>
              <div className="max-w-xl flex-1 text-base-content/70">
                <p className="leading-8">
                  うまく話すための点数はつけません。あなたの言葉をそばで聞く分身が、
                  新しい話題や思い出をひとつずつ増やしていきます。
                </p>
                <div className="alert alert-success mt-6">
                  <span>成長するのは、あなたの評価ではなく、あなたの分身です。</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-10 mt-20 text-center" id="features">
            <div className="badge badge-primary badge-outline mb-4">FEATURES</div>
            <h2 className="text-3xl font-black sm:text-4xl">KasagiChatでできること</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {features.map((feature, index) => (
              <article className="card border border-base-300 bg-base-200 shadow-sm transition-shadow hover:shadow-xl" key={feature.title}>
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className={`avatar placeholder text-2xl ${feature.color === "primary" ? "text-primary" : feature.color === "secondary" ? "text-secondary" : "text-accent"}`}>
                      <div className="w-12 rounded-full bg-base-100"><span>{feature.icon}</span></div>
                    </div>
                    <span className="badge badge-ghost">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="card-title mt-6">{feature.title}</h3>
                  <p className="leading-7 text-base-content/65">{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:py-28" id="flow">
        <div className="mx-auto max-w-5xl text-center">
          <div className="badge badge-accent badge-outline mb-4">HOW TO START</div>
          <h2 className="text-3xl font-black sm:text-4xl">分身との暮らしをはじめよう</h2>
          <ul className="steps steps-vertical mt-12 w-full lg:steps-horizontal">
            <li className="step step-primary" data-content="1">ログインする</li>
            <li className="step step-primary" data-content="2">最初の会話をする</li>
            <li className="step step-primary" data-content="3">星川の街へ出かける</li>
            <li className="step" data-content="✦">分身と一緒に育つ</li>
          </ul>

          <div className="card mt-20 bg-primary text-primary-content shadow-xl">
            <div className="card-body items-center px-6 py-12 text-center">
              <div className="badge badge-secondary">WELCOME TO HOSHIKAWA</div>
              <h2 className="card-title mt-3 text-2xl font-black sm:text-3xl">
                あなたの言葉から、物語がはじまります。
              </h2>
              <p className="max-w-xl text-primary-content/75">
                まずは生まれたばかりの分身と、ゆっくり話してみませんか。
              </p>
              <div className="card-actions mt-4">
                <a className="btn btn-secondary btn-lg" href="#">KasagiChatをはじめる</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer footer-horizontal border-t border-base-300 bg-base-100 p-8 text-base-content/60 sm:footer-horizontal sm:items-center">
        <aside className="flex items-center gap-2">
          <KasagiLogo />
          <div><strong className="text-base text-base-content">KasagiChat</strong><p>Bridge your conversations.</p></div>
        </aside>
        <nav className="grid-flow-col gap-4 md:place-self-center md:justify-self-end">
          <a className="link link-hover" href="#about">サービスについて</a>
          <a className="link link-hover" href="#features">できること</a>
          <span>© 2026 KasagiChat</span>
        </nav>
      </footer>
    </main>
  );
}
