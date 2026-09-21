import { isMapSceneId } from "./map-registry";
import { parseMapDocument, parseMapIndex } from "./map-validation";

type FetchMap = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; text(): Promise<string> }>;

/**
 * 一覧取得後、選択したJSONだけを読みます。会場追加で全画面の通信量が増えたり、
 * 未選択マップの破損で現在の画面まで開けなくなったりすることを防ぐ境界です。
 * fetchを注入できるため、通信順・失敗・中断はブラウザなしで検証できます。
 */
export async function loadMap(
  mapId: string,
  fetchFile: FetchMap,
  signal?: AbortSignal,
) {
  if (!isMapSceneId(mapId)) throw new Error("未登録のマップです。");
  async function read(url: string) {
    const response = await fetchFile(url, { signal });
    if (!response.ok) throw new Error("マップを取得できませんでした。");
    return response.text();
  }
  const index = parseMapIndex(await read("/assets/maps/index.json"));
  const entry = index.maps.find((entry) => entry.id === mapId);
  if (!entry) throw new Error("マップ一覧に指定されたマップがありません。");
  return parseMapDocument(await read(`/assets/maps/${entry.file}`), mapId);
}
