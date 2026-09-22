import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { loadTypescript } from "./load-typescript.mjs";

const { parseMapIndex, parseMapDocument, isInside } = loadTypescript(
  "src/components/map/map-validation.ts",
);
const { loadMap } = loadTypescript("src/components/map/map-loader.ts");
const { mapRegistry, isMapSceneId } = loadTypescript(
  "src/components/map/map-registry.ts",
);
const { toWorld, cameraZoom, beginTap, moveTap, isTap } = loadTypescript(
  "src/components/map/map-geometry.ts",
);
const read = (id) => readFileSync(`public/assets/maps/${id}.json`, "utf8");
const home = () => JSON.parse(read("home-interior"));
const town = () => JSON.parse(read("hoshikawa-town"));
const parseHome = (value) =>
  parseMapDocument(JSON.stringify(value), "home-interior");
const index = parseMapIndex(read("index"));

test("登録された3つのマップと素材が存在し、実行時キャラクターを含まない", () => {
  assert.deepEqual(
    index.maps.map((entry) => entry.id).sort(),
    Object.keys(mapRegistry).sort(),
  );
  for (const entry of index.maps) {
    const map = parseMapDocument(
      readFileSync(`public/assets/maps/${entry.file}`, "utf8"),
      entry.id,
    );
    assert.equal(map.ground.length, map.size.columns * map.size.rows);
    assert.equal("characters" in map, false);
    assert.equal("npcs" in map, false);
    for (const entity of map.entities)
      assert.ok(existsSync(`public/assets/map/tiles/${entity.sprite}.png`));
    for (const floor of map.ground)
      if (["grass", "stone", "dirt", "water"].includes(floor.sprite))
        assert.ok(existsSync(`public/assets/map/floor/${floor.sprite}.png`));
  }
  assert.equal(
    parseMapDocument(read("hoshikawa-town"), "hoshikawa-town").spots.length,
    5,
  );
});

test("街は厚い土台と屋外遠景を持ち、室内外装とは併用しない", () => {
  const document = parseMapDocument(read("hoshikawa-town"), "hoshikawa-town");
  assert.equal(document.backdrop.baseThickness, 0.52);
  assert.equal(document.backdrop.height, 3.2);
  assert.equal(document.room, undefined);
  for (const mutate of [
    (d) => { d.backdrop.height = 0; },
    (d) => { d.backdrop.baseThickness = 1.1; },
    (d) => { d.backdrop.skyColor = "skyblue"; },
    (d) => { delete d.backdrop.landscapeColor; },
    (d) => { d.room = home().room; },
  ]) {
    const value = town();
    mutate(value);
    assert.throws(
      () => parseMapDocument(JSON.stringify(value), "hoshikawa-town"),
      String(mutate),
    );
  }
  const legacy = town();
  delete legacy.backdrop;
  assert.equal(
    parseMapDocument(JSON.stringify(legacy), "hoshikawa-town").backdrop,
    undefined,
  );
});

test("一覧のパストラバーサル・重複・空一覧を拒否する", () => {
  for (const maps of [
    [],
    [{ id: "home-interior", file: "../home-interior.json" }],
    [index.maps[0], index.maps[0]],
    [
      { id: "a", file: "a.json" },
      { id: "b", file: "a.json" },
    ],
  ]) {
    assert.throws(() => parseMapIndex(JSON.stringify({ version: 1, maps })));
  }
});

test("不正JSON・サイズ・床・素材・重複・座標・固定参加者を拒否する", () => {
  assert.throws(() => parseMapDocument("{", "home-interior"));
  assert.throws(() =>
    parseMapDocument(read("home-interior"), "hoshikawa-town"),
  );
  const corruptions = [
    (d) => {
      d.version = 2;
    },
    (d) => {
      d.size.columns = 1.5;
    },
    (d) => {
      d.size.rows = 101;
    },
    (d) => {
      d.floor.rows.pop();
    },
    (d) => {
      d.floor.rows[0] = "?OOOOOOO";
    },
    (d) => {
      d.floor.rows[0] = "OO";
    },
    (d) => {
      d.floor.legend.O.sprite = "unknown";
    },
    (d) => {
      d.floor.legend.O.color = "red";
    },
    (d) => {
      d.floor.legend.O.spawnAllowed = 1;
    },
    (d) => {
      d.entities.push(d.entities[0]);
    },
    (d) => {
      d.entities[0].column = -1;
    },
    (d) => {
      d.entities[0].row = 7;
    },
    (d) => {
      d.entities[0].width = 0;
    },
    (d) => {
      d.entities[0].sprite = "new-furniture";
    },
    (d) => {
      d.entities[0].offsetX = 513;
    },
    (d) => {
      d.spots = [
        { id: "spot", name: "不正", entityId: "missing", column: 1, row: 1 },
      ];
    },
    (d) => {
      const spot = {
        id: "spot",
        name: "重複",
        entityId: "bench",
        column: 1,
        row: 1,
      };
      d.spots = [spot, spot];
    },
    (d) => {
      d.characters = [];
    },
    (d) => {
      d.npcs = [];
    },
  ];
  for (const mutate of corruptions) {
    const value = home();
    mutate(value);
    assert.throws(() => parseHome(value), String(mutate));
  }
  assert.throws(
    () => parseMapDocument(" ".repeat(1_000_001), "home-interior"),
    /1MB/,
  );
  assert.throws(
    () => parseMapDocument("あ".repeat(333_334), "home-interior"),
    /1MB/,
  );
});

