import Image from "next/image";
import { LuCoffee, LuMessageCircle, LuSprout } from "react-icons/lu";
import styles from "./town-preview.module.css";

export function TownPreview() {
  return (
    <figure
      className={`card ${styles.preview}`}
      aria-label="天の川が流れる星川の街で、分身と会話を楽しむイメージ"
    >
      <div className={styles.scene}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>A LITTLE TOWN, YOUR OWN STORY</span>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <LuSprout aria-hidden="true" /> 分身と過ごす、星川の街
          </span>
        </div>
        <div className={styles.sun} aria-hidden="true" />
        <div className={styles.ground} aria-hidden="true" />
        <svg
          className={styles.milkyWay}
          viewBox="0 0 540 500"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className={styles.starlight}
            d="M330-40C150 105 375 175 260 295S190 450 250 540"
          />
          <path
            className={styles.starstream}
            d="M330-40C150 105 375 175 260 295S190 450 250 540"
          />
          <path
            className={styles.starDust}
            d="M326-30C175 105 350 180 258 295S190 450 245 530"
          />
          <g fill="#fff6d9">
            {Array.from({ length: 90 }, (_, index) => {
              const y = index * 5.8;
              const center = 285 + 24 * Math.sin(y / 60) - y * 0.14;
              return (
                <circle
                  key={index}
                  cx={center + Math.sin(index * 2.4) * 33}
                  cy={y}
                  r={index % 5 === 0 ? 1.5 : 0.8}
                  opacity={0.35 + (index % 4) * 0.2}
                />
              );
            })}
            <path d="m280 106 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm32 91 3 7 7 3-7 3-3 7-3-7-7-3 7-3ZM227 328l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
            <circle cx="241" cy="71" r="2" />
            <circle cx="292" cy="152" r="2" />
            <circle cx="270" cy="221" r="2.5" />
            <circle cx="300" cy="255" r="1.8" />
            <circle cx="230" cy="286" r="2" />
            <circle cx="258" cy="365" r="2" />
            <circle cx="205" cy="401" r="2.5" />
            <circle cx="82" cy="107" r="1.5" />
            <circle cx="435" cy="169" r="2" />
            <circle cx="380" cy="79" r="1.5" />
            <circle cx="172" cy="157" r="1.5" />
          </g>
        </svg>
        <div className={styles.cafe}>
          <Image
            src="/assets/map/tiles/cafe.png"
            alt="木々に囲まれたピクセルアートのカフェ"
            fill
            sizes="(max-width: 640px) 52vw, 290px"
          />
        </div>
        <span className={`badge ${styles.place}`}>
          <LuCoffee aria-hidden="true" /> いつものカフェ
        </span>
        <div className={styles.friend}>
          <Image
            src="/assets/npc/presets/quiet-boy.png"
            alt="穏やかな表情の男の子の分身"
            fill
            sizes="(max-width: 640px) 28vw, 160px"
            className="object-contain"
          />
        </div>
        <div className={styles.character}>
          <Image
            src="/assets/npc/presets/cheerful-girl.png"
            alt="笑顔で手を差し伸べる女の子の分身"
            fill
            sizes="(max-width: 640px) 48vw, 280px"
            className="object-contain"
            preload
          />
        </div>
        <div className={styles.bubble}>
          <LuMessageCircle className="shrink-0" aria-hidden="true" />
          <span>今日は、どんなことがあった？</span>
        </div>
        <div className={styles.reply}>ちょっと、聞いてほしいな。</div>
      </div>
      <figcaption className={styles.caption}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LuSprout size={21} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold">何気ない会話が、あなたらしさに。</p>
          <p className="mt-1 text-xs text-base-content/60">
            話して、知って、少しずつ一緒に育っていく。
          </p>
        </div>
      </figcaption>
    </figure>
  );
}
