import Image from "next/image";
import Link from "next/link";
import {
  LuArrowDown,
  LuArrowRight,
  LuCoffee,
  LuHeartHandshake,
  LuMessageCircle,
  LuSparkles,
  LuSprout,
} from "react-icons/lu";
import { TownPreview } from "@/components/marketing/town-preview";
import styles from "@/components/marketing/landing.module.css";

const features = [
  {
    icon: LuSprout,
    title: "あなたを知る、もうひとりの自分。",
    description:
      "好きなこと、今日の出来事。何気ない言葉からあなたらしさを知って、分身が少しずつ育っていきます。",
    image: "home",
    label: "分身と育つ",
    example: "話したことが、思い出になっていく。",
  },
  {
    icon: LuCoffee,
    title: "小さな街で、会話のリハーサル。",
    description:
      "カフェでの雑談、初対面のあいさつ、面接。練習したい場面を選んで、自分のペースで話してみましょう。",
    image: "cafe",
    label: "街で練習する",
    example: "今日はカフェで、気軽なおしゃべり。",
  },
  {
    icon: LuHeartHandshake,
    title: "共通点から、最初のひとことへ。",
    description:
      "イベントでは、参加者との共通点や話題を会話カードで発見。誰かに話しかけるきっかけを届けます。",
    image: "lobby",
    label: "人とつながる",
    example: "「私も好きです」が、会話の入り口に。",
  },
];
const steps = [
  {
    title: "ログインして、準備する",
    text: "Google または GitHub でログイン。利用規約を確認し、AIの利用設定を行います。",
  },
  {
    title: "最初の会話で、分身と出会う",
    text: "好きなことや普段のことを少しずつ。あなたを知る分身との暮らしが始まります。",
  },
  {
    title: "街へ出かけて、話してみる",
    text: "気になる場所で会話を練習。家に戻ったら、分身の成長や思い出を振り返れます。",
  },
];
const questions = [
  {
    question: "会話が苦手でも大丈夫？",
    answer:
      "うまく話す必要はありません。短いひとことから、自分のペースで始められます。会話を採点するのではなく、話したことを分身の成長につなげる体験です。",
  },
  {
    question: "どんな場面を練習できますか？",
    answer:
      "カフェでの雑談、ロビーでの初対面の会話、オフィスでの面接の3つの場面です。イベントでは、参加者との共通点をもとにした会話カードが、人と話すきっかけになります。",
  },
  {
    question: "利用するために必要なものは？",
    answer:
      "基本の体験にはPCブラウザと、GoogleまたはGitHubのアカウントを使います。AIの利用にはプロバイダーの設定が必要です。ご自身のAPIキーを利用する場合は、プロバイダー側で料金が発生することがあります。",
  },
];

export default function Home() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <LuSparkles aria-hidden="true" />{" "}
              あなたらしさから始まる、小さな世界
            </p>
            <h1 className={styles.title}>
              <span>もうひとりの自分と、</span>
              <span>
                <em>会話の橋</em>を架けよう。
              </span>
            </h1>
            <p className={styles.intro}>
              「何を話そう」を、少しずつ「話してみよう」へ。
              <br className="hidden sm:block" />
              あなたと育つ分身と、小さな街で会話の練習。
              <br className="hidden sm:block" />
              その一歩が、誰かとのつながりになります。
            </p>
            <div className={styles.actions}>
              <Link
                className="btn btn-primary btn-lg rounded-full px-7"
                href="/login"
              >
                分身に会いにいく <LuArrowRight aria-hidden="true" />
              </Link>
              <a className="btn btn-ghost rounded-full" href="#features">
                どんな世界？ <LuArrowDown aria-hidden="true" />
              </a>
            </div>
            <p className={styles.reassurance}>
              <LuMessageCircle aria-hidden="true" />{" "}
              ひとことからで大丈夫。あなたのペースで。
            </p>
          </div>
          <TownPreview />
        </div>
      </section>

      <section className={styles.about} id="about">
        <div className={styles.aboutHeading}>
          <p className={styles.eyebrow}>大切にしていること</p>
          <h2>
            話すことが、
            <br />
            少し楽しみになる場所。
          </h2>
        </div>
        <div className={styles.aboutText}>
          <p>
            気の利いた言葉が出てこない日も、
            <br />
            誰かに聞いてほしいだけの日も。
            <br />
            あなたの言葉を、そばで聞いてくれる分身がいます。
          </p>
          <p className={styles.promise}>
            <LuSprout aria-hidden="true" />{" "}
            育つのは、あなたの評価ではなく、あなたの分身。
          </p>
        </div>
      </section>

      <section className={styles.section} id="features">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>この街でできること</p>
          <h2>自分を知る。練習する。人とつながる。</h2>
          <p>小さな会話を重ねながら、あなたの世界を少しずつ。</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map((feature, index) => (
            <article className={`card ${styles.feature}`} key={feature.label}>
              <div className={styles.featureArt}>
                <span className={styles.number}>0{index + 1}</span>
                <Image
                  src={`/assets/map/tiles/${feature.image}.png`}
                  alt=""
                  width={260}
                  height={182}
                  sizes="(max-width: 767px) 240px, 260px"
                  className="h-44 w-64 object-contain"
                />
              </div>
              <div className="card-body gap-4 p-7">
                <p className={styles.featureLabel}>
                  <feature.icon aria-hidden="true" />
                  {feature.label}
                </p>
                <h3 className="card-title text-xl leading-relaxed">
                  {feature.title}
                </h3>
                <p className="text-sm leading-7 text-base-content/70">
                  {feature.description}
                </p>
                <p className={styles.example}>{feature.example}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.flow}`} id="flow">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>はじめかた</p>
          <h2>最初のひとことから、はじまる。</h2>
          <p>準備ができたら、分身と一緒に星川の街へ。</p>
        </div>
        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className={styles.stepNumber}>0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${styles.section} ${styles.faq}`} id="faq">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>気になること</p>
          <h2>はじめる前に。</h2>
        </div>
        <div className="space-y-3">
          {questions.map(({ question, answer }) => (
            <details
              className="collapse collapse-plus border border-base-300 bg-base-100"
              key={question}
            >
              <summary className="collapse-title pr-12 font-semibold">
                {question}
              </summary>
              <div className="collapse-content text-sm leading-7 text-base-content/70">
                <p>{answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.invitation}>
        <div className={styles.constellation} aria-hidden="true">
          ✧ · ˚
        </div>
        <p className={styles.eyebrow}>星川の街で、待っています。</p>
        <h2>今日は、どんなことを話そう。</h2>
        <p>何気ないひとことが、あなたと分身の最初の思い出に。</p>
        <Link
          className="btn rounded-full border-0 bg-[#f4efdF] px-8 text-[#343f68] hover:bg-white"
          href="/login"
        >
          分身との暮らしをはじめる <LuArrowRight aria-hidden="true" />
        </Link>
      </section>
    </>
  );
}
