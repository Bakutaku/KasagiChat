"use client";

import Image from "next/image";
import { useState } from "react";
import type { CSSProperties, SubmitEvent } from "react";
import { LuCheck, LuLoaderCircle, LuSparkles } from "react-icons/lu";
import ErrorAlert from "@/components/feedback/error-alert";
import { NPC_PRESETS, presetImagePath } from "@/features/npc/presets";
import styles from "./npc-birth.module.css";

/** 名前の最大文字数。サーバーの検証は 1〜30 文字。 */
const MAX_NAME_LENGTH = 30;

/**
 * [setup] 見た目(プリセット)と名前を選んでNPCを作成するフォーム。
 *
 * 入力値はこの画面から先へ持ち越さないため、フックに載せずローカルstateで持つ。
 * 作成そのものは親(useNpcBirthFlow)に任せ、ここは入力と表示だけを担当する。
 *
 * 名前入力と送信ボタンは「プリセット未選択のうちは畳んでおく」だけで常にマウントし、
 * 高さと不透明度をCSS(collapsible)で補間する。要素が突然現れて表示が跳ねるのを防ぐため。
 */
export default function NpcSelect({
  isCreating,
  error,
  onSubmit,
}: {
  isCreating: boolean;
  error: string | null;
  onSubmit: (presetId: string, name: string) => void;
}) {
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [npcName, setNpcName] = useState("");

  // プリセットを選ぶまでは名前の入力欄を開かない。
  const isNamingOpen = selectedPresetId !== "";

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(selectedPresetId, npcName);
  }

  return (
    <section
      className={`${styles.birthScene} relative isolate grid min-h-screen place-items-center overflow-hidden px-5 py-12`}
    >
      <div className={`${styles.starRiver} -z-10`} aria-hidden="true" />

      <form
        className="flex w-full max-w-3xl flex-col items-center text-center"
        onSubmit={handleSubmit}
      >
        <h1
          className={`${styles.revealLine} text-xl font-black sm:text-2xl`}
          style={{ animationDelay: "0.1s" }}
        >
          あなたの分身を迎えよう
        </h1>
        <p
          className={`${styles.revealLine} mt-2 text-sm text-base-content/60`}
          style={{ animationDelay: "0.3s" }}
        >
          見た目をひとつ選んで、名前をつけてください。
        </p>

        {/* orbは演出そのものなので、余白は外側のラッパーで付ける */}
        <div className="mt-8 flex justify-center">
          <div className={styles.orb}></div>
        </div>

        {/* 作成中は fieldset ごと無効化して入力を止める */}
        <fieldset disabled={isCreating} className="mt-14 w-full">
          <legend className="sr-only">分身の見た目と名前</legend>

          {/* プリセット一覧: 非表示のradio + カード表示。選択状態は peer-checked でスタイリング */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {NPC_PRESETS.map((preset, index) => (
              <label
                key={preset.id}
                className={`${styles.presetItem} cursor-pointer`}
                style={{ "--delay": `${0.45 + index * 0.09}s` } as CSSProperties}
              >
                <input
                  className={`${styles.presetInput} peer sr-only`}
                  type="radio"
                  name="preset"
                  value={preset.id}
                  checked={selectedPresetId === preset.id}
                  onChange={() => setSelectedPresetId(preset.id)}
                />
                <span
                  className={`${styles.presetCard} card relative block h-full overflow-hidden border border-base-300/80 bg-base-100/85 backdrop-blur-sm peer-checked:border-primary peer-checked:bg-base-100 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50`}
                >
                  <span
                    className={`${styles.presetCheck} absolute top-2 right-2 z-10 grid size-6 place-items-center rounded-full bg-primary text-primary-content shadow`}
                    aria-hidden="true"
                  >
                    <LuCheck className="size-4" />
                  </span>
                  <span className="relative block aspect-2/3 overflow-hidden bg-base-200">
                    <Image
                      src={presetImagePath(preset.id)}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 160px, (min-width: 640px) 200px, 46vw"
                      className="object-contain object-bottom"
                    />
                  </span>
                  <span className="card-body gap-1 p-3">
                    <span className="text-sm font-bold">{preset.name}</span>
                    <span className="text-xs leading-5 text-base-content/55">
                      {preset.description}
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>

          {/* 名前入力と送信ボタン。畳んでいる間は inert でフォーカスも当たらないようにする */}
          <div
            className={`${styles.collapsible} ${isNamingOpen ? styles.collapsibleOpen : ""}`}
          >
            <div className={styles.collapsibleInner} inert={!isNamingOpen}>
              <label className="mx-auto mt-6 block max-w-md text-left">
                <span className="mb-2 block font-bold">この子の名前は?</span>
                <input
                  className="input input-bordered w-full"
                  type="text"
                  value={npcName}
                  onChange={(event) => setNpcName(event.target.value)}
                  placeholder="例: ひかり"
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="off"
                  required
                />
                <span className="mt-2 block text-right text-xs text-base-content/50">
                  {npcName.length}/{MAX_NAME_LENGTH}
                </span>
              </label>

              {/* btnは inline-flex なので、中央寄せはラッパーのflexで行う */}
              <div className="mt-5 flex justify-center">
                <button
                  className="btn btn-primary btn-lg min-w-64"
                  type="submit"
                  disabled={!npcName.trim()}
                >
                  {isCreating ? (
                    <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <LuSparkles aria-hidden="true" />
                  )}
                  {isCreating ? "光を結んでいます…" : "この子を迎える"}
                </button>
              </div>
            </div>
          </div>
        </fieldset>

        {error && (
          <ErrorAlert message={error} className="mt-5 max-w-md text-left" />
        )}
      </form>
    </section>
  );
}
