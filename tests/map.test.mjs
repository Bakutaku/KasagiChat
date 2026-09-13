import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { loadTypescript } from "./load-typescript.mjs";

const { parseMapPreset, parseMapPresetIndex, loadMapCatalog } = loadTypescript(
  "src/components/map/map-loader.ts",
);
const { toWorld, fromWorld } = loadTypescript(
  "src/components/map/map-geometry.ts",
);
const { placeGuests } = loadTypescript("src/components/map/map-operations.ts");
const { previewCharacters, groundTextureFiles } = loadTypescript(
  "src/components/map/map-assets.ts",
);
const { systemNpcCatalog } = loadTypescript("src/components/map/map-data.ts");
const json = readFileSync("public/assets/maps/hoshikawa-town.json", "utf8");

test("街のプリセットと必要素材を読み込め、全タイル中心が座標変換を往復する", () => {
  const map = parseMapPreset(json, "hoshikawa-town");
  assert.equal(map.ground.length, map.size.columns * map.size.rows);
  for (const cell of map.ground) {
    const [x, , z] = toWorld(cell, map.size);
    assert.deepEqual(fromWorld(x, z, map.size), {
      column: cell.column,
      row: cell.row,
    });
  }
  const images = [
    ...Object.values(groundTextureFiles),
    ...map.entities.map((item) => `/assets/map/tiles/${item.sprite}.png`),
    ...previewCharacters.map((item) => item.src),
    ...Object.values(systemNpcCatalog).map((item) => item.src),
  ];
  for (const image of images) assert.ok(existsSync(`public${image}`), image);
  const guests = placeGuests(map, previewCharacters);
  assert.equal(guests.length, previewCharacters.length);
  for (const guest of guests)
    assert.ok(
      map.ground.some(
        (cell) =>
          cell.column === guest.column &&
          cell.row === guest.row &&
          cell.spawnAllowed,
      ),
    );
});

test("不正なマップ・重複ID・外部ファイル参照を拒否する", () => {
  assert.throws(() => parseMapPreset("{"));
  assert.throws(() => parseMapPreset(json, "wrong-id"));
  const map = JSON.parse(json);
  map.entities[1].id = map.entities[0].id;
  assert.throws(() => parseMapPreset(JSON.stringify(map)));
  assert.throws(() =>
    parseMapPresetIndex(
      JSON.stringify({
        version: 1,
        defaultMapId: "town",
        maps: [{ id: "town", file: "../secret.json" }],
      }),
    ),
  );
});

test("マップ一覧を取得し、読込失敗を画面側へ返す", async () => {
  const catalog = await loadMapCatalog(async (url) => ({
    ok: true,
    status: 200,
    text: async () => readFileSync(`public${url}`, "utf8"),
  }));
  assert.ok(catalog.maps.some((item) => item.id === "hoshikawa-town"));
  await assert.rejects(
    () =>
      loadMapCatalog(async () => ({
        ok: false,
        status: 404,
        text: async () => "",
      })),
    /404/,
  );
});
