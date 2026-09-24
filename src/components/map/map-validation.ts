import {
  groundNames,
  floorNames,
  objectNames,
  type FloorName,
  type MapDocument,
  type MapEntity,
  type MapFloor,
  type MapIndex,
  type MapPoint,
  type MapSize,
} from "./map-types";

const MAX_JSON_BYTES = 1_000_000;
const idPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
function fail(message: string): never {
  throw new Error(message);
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("JSONのオブジェクトが不正です。");
  return value as Record<string, unknown>;
}
function json(text: string): Record<string, unknown> {
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES)
    fail("マップJSONは1MB以内にしてください。");
  try {
    return record(JSON.parse(text));
  } catch {
    fail("マップJSONの形式が不正です。");
  }
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length > max || !value.trim())
    fail("マップの文字列が不正です。");
  return value;
}
function id(value: unknown): string {
  const result = text(value, 80);
  if (!idPattern.test(result)) fail("マップのIDが不正です。");
  return result;
}
function array(value: unknown, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit)
    fail("マップの配列が不正です。");
  return value;
}
function number(value: unknown, min: number, max: number): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    fail("マップの数値が範囲外です。");
  return value;
}
function color(value: unknown): string {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value))
    fail("室内の色は#RRGGBB形式にしてください。");
  return value;
}
export function isInside(point: MapPoint, size: MapSize): boolean {
  return (
    Number.isFinite(point.column) &&
    Number.isFinite(point.row) &&
    point.column >= 0 &&
    point.row >= 0 &&
    point.column <= size.columns - 1 &&
    point.row <= size.rows - 1
  );
}
function point(input: Record<string, unknown>, size: MapSize): MapPoint {
  return {
    column: number(input.column, 0, size.columns - 1),
    row: number(input.row, 0, size.rows - 1),
  };
}

/** React・fetchから独立した検証境界。壊れたJSONを描画層へ渡しません。 */
export function parseMapIndex(source: string): MapIndex {
  const input = json(source);
  if (input.version !== 1) fail("マップ一覧のバージョンが不正です。");
  const ids = new Set<string>();
  const files = new Set<string>();
  const maps = array(input.maps, 100).map((raw) => {
    const entry = record(raw);
    const key = id(entry.id);
    const file = text(entry.file, 85);
    if (
      !/^[a-z0-9][a-z0-9-]*\.json$/.test(file) ||
      ids.has(key) ||
      files.has(file)
    )
      fail("一覧のID・ファイルが不正または重複しています。");
    ids.add(key);
    files.add(file);
    return { id: key, file };
  });
  if (!maps.length) fail("マップ一覧が空です。");
  return { version: 1, maps };
}

