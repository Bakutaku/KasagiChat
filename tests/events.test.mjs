import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { loadTypescript } from "./load-typescript.mjs";

const { eventMapCharacters, hiddenParticipantCount, venueSeats } = loadTypescript("src/features/events/event-map-adapter.ts");
const { venueMapId, venueTemplateLabel, VENUE_TEMPLATES } = loadTypescript("src/features/events/venue.ts");
const { toIsoUtc, toDatetimeLocalValue, formatEventDateTime, formatEventPeriod, eventPhaseLabel } = loadTypescript("src/features/events/presentation.ts");
const { parseMapDocument } = loadTypescript("src/components/map/map-validation.ts");
const { mapRegistry } = loadTypescript("src/components/map/map-registry.ts");

const lounge = () => parseMapDocument(readFileSync("public/assets/maps/komorebi-lounge.json", "utf8"), "komorebi-lounge");
const participants = (count) => Array.from({ length: count }, (_, i) => ({ name: `参加者${i + 1}`, presetId: "cheerful-girl" }));

test("会場テンプレートはすべて登録済みのマップを指す", () => {
  assert.deepEqual(VENUE_TEMPLATES, ["HALL", "PARTY_ROOM", "CLASSROOM"]);
  for (const template of VENUE_TEMPLATES) {
    assert.equal(venueMapId(template), "komorebi-lounge");
    assert.ok(mapRegistry[venueMapId(template)]);
    assert.ok(venueTemplateLabel(template).length > 0);
  }
});

test("座席は重複せず、会場マップの生成可能な床に収まる", () => {
  const document = lounge();
  const seats = venueSeats("komorebi-lounge");
  assert.equal(seats.length, 18);
  assert.equal(new Set(seats.map((seat) => `${seat.column}:${seat.row}`)).size, seats.length);
  const spawnable = new Set(document.ground.filter((tile) => tile.spawnAllowed).map((tile) => `${tile.column}:${tile.row}`));
  for (const seat of seats) {
    assert.ok(seat.column >= 0 && seat.column < document.size.columns, `列が範囲外: ${seat.column}`);
    assert.ok(seat.row >= 0 && seat.row < document.size.rows, `行が範囲外: ${seat.row}`);
    assert.ok(spawnable.has(`${Math.round(seat.column)}:${Math.round(seat.row)}`), `立てない床: ${seat.column}:${seat.row}`);
  }
  assert.ok(seats.some((seat) => !Number.isInteger(seat.column) || !Number.isInteger(seat.row)), "配置がグリッドに整列している");
});

test("会場は室内外装とラウンジ家具を持ち、素材がすべて存在する", () => {
  const document = lounge();
  assert.ok(document.room, "室内外装がない");
  assert.ok(document.entities.length >= 5, "会場の家具が少なすぎる");
  assert.ok(document.entities.some((entity) => entity.sprite === "home-sofa"));
  assert.ok(document.entities.some((entity) => entity.sprite === "home-coffee-table"));
  assert.ok(document.entities.every((entity) => !["flowerbed", "lamp"].includes(entity.sprite)), "屋外用の置物が室内にある");
  for (const entity of document.entities) {
    assert.ok(existsSync(`public/assets/map/tiles/${entity.sprite}.png`), `会場素材がない: ${entity.sprite}`);
  }
});

test("参加者はサーバーの並び順で座席へ割り当てられ、立ち絵の素材が存在する", () => {
  const characters = eventMapCharacters(participants(3), "komorebi-lounge");
  const seats = venueSeats("komorebi-lounge");
  assert.deepEqual(characters.map((character) => character.name), ["参加者1", "参加者2", "参加者3"]);
  assert.deepEqual(characters.map((character) => ({ column: character.column, row: character.row })), seats.slice(0, 3).map((seat) => ({ ...seat })));
  assert.equal(new Set(characters.map((character) => character.id)).size, 3);
  assert.ok(characters.every((character) => character.showNameLabel === false));
  assert.ok(characters.every((character) => character.showAmbientEmotes));
  for (const character of characters) {
    assert.ok(existsSync(`public${character.src}`), `立ち絵がない: ${character.src}`);
  }
  // 未知のプリセットIDでも、既定の立ち絵へ落として描画を止めない。
  assert.ok(existsSync(`public${eventMapCharacters([{ name: "不明", presetId: "SAMPLE_A" }], "komorebi-lounge")[0].src}`));
});

test("座席に入りきらない参加者は描画せず、人数だけを伝える", () => {
  assert.equal(eventMapCharacters(participants(25), "komorebi-lounge").length, 18);
  assert.equal(hiddenParticipantCount(participants(25), "komorebi-lounge"), 7);
  assert.equal(hiddenParticipantCount(participants(18), "komorebi-lounge"), 0);
  assert.deepEqual(eventMapCharacters([], "komorebi-lounge"), []);
});

test("日時は実行環境のタイムゾーンに関係なく日本時間で往復する", () => {
  assert.equal(toIsoUtc("2026-03-01T19:00"), "2026-03-01T10:00:00.000Z");
  assert.equal(toDatetimeLocalValue("2026-03-01T10:00:00.000Z"), "2026-03-01T19:00");
  for (const value of ["2026-01-01T00:00", "2026-07-15T09:30", "2026-12-31T23:59"]) {
    assert.equal(toDatetimeLocalValue(toIsoUtc(value)), value);
  }
  // 日付をまたぐ変換でも日本時間のままにする。
  assert.equal(toIsoUtc("2026-03-01T08:00"), "2026-02-28T23:00:00.000Z");
  assert.equal(toIsoUtc("こわれた入力"), "");
  assert.equal(toDatetimeLocalValue("こわれた入力"), "");
});

test("期間の表示は同じ日なら日付を繰り返さない", () => {
  assert.equal(formatEventDateTime("2026-03-01T10:00:00Z"), "2026/03/01 19:00");
  assert.equal(formatEventPeriod("2026-03-01T01:00:00Z", "2026-03-01T08:00:00Z"), "2026/03/01 10:00 〜 17:00");
  assert.equal(formatEventPeriod("2026-03-01T10:00:00Z", "2026-03-02T10:00:00Z"), "2026/03/01 19:00 〜 2026/03/02 19:00");
  assert.equal(formatEventPeriod("", ""), "");
});

test("フェーズの表示名はサーバーの3値をすべて持つ", () => {
  assert.deepEqual(["UPCOMING", "ONGOING", "ENDED"].map(eventPhaseLabel), ["開催前", "開催中", "終了"]);
});
