# ホームの室内マップ

2026-09-22の外観調整。部屋の床・壁・固定家具だけを更新し、所有アイテム、配置API、編集状態は既存のHome機能が担当します。

## 構成と差し替え

変更ファイル:

- `public/assets/maps/home-interior.json`
- `public/assets/map/tiles/home-sofa.png`（新規）
- `public/assets/map/tiles/home-coffee-table.png`（新規）
- `src/components/map/map-room-layer.tsx`（新規）
- `src/components/map/map-canvas.tsx`
- `src/components/map/map-layers.tsx`
- `src/components/map/map-types.ts`
- `src/components/map/map-validation.ts`
- `src/features/home/home-experience.module.css`
- `tests/home-map.test.mjs`
- `docs/home-map-art.md`（本書、新規）
- `docs/home-placement.md`
- `docs/immersive-maps.md`

- `public/assets/maps/home-interior.json`: 8列×7行のまま、セージ系のラグ、入口の石床、ソファ、ローテーブル、花のプランターを配置。12個の配置地点は維持（列4.199999999999999は4.2に正規化）。
- `room`: `wallHeight`（1〜3マス）、`wallColor`、`accentColor`、`trimColor`（すべて#RRGGBB）。省略時は外装を描画しないため、街・会場のJSONは変更不要。
- `map-room-layer.tsx`: 床の外縁に奥の二面の壁、窓枠・桟・窓台、巾木、床の厚みを描く。前面は開放。窓寸法は部屋のサイズから決める。所有アイテムやAPIの知識を持たない。
- `entities[].trimTransparent`: 任意のboolean。trueのローカル画像だけ、`visibleImageBounds`で透明余白を検出しUVを調整する。指定したwidth/heightは最大寸法として扱い、縦横比を維持。元PNGは加工しない。省略した既存素材の寸法解釈は変えない。
- 床・外装は通常の不透明ジオメトリ。家具と配置品は従来の列+行の描画順を維持する。壁に隠れる配置地点や、DOMの割合座標による家具配置は追加しない。
- Homeの左右パネルの最大幅を少し抑え、中央のマップ領域を広げた。768px未満の既存案内は維持。

## 新規画像

内蔵 image_gen を使用。生成PNGをそのまま次のパスへコピーした。既存素材の置換はしていない。

| パス | 内容 | サイズ | アルファ検査 |
| --- | --- | --- | --- |
| `public/assets/map/tiles/home-sofa.png` | セージ色の2人掛けソファ | 1416×1111 | RGBA、0〜255 |
| `public/assets/map/tiles/home-coffee-table.png` | マグカップ付き木製ローテーブル | 1536×1024 | RGBA、0〜254 |

四隅は透明。ソファの外周に最大alpha=1の微小値があり、通常のalphaTest=0.08で描画されない。テーブルの家具内部はおおむねalpha=253〜254で、完全不透明255への加工はしていない。透明部分にはRGB色が残るが、アルファ合成した背景ではハローや市松模様は表示されない。背景に重ねた画像と実際のWebGL表示で確認した。

### ソファの生成プロンプト

> Use case: stylized-concept. Asset type: transparent PNG furniture sprite for a cozy Japanese isometric pixel-art room game. Subject: ONE small two-seat sofa with muted sage green fabric cushions, warm honey oak frame and four short wooden legs, one cream cushion and one muted terracotta cushion. Isometric parallel projection viewed from above, front and right side visible, the long seat axis slopes down toward the right at about 27 degrees, like a classic isometric RPG bench. Crisp chunky finely shaded pixel art, warm brown outlines, restrained cozy palette, limited detail readable at 100px wide. No room, no floor tile, no rug, no wall, no accessories outside the sofa, no text, no logo, no border. Truly transparent RGBA background, NO baked-in checkerboard, NO white background, only a tiny contact shadow directly under feet. Center tightly framed with small transparent margin. Furniture game sprite, not a realistic 3D render.

### テーブルの生成プロンプト

> Use case: stylized-concept. Asset type: transparent PNG furniture sprite for a cozy Japanese isometric pixel-art room game. Subject: ONE small low rectangular honey oak coffee table with rounded corners and four short wooden legs, a tiny cream ceramic mug on a cork coaster on its top, otherwise empty. Isometric parallel projection viewed from above, front and right side visible, the long tabletop axis slopes down toward the right at about 27 degrees, matching a classic isometric RPG bench. Crisp chunky finely shaded pixel art, warm brown outlines, restrained cozy palette, limited detail readable at 80px wide. No room, no floor tile, no rug, no wall, no extra furniture, no books, no text, no logo, no border. Truly transparent RGBA background, NO baked-in checkerboard, NO white background, only tiny contact shadows directly under feet. Center tightly framed with small transparent margin. Furniture game sprite, not a realistic 3D render.

テーブルは初回出力を参照し、次の編集プロンプトでもう一度生成したものを採用した。

> Use case: background-extraction. Keep exactly this isometric pixel-art coffee table and cup, identical shape, colors, perspective, and pixel style. Remove ALL the diffuse amber glow, halo, haze, cast shadows, and background surrounding the table. Export a clean isolated game sprite on truly transparent RGBA background. All pixels outside the furniture silhouette must be alpha 0. The wooden table and mug must be fully opaque (alpha 255) within their silhouettes. No floor, no glow, no ground shadows, no vignette, no background. Tight framing with small clear transparent margin. Do not redesign the furniture.

## 検証範囲

- `node --test tests/map.test.mjs tests/home-map.test.mjs`: 14件成功。3マップの素材参照、12配置地点、互換性・空き判定、室内設定の範囲と色、透過余白設定の型、旧JSONとの互換性を確認。
- `next typegen`後のTypeScript検査とESLintを実行。
- 一時的な仮データページで同じMapCanvas・Home用CSSを使用し、1280×720と768×900でWebGL表示を確認。空の部屋、12地点すべてに品を置いた状態、編集ボタンの地点表示を確認。一時ページは削除済み。
- 開発サーバーには既存依存ライブラリ由来の `THREE.Clock` 非推奨警告が出る。ネットワーク制限でGoogle FontsのGeist/Geist Monoを取得できなかったため、描画確認ではフォールバックフォントを使用した。
- 実ログイン、実Home API/DBへの配置・収納保存、実NPCデータ、Dev Container内での起動、本番ビルドは未検証。上記の描画確認はこれらの動作保証には含まない。

この作業ツリーには依存がなかったため、メインチェックアウトの同一バージョンのnode_modulesを物理コピーし、リンク先をこの作業ツリー内へ作り直して検証した。依存の追加やロックファイル変更はない。