export function parseMapDocument(
  source: string,
  expectedId: string,
): MapDocument {
  const input = json(source);
  if (input.version !== 1 || id(input.id) !== expectedId)
    fail("マップのバージョンまたはIDが一致しません。");
  // 参加者をJSONへ紛れ込ませないため、旧prototypeの固定NPCも受け付けません。
  if (input.npcs !== undefined || input.characters !== undefined)
    fail("キャラクターは実行時データとして渡してください。");
  const rawSize = record(input.size);
  const size = {
    columns: number(rawSize.columns, 1, 100),
    rows: number(rawSize.rows, 1, 100),
  };
  if (
    !Number.isInteger(size.columns) ||
    !Number.isInteger(size.rows) ||
    size.columns * size.rows > 10_000
  )
    fail("マップの寸法が不正です。");
  const floor = record(input.floor);
  const legend = new Map<string, Omit<MapFloor, keyof MapPoint>>();
  for (const [symbol, value] of Object.entries(record(floor.legend))) {
    const style = record(value);
    if (
      Array.from(symbol).length !== 1 ||
      ![...groundNames, ...floorNames].includes(style.sprite as FloorName) ||
      typeof style.spawnAllowed !== "boolean"
    )
      fail("床の凡例が不正です。");
    if (
      style.color !== undefined &&
      (typeof style.color !== "string" || !/^#[0-9a-f]{6}$/i.test(style.color))
    )
      fail("床色は#RRGGBB形式にしてください。");
    legend.set(symbol, {
      sprite: style.sprite as FloorName,
      spawnAllowed: style.spawnAllowed,
      ...(style.color === undefined ? {} : { color: style.color as string }),
      ...(style.tone === undefined ? {} : { tone: {
        color: color(record(style.tone).color),
        mix: number(record(style.tone).mix, 0, 1),
      } }),
    });
  }
  const rows = array(floor.rows, size.rows);
  if (rows.length !== size.rows) fail("床の行数が一致しません。");
  const ground = rows.flatMap((raw, row) => {
    const symbols = Array.from(text(raw, size.columns * 2));
    if (symbols.length !== size.columns) fail("床の列数が一致しません。");
    return symbols.map((symbol, column) => {
      const style = legend.get(symbol);
      if (!style) fail("未定義の床記号です。");
      return { column, row, ...style };
    });
  });
  const entityIds = new Set<string>();
  const entities = array(input.entities, 1_000).map((raw): MapEntity => {
    const entity = record(raw);
    const key = id(entity.id);
    if (
      entityIds.has(key) ||
      !objectNames.includes(entity.sprite as MapEntity["sprite"])
    )
      fail("置物のIDまたは素材が不正です。");
    entityIds.add(key);
    if (entity.trimTransparent !== undefined && typeof entity.trimTransparent !== "boolean")
      fail("置物の透過余白設定が不正です。");
    return {
      id: key,
      ...point(entity, size),
      sprite: entity.sprite as MapEntity["sprite"],
      width: number(entity.width, 1, 512),
      height: number(entity.height, 1, 512),
      ...(entity.trimTransparent === undefined ? {} : { trimTransparent: entity.trimTransparent as boolean }),
      ...(entity.offsetX === undefined
        ? {}
        : { offsetX: number(entity.offsetX, -512, 512) }),
      ...(entity.offsetY === undefined
        ? {}
        : { offsetY: number(entity.offsetY, -512, 512) }),
    };
  });
  const spotIds = new Set<string>();
  const spots = array(input.spots, 100).map((raw) => {
    const spot = record(raw);
    const key = id(spot.id);
    const entityId = id(spot.entityId);
    if (spotIds.has(key) || !entityIds.has(entityId))
      fail("スポットのIDまたは置物の参照が不正です。");
    if (spot.showNameLabel !== undefined && typeof spot.showNameLabel !== "boolean")
      fail("スポットの名札設定が不正です。");
    spotIds.add(key);
    return {
      id: key,
      name: text(spot.name, 80),
      entityId,
      ...point(spot, size),
      ...(spot.showNameLabel === undefined ? {} : { showNameLabel: spot.showNameLabel as boolean }),
    };
  });
  const anchorIds = new Set<string>();
  const placementAnchors = array(input.placementAnchors ?? [], 100).map((raw) => {
    const anchor = record(raw);
    const key = id(anchor.id);
    if (anchorIds.has(key)) fail("配置地点のIDが重複しています。");
    anchorIds.add(key);
    return {
      id: key,
      label: text(anchor.label, 80),
      ...point(anchor, size),
      width: number(anchor.width, 0.1, 4),
      height: number(anchor.height, 0.1, 4),
    };
  });
  const room = input.room === undefined ? undefined : record(input.room);
  const backdrop = input.backdrop === undefined ? undefined : record(input.backdrop);
  if (room !== undefined && backdrop !== undefined)
    fail("室内外装と屋外背景は同時に指定できません。");
  return {
    id: expectedId,
    name: text(input.name, 80),
    description: text(input.description, 500),
    size,
    ground,
    entities,
    spots,
    placementAnchors,
    ...(room === undefined ? {} : { room: {
      wallHeight: number(room.wallHeight, 1, 3),
      wallColor: color(room.wallColor),
      accentColor: color(room.accentColor),
      trimColor: color(room.trimColor),
    } }),
    ...(backdrop === undefined ? {} : { backdrop: {
      height: number(backdrop.height, 1, 5),
      baseThickness: number(backdrop.baseThickness, 0.1, 1),
      baseColor: color(backdrop.baseColor),
      skyColor: color(backdrop.skyColor),
      distantColor: color(backdrop.distantColor),
      landscapeColor: color(backdrop.landscapeColor),
    } }),
  };
}
