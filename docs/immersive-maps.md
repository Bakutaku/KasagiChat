# 全画面マップ基盤

街の配色・人物表示・ホバー・会話開始前の確認UIの追加分は [town-map-interactions.md](town-map-interactions.md) を参照してください。以下は初期基盤の記録を含みます。

この実装は背景と薄いHUDの基盤です。Home機能、イベントの取得・参加状態、会話、カード、保存ストアは含みません。`codex/prototype-screens` はマージせず、マップ素材・JSONの床と置物・床模様と座標変換の描画方法だけを参照しています。

今回の指示に従い、描画はThree.js、768px未満もCanvas表示としています。`requirements.md` に残るPixiJS・PC限定の記述は更新していません。

## 画面の境界

| URL                 | mapId / JSON                               | 操作                        | アダプター                                         |
| ------------------- | ------------------------------------------ | --------------------------- | -------------------------------------------------- |
| `/home`             | `home-interior` / `home-interior.json`     | 固定カメラ                  | `src/app/(immersive)/home/page.tsx`                |
| `/map`              | `hoshikawa-town` / `hoshikawa-town.json`   | パン・ズーム・5スポット選択 | `src/app/(immersive)/map/page.tsx`、`town-map.tsx` |
| `/events/[eventId]` | `komorebi-lounge` / `komorebi-lounge.json` | 固定カメラ                  | `src/app/(immersive)/events/[eventId]/page.tsx`    |

`(immersive)` はURLを変更しないルートグループです。共通のルートレイアウトを継承し、各画面のシェルが全画面とヘッダーを所有します。Homeは既存の `(navigation)` から移しました。

作業開始時のmainにはイベント一覧・作成・参加確認のページはありませんでした。今回はそれらのprototype機能や仮フォームを追加していません。今後追加する際は `(navigation)` に置き、既存の通常レイアウトを利用してください。`/events` 全体を全画面レイアウトで囲っていないため、会場以外にマップは適用されません。会場はUUID形式のIDだけを受け付けますが、実イベントの存在・参加権限はまだ検証していません。

## 公開インターフェース

画面からは `@/components/map` を参照します。

```tsx
import {
  ImmersiveMapShell,
  type MapSceneId,
  type RuntimeMapCharacter,
  type MapSpot,
} from "@/components/map";

// APIレスポンスから画面側で変換する例。固定JSONへ書き込みません。
const characters: RuntimeMapCharacter[] = [
  {
    id: "participant-id",
    src: "/assets/npc/presets/画像.png",
    name: "表示名",
    column: 3,
    row: 4,
  },
];
```

上の画像パスは書式例です。実際にはAPI等から解決した存在する画像パスを渡してください。

- `MapSceneId`: `home-interior | hoshikawa-town | komorebi-lounge`。
- `ImmersiveMapShell`: `mapId`、`interaction: "fixed" | "explore"`、`paused?`、`characters?`、`onSelect?: (spot: MapSpot | null) => void`、HUDの`children?`。
- `RuntimeMapCharacter`: `id`、画像の`src`、表示名の`name`、`column`、`row`。現在の3画面は空配列を渡し、サンプル参加者を生成しません。
- `MapSpot`: `id`、`name`、座標、`entityId`。選択は通知だけです。遷移先や会話開始の判断は画面側に置きます。街の初版は選択名をHUDに表示します。

## 責務と差し替え先

| ファイル（`src/components/map/`）        | 責務                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `index.ts`、`map-types.ts`               | 公開境界と固定マップ・実行時キャラクターの型                                              |
| `map-registry.ts`                        | 許可されたマップIDと画面名。ルート固有の条件やAPIを持たない                               |
| `map-validation.ts`                      | JSONの型・サイズ・ID・座標・凡例・素材・スポット参照の純粋検証                            |
| `map-loader.ts`                          | 一覧の読込後、選択されたJSONだけを取得。fetchとAbortSignalを注入可能                      |
| `map-geometry.ts`                        | 座標変換・画面サイズに応じたカメラ計算・クリックとドラッグの判定                          |
| `map-canvas.tsx`                         | クライアント側のThree.js初期化、カメラ、操作モード、停止、WebGL判定とコンテキスト喪失通知 |
| `map-input.tsx`                          | Pointer Eventsを純粋なタップ判定へ渡し、Raycasterでスポット選択                           |
| `map-layers.tsx`、`floor-texture.ts`     | 固定の床・置物と、渡された実行時キャラクターの描画                                        |
| `map-error-boundary.tsx`                 | 未登録ID・取得失敗・不正JSON・WebGL非対応等の共通エラー表示と再試行                       |
| `immersive-map-shell.tsx`、`.module.css` | 全画面、遅延読込、HUD、浮遊ヘッダーの配置                                                 |

