import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { loadTypescript } from "./load-typescript.mjs";

const { PRACTICE_SCENES, sceneForSpotId, conversationLabel } = loadTypescript(
  "src/features/conversation/scene.ts",
);
const { CONVERSATION_SCENES, conversationDisplay, needsSaveBeforeClose } =
  loadTypescript("src/features/conversation/presentation.ts");

const townSpots = () =>
  JSON.parse(readFileSync("public/assets/maps/hoshikawa-town.json", "utf8")).spots;

const display = (overrides) =>
  conversationDisplay({
    type: "BIRTH",
    scene: null,
    npcName: "ノア",
    npcImageSrc: "/assets/npc/presets/friendly-student.png",
    presentation: "fullscreen",
    onFinish: () => {},
    ...overrides,
  });

test("練習シーンは街のスポットと1対1で対応する", () => {
  const spotIds = townSpots().map((spot) => spot.id);
  const sceneSpotIds = Object.values(PRACTICE_SCENES).map((scene) => scene.spotId);

  // マップJSON側でIDを変えたら、ここで落ちる。
  assert.equal(new Set(sceneSpotIds).size, sceneSpotIds.length);
  for (const spotId of sceneSpotIds) {
    assert.ok(spotIds.includes(spotId), `${spotId} が街のスポットにありません`);
  }
  for (const [key, scene] of Object.entries(PRACTICE_SCENES)) {
    assert.equal(sceneForSpotId(scene.spotId), key);
  }
  // 練習ではないスポットは会話を起動しない。
  assert.equal(sceneForSpotId("home"), null);
  assert.equal(sceneForSpotId("plaza"), null);
  assert.equal(sceneForSpotId("unknown-spot"), null);
});

test("練習シーンの背景と相手の立ち絵が実在する", () => {
  for (const scene of Object.values(PRACTICE_SCENES)) {
    const background = CONVERSATION_SCENES[scene.backgroundKey];
    assert.ok(background, `${scene.backgroundKey} の背景設定がありません`);
    assert.ok(
      existsSync(`public${background.backgroundSrc}`),
      `${background.backgroundSrc} がありません`,
    );
    assert.ok(
      existsSync(`public/assets/npc/presets/${scene.partnerPresetId}.png`),
      `${scene.partnerPresetId}.png がありません`,
    );
  }
});

test("会話種別ごとに相手と見守り役が入れ替わる", () => {
  const practice = display({
    type: "PRACTICE",
    scene: "CAFE",
    partnerImageSrc: "/assets/npc/presets/cafe-server.png",
  });
  // 練習の相手はシーンNPCで、分身は見守りに回る。
  assert.equal(practice.assistant.name, PRACTICE_SCENES.CAFE.partnerName);
  assert.equal(practice.assistant.imageSrc, "/assets/npc/presets/cafe-server.png");
  assert.equal(practice.observer?.name, "ノア");
  assert.equal(practice.backgroundKey, "cafe");

  const daily = display({ type: "DAILY" });
  assert.equal(daily.assistant.name, "ノア");
  assert.equal(daily.observer, undefined);
  assert.equal(daily.backgroundKey, "home");

  const birth = display({});
  assert.equal(birth.title, "ノアとの最初の会話");
  assert.equal(birth.assistant.name, "ノア");
  assert.equal(birth.observer, undefined);
  assert.equal(birth.backgroundKey, "home");
  assert.equal(birth.completionLabel, "会話を終えて誕生する");
});

test("進行中のモーダルを閉じるときだけ保存確認を挟む", () => {
  assert.equal(needsSaveBeforeClose("modal", "IN_PROGRESS"), true);
  assert.equal(needsSaveBeforeClose("modal", "FINISHED"), false);
  assert.equal(needsSaveBeforeClose("modal", "REVIEWED"), false);
  // 全画面は閉じる導線を持たないため、確認も出さない。
  assert.equal(needsSaveBeforeClose("fullscreen", "IN_PROGRESS"), false);
});

test("会話一覧のラベルが種別とシーンを区別する", () => {
  assert.equal(conversationLabel("BIRTH", null), "最初の会話");
  assert.equal(conversationLabel("DAILY", null), "今日のひとこと");
  assert.equal(conversationLabel("PRACTICE", "OFFICE"), "練習・オフィス");
  assert.equal(conversationLabel("PRACTICE", null), "練習");
});
