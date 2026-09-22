# 街の配色と会話への案内

2026-09-22。`/map` の街を調整。会話のAPI・transport・状態管理・再同期処理は変更していません。

## 配色・装飾

- `public/assets/maps/hoshikawa-town.json`: 草は淡いセージ、道は砂色、石畳はアイボリー、川は淡い青緑。既存のテクスチャを残し、色の強さを抑えています。
- `floor.legend.*.tone = { color: "#RRGGBB", mix: 0〜1 }`: 画像の上へ指定色を混ぜる任意設定。既存の`color`は従来どおり乗算です。明度を上げる調整には`tone`を使います。指定がない家・会場の床は従来どおりです。
- `backdrop`: 街だけに指定する箱庭外装。`baseThickness`で床下の厚みを作り、`height`と3色でカメラ奥二面の空・遠景・丘を描きます。室内用の`room`とは併用しません。
- `map-layers.tsx`: 調色は元画像のコピーに対して行い、素材と調色設定の組ごとにテクスチャを共有。描画終了時に破棄します。元PNGやロード済み画像を書き換えません。
- 花壇・プランター・川沿いのベンチ・街灯・木を計8点追加し、北側の建物前に石畳を追加。5つのスポットと橋・川の配置は維持しました。

## マップ画像の再作成

2026-09-22、元画像の端に建物・樹木・別オブジェクトの断片が接していたため、内蔵 `image_gen` で街マップの12素材を再作成しました。

- 対象: `lobby`、`office`、`cafe`、`home`、`bridge`、`fountain`、`tree`、`bench`、`lamp`、`planter`、`flowerbed`、`fence`。
- 出力はすべて384×256のRGBA PNG。生成画像をアスペクト比を保って縮小・中央配置し、低アルファの光彩を除いて四周を完全透過にしました。
- `hoshikawa-town.json` の全置物に `trimTransparent: true` を指定。安全な透明余白を素材側に残しつつ、描画時は可視範囲を既存の `width` / `height` 内へ収めます。

共通プロンプト:

> Use case: precise-object-edit. Asset type: transparent PNG sprite for the KasagiChat isometric town map. Recreate the same intended building or prop from the reference in cozy finely shaded isometric pixel art. Center one complete object with a clearly transparent safety margin on every side. Remove clipped neighboring fragments, stray colored pixels, colored outlines, halos, glow, and edge artifacts. No visible pixel may touch the canvas boundary. Truly transparent RGBA background; no floor tile, scene background, extra object, text, logo, UI, border, checkerboard, or watermark. Crisp readable silhouette at small game-map size.

各画像では上記に、元素材の建物・家具・植栽・色・視点を維持する対象説明と、「屋根、煙突、脚、支柱、花先など対象全体を表示する」という制約を加えました。

## 選択・ホバー・会話の境界

| ファイル | 責務 |
| --- | --- |
| `src/features/town/town-map-presentation.ts` | 既存の`PRACTICE_SCENES`を参照して、相手名・画像・説明とシステムNPCの表示位置を組み立てる。家と広場は会話シーンを持たない |
| `src/features/town/town-visit-dialog.tsx` | 相手名・場所・練習内容と明示的な開始ボタンを持つ、daisyUIのネイティブdialog |
| `src/app/(immersive)/map/town-map.tsx` | 選択と開始を別々のstateで保持。確定時だけ既存`ConversationSession`をマウントする |
| `src/components/map/map-input.tsx` | スポット／人物をRaycasterで判定。選択とホバーを通知するだけで、APIや遷移先を知らない |
| `src/components/map/map-target-overlay.tsx` / `.module.css` | ホバー／フォーカス時の名前・説明・状態・操作案内、キーボードの対象一覧 |
| `src/components/map/map-canvas.tsx` / `map-layers.tsx` | 人物IDを選択判定へ渡し、人物画像の透明余白を除いて指定寸法内へ収める |
| `src/components/map/map-types.ts` / `map-validation.ts` | 調色設定の型・検証、表示用の`MapTargetDetails`とホバー通知の型 |
| `src/components/map/immersive-map-shell.tsx` / `index.ts` | `spotDetails`・`onSelectCharacter`の公開境界と、背景の停止・再開 |

NPCも建物も、選ぶとまず案内を表示します。「会話をはじめる」で初めて会話開始／再開の既存処理へ進みます。分身の取得中・取得失敗時は開始を無効にします。家には帰宅ボタン、広場には準備中の案内を表示します。

会話相手は既存のシステムプリセット3人です。APIで取得する本人の分身は会話の見守り役のままです。静的JSONにはNPC・参加者名・参加状態を追加せず、人物は画面側から`RuntimeMapCharacter[]`として渡します。

確認中は既存の`paused`を使ってCanvas描画と操作を停止します。ネイティブ`showModal()`で背景へのフォーカス移動を抑え、Escape・閉じる・背景のクリックでキャンセルできます。キーボードから開いた場合は、inert化する前に選択元を記録し、キャンセル後に戻します。対象一覧のDOMを残すのはこのためです。

ホバーはマウス／ペンで案内を表示し、ドラッグ・ピンチ中は抑制します。キーボードフォーカスでも同じ情報を表示し、Escapeで消せます。タッチでは選択後の案内画面で内容を確認できます。

## 検証

- Next.js 16.3.4の当該worktreeのローカルガイド（Client Components、lazy loading、CSS、画像）を確認して実装。
- `next typegen`、`tsc --noEmit --incremental false`、変更箇所のESLint、`git diff --check`。
- `node --test tests/*.test.mjs`: 22件。追加した3件は調色の入力検証と旧JSON互換、人物／建物／会話シーン・実在画像・歩ける地点の整合、家・広場・未知の対象の非会話扱い。
- ローカルのNext devをwebpackで起動し、ブラウザでWebGL描画、既存素材の重なり、システムの暗いテーマとLightテーマを確認。1280×800と390×844でマップと案内を表示し、狭い画面でボタン・説明が収まることを確認。
- NPCのクリック、キーボードの対象選択と説明表示、Escapeでキャンセル、選択元へのフォーカス復帰、ドラッグが会話選択にならないことを確認。
- 未ログイン時の取得エラーと開始ボタン無効化を確認。その後、一時的なローカルモックに`API_PROXY_ORIGIN`を向けて開始タイミングを検証。案内を複数回開いてキャンセルしてもPOSTは0件、開始ボタンの操作後は1件で、既存会話画面がモックの会話本文を表示。モックと検証サーバーは終了後に停止。

実ログイン、実APIでの会話開始・送信・再開・振り返り、DB保存、外部LLM、Dev Containerでの起動、本番ビルド、実機タッチ／ピンチは未検証です。Google Fontsはネットワーク制限により取得できず、ブラウザ確認はフォールバックフォントでした。既存依存由来の`THREE.Clock`非推奨警告は残っています。

依存のオフラインインストールはキャッシュ不足とネットワーク制限で完了しなかったため、同じHEAD・依存バージョンのmain側から`node_modules`の実ファイルをこのworktreeへ複製し、リンクもworktree内に解決して検証しました。依存定義・ロックファイルの変更はありません。
