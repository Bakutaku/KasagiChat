import {
  groundNames,
  objectNames,
  type MapEntity,
  type ObjectName,
} from "./map-assets";
import {
  MAX_MAP_CELLS,
  defaultDisplay,
  floorNames,
  systemNpcCatalog,
  type Floor,
  type FloorName,
  type MapCatalog,
  type MapDisplay,
  type MapDocument,
  type MapNpc,
  type MapPresetIndex,
  type MapSize,
  type SystemNpcAsset,
} from "./map-data";

const MAX_JSON_BYTES = 1_000_000;
const allFloorNames: readonly string[] = [...groundNames, ...floorNames];

function fail(message: string): never {
  throw new Error(message);
}

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(message);
  return value as Record<string, unknown>;
}

function limitedText(value: unknown, fallback: string, limit: number): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || value.length > limit) {
    fail(`文字列は${limit}文字以内にしてください。`);
  }
  return value;
}

function sizeOf(value: unknown): MapSize {
  const size = record(value, "マップサイズが不正です。");
  const columns = size.columns;
  const rows = size.rows;
  if (
    !Number.isInteger(columns) ||
    !Number.isInteger(rows) ||
    Number(columns) < 1 ||
    Number(rows) < 1 ||
    Number(columns) * Number(rows) > MAX_MAP_CELLS
  ) {
    fail(
      `マップは1～${MAX_MAP_CELLS.toLocaleString()}マスで指定してください。`,
    );
  }
  return { columns: Number(columns), rows: Number(rows) };
}

function pointIsInside(
  value: Record<string, unknown>,
  size: MapSize,
  integer: boolean,
): boolean {
  const { column, row } = value;
  return (
    typeof column === "number" &&
    Number.isFinite(column) &&
    column >= 0 &&
    column <= size.columns - 1 &&
    (!integer || Number.isInteger(column)) &&
    typeof row === "number" &&
    Number.isFinite(row) &&
    row >= 0 &&
    row <= size.rows - 1 &&
    (!integer || Number.isInteger(row))
  );
}

function parseDisplay(value: unknown): MapDisplay {
  if (value === undefined) return { ...defaultDisplay };
  const display = record(value, "名前・吹き出しの表示設定が不正です。");
  if (
    typeof display.showNames !== "boolean" ||
    typeof display.showBubbles !== "boolean"
  ) {
    fail("名前・吹き出しの表示設定が不正です。");
  }
  return {
    showNames: display.showNames,
    showBubbles: display.showBubbles,
    characterBubble: limitedText(display.characterBubble, "", 120),
  };
}

function legacyNpcs(size: MapSize): MapNpc[] {
  const candidates: MapNpc[] = [
    {
      id: "system-guide",
      asset: "guide",
      column: 3,
      row: 2,
      name: systemNpcCatalog.guide.name,
      message: systemNpcCatalog.guide.message,
    },
    {
      id: "system-cafe",
      asset: "cafe",
      column: 2,
      row: 8,
      name: systemNpcCatalog.cafe.name,
      message: systemNpcCatalog.cafe.message,
    },
  ];
  return candidates.filter((npc) => pointIsInside(npc, size, true));
}

