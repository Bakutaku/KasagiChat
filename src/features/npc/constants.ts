/** NPC誕生オンボーディングで使う定数。 */

/**
 * 誕生会話の上限往復数。6往復目の応答でサーバーが自動的に会話を締めくくる。
 * 表示(「n/6 往復」)専用で、終了判定そのものはサーバーの status / finished に従う。
 */
export const BIRTH_MAX_TURNS = 6;

/**
 * 誕生演出が終わって「話す」ボタンを押せるようになるまでの待ち時間(ミリ秒)。
 * npc-birth.module.css のアニメーション長に手で合わせた値なので、
 * CSS側のタイミングを変えたらここも更新すること。
 */
export const AWAKENING_REVEAL_MS = 4800;
