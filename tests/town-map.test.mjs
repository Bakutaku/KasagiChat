import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { loadTypescript } from "./load-typescript.mjs";

const { parseMapDocument, isInside } = loadTypescript("src/components/map/map-validation.ts");
const { townCharacters, townVisit, townSpotDetails } = loadTypescript("src/features/town/town-map-presentation.ts");
const { PRACTICE_SCENES } = loadTypescript("src/features/conversation/scene.ts");
const readTown = () => JSON.parse(readFileSync("public/assets/maps/hoshikawa-town.json", "utf8"));
const parse = (value) => parseMapDocument(JSON.stringify(value), "hoshikawa-town");

test("街の調色指定を読み込み、範囲外・不正な色・欠損を拒否する", () => {
  const map = parse(readTown());
  assert.ok(map.ground.every((tile) => tile.tone && tile.tone.mix > 0));
  for (const tone of [null, {}, { color: "red", mix: 0.5 }, { color: "#ffffff", mix: -0.1 }, { color: "#ffffff", mix: 1.1 }, { color: "#ffffff", mix: "0.5" }]) {
    const input = readTown();
    input.floor.legend.G.tone = tone;
    assert.throws(() => parse(input));
  }
  const legacy = readTown();
  Object.values(legacy.floor.legend).forEach((tile) => delete tile.tone);
  assert.ok(parse(legacy).ground.every((tile) => tile.tone === undefined));
});

test("人物・建物の案内が同じ会話相手を参照し、人物は実在する画像と歩ける地点を持つ", () => {
  const map = parse(readTown());
  assert.equal(townCharacters.length, Object.keys(PRACTICE_SCENES).length);
  for (const character of townCharacters) {
    const spot = map.spots.find((spot) => spot.id === character.id);
    assert.ok(spot);
    assert.ok(isInside(character, map.size));
    assert.equal(map.ground.find((tile) => tile.column === Math.round(character.column) && tile.row === Math.round(character.row)).spawnAllowed, true);
    assert.ok(existsSync(`public${character.src}`));
    const visit = townVisit(spot.id);
    assert.equal(visit.name, character.name);
    assert.equal(visit.imageSrc, character.src);
    assert.equal(PRACTICE_SCENES[visit.scene].spotId, spot.id);
    assert.ok(townSpotDetails[spot.id].description.includes(character.name));
    assert.equal(character.details.description, visit.description);
  }
});

test("家と広場は会話シーンを持たず、未知の対象に行き先を作らない", () => {
  assert.equal(townVisit("home").scene, null);
  assert.equal(townVisit("home").destination, "/home");
  assert.equal(townVisit("plaza").scene, null);
  assert.equal(townVisit("plaza").actionLabel, undefined);
  assert.equal(townVisit("unknown"), null);
});