描画方式を変える場合は `map-canvas.tsx` 以下を差し替えます。JSONの形式と画面のpropsを維持すれば、APIや画面側の作り直しを抑えられます。`NavigationHeader` は配置用classNameとメニュー開閉通知だけを追加し、ロゴ・テーマ・既存リンクをそのまま再利用しています。通常画面のヘッダースタイルは維持しています。

## JSONを変更する

`public/assets/maps/index.json` がIDとファイル名を対応させます。起動時に3つのJSONを一括取得せず、現在の `mapId` の1ファイルだけを読みます。未選択マップの破損が別画面を巻き込まず、追加マップの数に比例して初期通信量が増えません。ルート変更・再試行時は古い要求をAbortControllerで中断します。

JSONの固定データは `version: 1`、`id`、`name`、`description`、`size`、`floor.legend`、`floor.rows`、`entities`、`spots` です。`floor.rows` の各文字が床の凡例を指します。最大100×100マス、置物1,000件、スポット100件、JSONはUTF-8で1MBまで検証します。一覧のファイル名は同一ディレクトリのJSONだけを許可します。

`entities` は素材の `sprite` と位置・寸法を指定します。家はoak／carpet／limestoneの床と専用ソファ・ローテーブル・既存planterを使い、任意の `room` で壁・窓・床の厚みを描画します。`trimTransparent: true` の置物は透明余白を除いて指定寸法内へ比率を保って収めます。室内外装・新素材の詳細は [home-map-art.md](home-map-art.md) を参照してください。`spots[].entityId` は選択対象の置物を参照します。キャラクターや参加者は実行中に変わるため、JSONの `npcs`・`characters` は受け付けません。

同じ場所の模様替えはJSONだけを編集します。新しいマップはJSONを追加し、一覧と `mapRegistry` にIDを登録してください。新しい画面は薄いアダプターを追加し、`mapId`、操作モード、実行時キャラクター、HUDを宣言します。APIレスポンスを `RuntimeMapCharacter[]` に変換する責務もその画面側に置きます。共通シェルへHome・イベントの条件分岐を追加する必要はありません。

## 描画・オーバーレイ・入力

`next/dynamic` の `ssr: false` をClient Component内で指定しています。WebGL、window、床模様生成用canvasはサーバーで初期化できないためです。画面はDOMのヘッダー／HUDと、ブラウザで初期化するCanvasに分かれています。

会話等のオーバーレイを追加するときは、所有する画面が `paused={overlayOpen}` を渡します。シェルは背景を残したまま `frameloop="never"`、Controls無効化、選択リスナー解除、入力領域のinert化を行います。解除するとdemand描画に戻り、再描画を要求します。ヘッダーのモバイルメニュー中も停止します。常時アニメーションや参加者の自律移動はありません。

PCでは左ドラッグでパン、ホイールでズーム。タッチでは1本指でパン、2本指でピンチズームとパンを行います。回転は無効です。往復ドラッグや複数指操作の後を選択クリックにしないよう判定します。キーボード利用者にはフォーカス時に表示するスポットボタンを用意しています。

固定モードにはControlsを作りません。768px未満でもCanvasを維持し、縦横サイズに合わせて同じマップを縮小します。DPRは全画面で最大1.5、アンチエイリアスは無効、通常時はdemand描画です。端末ごとの見え方とタッチ感度は実機確認が必要です。

## 検証と未確認事項

2026-09-21の実装時点で、既存の依存関係を利用して次を実施しました。

- `node --test tests/map.test.mjs`: 8件成功。3マップと参照素材、壊れたJSON、一覧の安全なファイル参照、選択JSONだけの取得、失敗・中断、座標・モバイル向けカメラ計算、ドラッグ／ピンチとタップの区別。
- `node node_modules/eslint/bin/eslint.js src/components/map src/components/layout/navigation-header.tsx "src/app/(immersive)" tests`: 成功。
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: 失敗。古い `.next/types/validator.ts` が移動前の `(navigation)/home/page.tsx` を参照。ソース側で検出された型エラーは修正済みですが、全体の型検査成功とはしていません。生成ファイルの削除・再生成や別設定による回避は未実施。
- ロックファイルは `pnpm install --lockfile-only --offline --ignore-scripts` で更新。node_modulesの再インストールや依存取得のためのネットワーク接続はしていません。

Dev Container、dev server、ブラウザ、OAuthログイン、手動操作、Next本番ビルド、実API、ログイン後の遷移、WebGL実描画、タッチ操作は未実施・未確認です。共通境界のReact上の表示／再試行と実際のGPU初期化も静的確認のみです。
