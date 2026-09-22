import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { loadTypescript } from "./load-typescript.mjs";

const { homeMapObjects, homeAnchorId, homeItemImage, homeItemFallbacks, availableHomeSlots } = loadTypescript("src/features/home/home-map-adapter.ts");
const { parseMapDocument } = loadTypescript("src/components/map/map-validation.ts");
const { visibleImageBounds } = loadTypescript("src/components/map/map-image-bounds.ts");
const source = () => JSON.parse(readFileSync("public/assets/maps/home-interior.json", "utf8"));
const parse = (value) => parseMapDocument(JSON.stringify(value), "home-interior");
const slots = ["BOOKSHELF", "DISPLAY"].flatMap((prefix) => Array.from({ length: 6 }, (_,i) => ({ slotId: `${prefix}_${i + 1}`, acceptedKind: prefix === "BOOKSHELF" ? "BOOK" : "SOUVENIR" })));
const book = { topicId: 1, kind: "BOOK", displayName: "読書の思い出", imagePath: null, slotId: null };

test("APIの全12スロットがhome-interior内の重複しない静的地点に対応する", () => {
  const document = parse(source());
  assert.deepEqual(document.placementAnchors.map(a => a.id).sort(), slots.map(s => homeAnchorId(s.slotId)).sort());
  assert.equal(new Set(document.placementAnchors.map(a => `${a.column}:${a.row}`)).size, 12);
  assert.ok(document.placementAnchors.every(a => a.column <= 7 && a.row <= 6));
});

test("壊れた配置地点を拒否し、既存の地点なしマップも読める", () => {
  for (const mutate of [
    d => d.placementAnchors.push(d.placementAnchors[0]),
    d => d.placementAnchors[0].column = 8,
    d => d.placementAnchors[0].height = 0,
    d => d.placementAnchors[0].width = Infinity,
    d => d.placementAnchors[0].label = "",
  ]) {
    const value = source(); mutate(value); assert.throws(() => parse(value));
  }
  const value = source(); delete value.placementAnchors;
  assert.deepEqual(parse(value).placementAnchors, []);
});

test("室内外装と透過余白設定を検証し、指定のない既存マップも読める", () => {
  const document = parse(source());
  assert.equal(document.room.wallHeight, 1.9);
  assert.equal(document.entities.find(e => e.sprite === "home-sofa").trimTransparent, true);
  const legacy = source();
  delete legacy.room;
  legacy.entities.forEach(e => delete e.trimTransparent);
  const parsed = parse(legacy);
  assert.equal(parsed.room, undefined);
  assert.ok(parsed.entities.every(e => e.trimTransparent === undefined));
  for (const mutate of [
    d => d.room = null,
    d => d.room.wallHeight = 0,
    d => d.room.wallHeight = 4,
    d => d.room.wallColor = "ivory",
    d => d.room.accentColor = "#fff",
    d => delete d.room.trimColor,
    d => d.entities[0].trimTransparent = "true",
  ]) {
    const value = source(); mutate(value); assert.throws(() => parse(value));
  }
});

test("収納中の品は描画せず、BOOKでもAPI画像を優先してローカル画像を用意する", () => {
  assert.deepEqual(homeMapObjects([book]), []);
  const placed = { ...book, slotId: "BOOKSHELF_2", imagePath: "/custom-book.png" };
  assert.equal(homeItemImage(placed), "/custom-book.png");
  const [object] = homeMapObjects([placed]);
  assert.equal(object.anchorId, "bookshelf-2");
  assert.equal(object.fallbackSrc, homeItemFallbacks.BOOK);
  for (const kind of ["BOOK", "SOUVENIR"]) {
    const image = homeItemImage({ ...book, kind, imagePath: "  " });
    assert.ok(existsSync(`public${image}`));
  }
});

test("配置先は同種の空きだけに限定し、移動・収納後の状態に追従する", () => {
  const placed = { ...book, slotId: "BOOKSHELF_1" };
  assert.equal(availableHomeSlots(slots, [placed], null).length, 0);
  assert.deepEqual(availableHomeSlots(slots, [placed], placed).map(s=>s.slotId), slots.slice(1,6).map(s=>s.slotId));
  const moved = { ...placed, slotId: "BOOKSHELF_2" };
  assert.ok(availableHomeSlots(slots, [moved], moved).some(s=>s.slotId === "BOOKSHELF_1"));
  assert.equal(availableHomeSlots(slots, [book], book).length, 6);
  const full = slots.slice(0,6).map((slot,i)=>({...book, topicId:i+1, slotId:slot.slotId}));
  assert.equal(availableHomeSlots(slots, full, book).length, 0);
});

test("透過余白を除いて足元と比率を合わせ、透明画像もゼロ寸法にしない", () => {
  const data = new Uint8ClampedArray(4 * 5 * 4);
  data[(1 * 4 + 1) * 4 + 3] = 255;
  data[(3 * 4 + 2) * 4 + 3] = 255;
  data[3] = 2;
  assert.deepEqual(visibleImageBounds(data, 4, 5), { left: 1, top: 1, width: 2, height: 3 });
  assert.deepEqual(visibleImageBounds(new Uint8ClampedArray(16), 2, 2), { left: 0, top: 0, width: 2, height: 2 });
});
