# ホームのアイテム配置

## 表示と操作

- 通常時は配置済み画像だけを部屋に描画する。未配置一覧・空き地点・品名ラベル・選択枠・収納操作は表示しない。
- 「編集」で未配置一覧と配置地点を表示。同じ種類の空き地点だけが配置可能になる。
- 配置・移動・収納は既存APIでその都度保存。「完了」は編集モードを閉じ、選択・エラー表示を解除する。変更取消の意味ではない。
- 保存中は二重送信・選択変更・完了を抑止する。保存後は詳細欄、完了後は編集ボタンへフォーカスを戻す。
- 「いまの見た目」のプリセットID、「関連する会話」の会話IDは画面に表示しない。
- 768px未満では従来のPC向け案内を維持。768〜1099pxでは左の分身パネルを省略し、部屋と操作パネルの幅を確保する。

## 責務と座標

| ファイル | 役割 |
| --- | --- |
| `public/assets/maps/home-interior.json` | マップサイズ8列×7行と12個の静的な `placementAnchors` |
| `src/components/map/map-types.ts` / `map-validation.ts` | 地点の型、範囲・重複・寸法の検証。地点なしの既存マップも読み込み可能 |
| `src/features/home/home-map-adapter.ts` | APIスロットIDと地点IDの対応、配置済みアイテムの描画データ、互換性・空き判定 |
| `src/components/map/map-object-layer.tsx` | 同じ `toWorld`・カメラ上で画像と編集ボタンを描画。APIには依存しない |
| `src/components/map/map-image-bounds.ts` | 透過余白の検出。画像ファイルを加工せずUV・比率を調整し、底辺を接地させる |
| `src/features/home/home-item-artwork.tsx` | 一覧・詳細画像、読み込み失敗時の画像切替 |
| `src/features/home/home-experience.tsx` / `.module.css` | 編集モード、API更新、詳細・一覧・画面レイアウト |

`BOOKSHELF_1`〜`6` は `bookshelf-1`〜`6`（行0、列0〜7の1.4刻み）。
`DISPLAY_1`〜`3` は左端の列0、`DISPLAY_4`〜`6` は右端の列7、それぞれ行2.2・4.1・6。
各地点の `width` / `height` は床1マスを1とする画像の最大寸法。
`toWorld` がマップ寸法から中心原点のXZ座標へ変換し、既存の固定カメラを使う。
背景家具と同じ列+行による描画順を使う。画面上の固定pxや割合位置でアイテムを配置しない。
静的JSONにはユーザー名・所有状態・獲得した品名を持たせない。

## 画像アセット

`HomeItem.imagePath` はBOOKを含め優先する。未指定・空文字・画像ロード失敗時は以下のローカルPNGを使う。
WebGLの画像読込には配信元のCORS許可が必要で、許可がない画像もフォールバック対象となる。

| アセット | 内容 | 生成時サイズ |
| --- | --- | --- |
| `public/assets/home/items/memory-books.png` | セージ色・赤茶色の本の山 | 1374×1145 |
| `public/assets/home/items/ceramic-bird.png` | 木製台座に載せた陶器の鳥 | 1254×1254 |

内蔵 image_gen で生成。両画像ともアルファ値0〜255を持つ実際の透過PNGであることを確認済み。
同じアイソメトリック視点・落ち着いた色・ピクセル調に合わせた。

生成プロンプト（本）:

> Use case: stylized-concept. Asset type: transparent PNG sprite for a cozy Japanese isometric pixel-art room game. Create ONE small stack of three closed hardback memory journals on the floor, sage teal and warm rust cloth covers, cream paper, small brass corner detail, no letters. Isometric three-quarter view from above with parallel projection, visible top and two sides, chunky finely shaded pixel-art like a handcrafted wooden park bench in a cozy town RPG. The stack is the only object, no room, no floor tile, no border, no UI, no logos, no text. Truly transparent alpha background, no checkerboard baked in, very subtle contact shadow only beneath the object. Center object, tightly framed with a small transparent margin. Warm brown outlines, restrained muted colors, crisp readable silhouette at 48px game size.

生成プロンプト（鳥）:

> Use case: stylized-concept. Asset type: transparent PNG sprite for a cozy Japanese isometric pixel-art room game. Create ONE small souvenir: a warm cream ceramic bird figurine with a sage teal wing and tiny golden beak, sitting on a small walnut wooden plinth. Isometric three-quarter view from above, parallel projection, top and two sides visible, finely shaded chunky pixel art matching handcrafted wooden furniture in cozy town RPGs. Quiet nostalgic handcrafted look, warm brown contours and muted colors, readable at 48px. Single object only, NO floor tile, room, text, logo, UI, border, or checkerboard. Truly transparent alpha background, small soft contact shadow underneath only. Centered tightly framed object with small transparent margins.

## 検証

`node --test tests/map.test.mjs tests/home-map.test.mjs` で、既存マップ・12地点対応・不正な地点・互換性・移動/収納後の空き状態・透過余白の境界を確認する。
TypeScript・全体lintも実行。ブラウザでは一時的な仮データページを使い、通常/編集表示、キーボードでの配置・収納・完了とフォーカス復帰、画像フォールバック、768pxの配置を確認した。
一時ページは成果物には含めない。実ログイン・実API/DB永続化・Dev Container内起動・本番ビルドはこの検証に含まない。

検証には手元の同一バージョンの依存パッケージを使用した。開発サーバーには `THREE.Clock` 非推奨と Three.js 多重読込の警告が出たが、仮データの描画・操作は確認できた。これらの依存環境の警告は今回の変更では解消していない。
