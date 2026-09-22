/** 画面側はこの公開境界のみを参照し、描画・検証の内部実装に依存しません。 */
export {
  ImmersiveMapShell,
  type ImmersiveMapShellProps,
} from "./immersive-map-shell";
export type { MapSceneId } from "./map-registry";
export type { RuntimeMapCharacter, MapInteraction, MapSpot, MapTargetDetails } from "./map-types";
export type { RuntimeMapObject, MapObjectEditing } from "./map-types";