test("一覧の後は指定JSONだけを読み、未選択JSONを要求しない", async () => {
  for (const id of Object.keys(mapRegistry)) {
    const calls = [];
    const signal = new AbortController().signal;
    const map = await loadMap(
      id,
      async (url, init) => {
        calls.push(url);
        assert.equal(init.signal, signal);
        return {
          ok: true,
          text: async () => readFileSync(`public${url}`, "utf8"),
        };
      },
      signal,
    );
    assert.equal(map.id, id);
    assert.deepEqual(calls, [
      "/assets/maps/index.json",
      `/assets/maps/${id}.json`,
    ]);
  }
});

test("未登録IDは通信せず拒否し、一覧の欠落・HTTP・ネットワーク・JSONエラーを伝える", async () => {
  assert.equal(isMapSceneId("toString"), false);
  await assert.rejects(
    loadMap("unknown", () => assert.fail("通信してはいけません")),
    /未登録/,
  );
  await assert.rejects(
    loadMap("home-interior", async () => ({ ok: false })),
    /取得/,
  );
  await assert.rejects(
    loadMap("home-interior", async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
  await assert.rejects(
    loadMap("home-interior", async () => ({ ok: true, text: async () => "{" })),
    /JSON/,
  );
  await assert.rejects(
    loadMap("home-interior", async () => ({
      ok: true,
      text: async () => JSON.stringify({ version: 1, maps: [index.maps[1]] }),
    })),
    /一覧/,
  );
  await assert.rejects(
    loadMap("home-interior", async (url) => ({
      ok: url.endsWith("index.json"),
      text: async () => read("index"),
    })),
    /取得/,
  );
  await assert.rejects(
    loadMap("home-interior", async (url) => ({
      ok: true,
      text: async () => (url.endsWith("index.json") ? read("index") : "{}"),
    })),
    /マップ/,
  );
});

test("AbortSignalをfetchへ渡し、中断を成功扱いしない", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    loadMap(
      "home-interior",
      async (_url, { signal }) => {
        signal.throwIfAborted();
        assert.fail("中断後に読んではいけません");
      },
      controller.signal,
    ),
    { name: "AbortError" },
  );
});

test("座標変換とスマホのカメラ縮小はサイズに追従する", () => {
  const size = { columns: 8, rows: 7 };
  assert.deepEqual(toWorld({ column: 3.5, row: 3 }, size), [0, 0, 0]);
  assert.equal(isInside({ column: Infinity, row: 1 }, size), false);
  assert.equal(isInside({ column: 7, row: 6 }, size), true);
  assert.equal(isInside({ column: 8, row: 6 }, size), false);
  const mobile = cameraZoom(size, { width: 320, height: 568 });
  const desktop = cameraZoom(size, { width: 1440, height: 900 });
  assert.ok(mobile > 0 && mobile < desktop);
  assert.ok(
    cameraZoom({ columns: 100, rows: 100 }, { width: 320, height: 568 }) <
      mobile,
  );
});

test("短いクリックのみ選択でき、往復ドラッグ・複数指・別pointerは選択しない", () => {
  const down = beginTap(null, 1, 10, 10);
  assert.equal(isTap(down, 1, 12, 11), true);
  assert.equal(isTap(down, 2, 10, 10), false);
  assert.equal(isTap(down, 1, 20, 10), false);
  assert.equal(isTap(moveTap(moveTap(down, 30, 10), 10, 10), 1, 10, 10), false);
  assert.equal(isTap(beginTap(down, 2, 10, 10), 1, 10, 10), false);
  assert.equal(isTap(null, 1, 10, 10), false);
});