function validateMap(value: unknown): MapDocument {
  const input = record(value, "JSONのルートはオブジェクトにしてください。");
  if (![1, 2, 3].includes(Number(input.version)))
    fail("対応していない保存形式です。");

  const size = sizeOf(input.size);
  const ids = new Set<string>();
  const floorCells = new Set<string>();
  const checkId = (item: Record<string, unknown>) => {
    if (
      typeof item.id !== "string" ||
      !item.id.length ||
      item.id.length > 200 ||
      ids.has(item.id)
    ) {
      fail("IDが不正または重複しています。");
    }
    ids.add(item.id);
  };

  if (
    !Array.isArray(input.ground) ||
    input.ground.length !== size.columns * size.rows
  ) {
    fail(`床はsizeに対応する${size.columns * size.rows}件にしてください。`);
  }
  const ground = input.ground.map((value): Floor => {
    const tile = record(value, "床の値が不正です。");
    if (
      !pointIsInside(tile, size, true) ||
      !allFloorNames.includes(String(tile.sprite))
    ) {
      fail("床の座標または素材が不正です。");
    }
    checkId(tile);
    const key = `${tile.column},${tile.row}`;
    if (floorCells.has(key)) fail("床の座標が重複しています。");
    floorCells.add(key);
    if (
      tile.color !== undefined &&
      (typeof tile.color !== "string" || !/^#[0-9a-f]{6}$/i.test(tile.color))
    ) {
      fail("床の色は#RRGGBB形式にしてください。");
    }
    if (
      tile.spawnAllowed !== undefined &&
      typeof tile.spawnAllowed !== "boolean"
    ) {
      fail("キャラクター配置可否が不正です。");
    }
    const sprite = tile.sprite as FloorName;
    return {
      id: tile.id as string,
      column: tile.column as number,
      row: tile.row as number,
      sprite,
      spawnAllowed:
        (tile.spawnAllowed as boolean | undefined) ?? sprite !== "water",
      ...(tile.color === undefined ? {} : { color: tile.color as string }),
    };
  });

  if (!Array.isArray(input.entities) || input.entities.length > 1_000) {
    fail("置物は配列で1,000件以内にしてください。");
  }
  const entities = input.entities.map((value): MapEntity => {
    const entity = record(value, "置物の値が不正です。");
    if (
      !pointIsInside(entity, size, false) ||
      !objectNames.includes(entity.sprite as ObjectName) ||
      typeof entity.width !== "number" ||
      !Number.isFinite(entity.width) ||
      entity.width <= 0 ||
      entity.width > 512 ||
      typeof entity.height !== "number" ||
      !Number.isFinite(entity.height) ||
      entity.height <= 0 ||
      entity.height > 512
    ) {
      fail("置物の座標・素材・寸法が不正です。");
    }
    checkId(entity);
    for (const offset of [entity.offsetX, entity.offsetY]) {
      if (
        offset !== undefined &&
        (typeof offset !== "number" ||
          !Number.isFinite(offset) ||
          Math.abs(offset) > 512)
      ) {
        fail("置物のオフセットが不正です。");
      }
    }
    return {
      id: entity.id as string,
      column: entity.column as number,
      row: entity.row as number,
      sprite: entity.sprite as ObjectName,
      width: entity.width,
      height: entity.height,
      ...(entity.offsetX === undefined
        ? {}
        : { offsetX: entity.offsetX as number }),
      ...(entity.offsetY === undefined
        ? {}
        : { offsetY: entity.offsetY as number }),
    };
  });

  const npcInput = input.npcs === undefined ? legacyNpcs(size) : input.npcs;
  if (!Array.isArray(npcInput) || npcInput.length > 100) {
    fail("システムNPCは配列で100人以内にしてください。");
  }
  const npcs = npcInput.map((value): MapNpc => {
    const npc = record(value, "システムNPCの値が不正です。");
    if (
      !pointIsInside(npc, size, true) ||
      !Object.hasOwn(systemNpcCatalog, String(npc.asset))
    ) {
      fail("システムNPCの素材または座標が不正です。");
    }
    checkId(npc);
    const asset = npc.asset as SystemNpcAsset;
    return {
      id: npc.id as string,
      asset,
      column: npc.column as number,
      row: npc.row as number,
      name: limitedText(npc.name, systemNpcCatalog[asset].name, 40),
      message: limitedText(npc.message, "", 120),
    };
  });

  return {
    version: 3,
    name: limitedText(input.name, "名前のないマップ", 80),
    description: limitedText(input.description, "", 500),
    size,
    ground,
    entities,
    npcs,
    display: parseDisplay(input.display),
  };
}

export function parseMap(json: string): MapDocument {
  if (json.length > MAX_JSON_BYTES) fail("JSONは1MB以内にしてください。");
  return validateMap(JSON.parse(json));
}

export function serializeMap(document: MapDocument): string {
  return JSON.stringify(document, null, 2);
}

export function parseMapPreset(json: string, expectedId?: string): MapDocument {
  if (json.length > MAX_JSON_BYTES) fail("JSONは1MB以内にしてください。");
  const preset = record(
    JSON.parse(json),
    "プリセットのルートはオブジェクトにしてください。",
  );
  if (preset.version !== 1) fail("対応していないプリセット形式です。");
  const id = limitedText(preset.id, "", 80);
  if (
    !/^[a-z0-9][a-z0-9-]*$/.test(id) ||
    (expectedId !== undefined && id !== expectedId)
  ) {
    fail("プリセットIDが不正です。");
  }
  const size = sizeOf(preset.size);
  const floor = record(preset.floor, "床定義が不正です。");
  const legendInput = record(floor.legend, "床の凡例が不正です。");
  if (!Array.isArray(floor.rows) || floor.rows.length !== size.rows) {
    fail(`床の行は${size.rows}行にしてください。`);
  }

  const legend = new Map<
    string,
    { sprite: FloorName; color?: string; spawnAllowed: boolean }
  >();
  for (const [symbol, rawStyle] of Object.entries(legendInput)) {
    const style = record(rawStyle, "床の凡例が不正です。");
    if (
      Array.from(symbol).length !== 1 ||
      !allFloorNames.includes(String(style.sprite))
    ) {
      fail("床の凡例記号または素材が不正です。");
    }
    if (typeof style.spawnAllowed !== "boolean")
      fail("床の凡例には配置可否が必要です。");
    if (
      style.color !== undefined &&
      (typeof style.color !== "string" || !/^#[0-9a-f]{6}$/i.test(style.color))
    ) {
      fail("床の色は#RRGGBB形式にしてください。");
    }
    legend.set(symbol, {
      sprite: style.sprite as FloorName,
      spawnAllowed: style.spawnAllowed,
      ...(style.color === undefined ? {} : { color: style.color }),
    });
  }

  const ground: Floor[] = [];
  floor.rows.forEach((rawRow, row) => {
    if (
      typeof rawRow !== "string" ||
      Array.from(rawRow).length !== size.columns
    ) {
      fail(`床の各行は${size.columns}記号にしてください。`);
    }
    Array.from(rawRow).forEach((symbol, column) => {
      const style = legend.get(symbol);
      if (!style) fail(`床記号「${symbol}」が凡例にありません。`);
      ground.push({ id: `tile-${column}-${row}`, column, row, ...style });
    });
  });

  return validateMap({
    version: 3,
    name: preset.name,
    description: preset.description,
    size,
    ground,
    entities: preset.entities,
    npcs: preset.npcs,
    display: preset.display,
  });
}

export function parseMapPresetIndex(json: string): MapPresetIndex {
  if (json.length > MAX_JSON_BYTES) fail("JSONは1MB以内にしてください。");
  const input = record(
    JSON.parse(json),
    "一覧JSONのルートはオブジェクトにしてください。",
  );
  if (
    input.version !== 1 ||
    typeof input.defaultMapId !== "string" ||
    !Array.isArray(input.maps)
  ) {
    fail("マップ一覧の形式が不正です。");
  }
  const ids = new Set<string>();
  const files = new Set<string>();
  const maps = input.maps.map((value) => {
    const entry = record(value, "マップ一覧の項目が不正です。");
    if (
      typeof entry.id !== "string" ||
      !/^[a-z0-9][a-z0-9-]*$/.test(entry.id) ||
      typeof entry.file !== "string" ||
      !/^[a-z0-9][a-z0-9-]*\.json$/.test(entry.file) ||
      ids.has(entry.id) ||
      files.has(entry.file)
    ) {
      fail("マップ一覧のID・ファイル名が不正または重複しています。");
    }
    ids.add(entry.id);
    files.add(entry.file);
    return { id: entry.id, file: entry.file };
  });
  if (!maps.length || !ids.has(input.defaultMapId))
    fail("既定マップが一覧にありません。");
  return { version: 1, defaultMapId: input.defaultMapId, maps };
}

type FetchResponse = { ok: boolean; status: number; text(): Promise<string> };
type FetchMapFile = (url: string) => Promise<FetchResponse>;

export async function loadMapCatalog(
  fetchFile: FetchMapFile,
): Promise<MapCatalog> {
  const indexResponse = await fetchFile("/assets/maps/index.json");
  if (!indexResponse.ok)
    fail(`マップ一覧を読み込めませんでした（${indexResponse.status}）。`);
  const index = parseMapPresetIndex(await indexResponse.text());
  const maps = await Promise.all(
    index.maps.map(async (entry) => {
      const response = await fetchFile(`/assets/maps/${entry.file}`);
      if (!response.ok)
        fail(`${entry.file}を読み込めませんでした（${response.status}）。`);
      return {
        id: entry.id,
        document: parseMapPreset(await response.text(), entry.id),
      };
    }),
  );
  return { defaultMapId: index.defaultMapId, maps };
}
