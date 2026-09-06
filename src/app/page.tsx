import { ThemeSelector } from "@/components/themes/theme-selector";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      <header className="navbar border-b border-base-300 bg-base-100 px-4 sm:px-8">
        <div className="flex-1">
          <span className="text-xl font-bold">KasagiChat</span>
        </div>
        <ThemeSelector />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-12 sm:px-8">
        <section className="card w-full bg-base-100 shadow-xl">
          <div className="card-body gap-6">
            <div>
              <div className="badge badge-primary mb-4">daisyUI Themes</div>
              <h1 className="card-title text-3xl sm:text-4xl">
                Next.js テーマスターター
              </h1>
              <p className="mt-3 max-w-2xl text-base-content/70">
                色を直接指定せず、base・primary・secondary などのセマンティックな
                daisyUIカラーを使うと、テーマ切替がすべてのコンポーネントへ反映されます。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="btn btn-primary">Primary</button>
              <button className="btn btn-secondary">Secondary</button>
              <button className="btn btn-outline">Outline</button>
            </div>

            <div role="alert" className="alert alert-info">
              <span>選択したテーマはブラウザに保存され、次回も復元されます。</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
