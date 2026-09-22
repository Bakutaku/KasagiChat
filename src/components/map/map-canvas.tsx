"use client";

import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { Html, MapControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { MOUSE, TOUCH, OrthographicCamera, type Vector3 } from "three";
import { cameraPosition, cameraZoom, toWorld } from "./map-geometry";
import { isInside } from "./map-validation";
import { GroundLayer, ImageSprite } from "./map-layers";
import { MapInput } from "./map-input";
import { MapObjectLayer } from "./map-object-layer";
import { MapRoomLayer } from "./map-room-layer";
import type {
  MapDocument,
  MapInteraction,
  MapSize,
  MapSpot,
  RuntimeMapCharacter,
  RuntimeMapObject,
  MapObjectEditing,
} from "./map-types";

export type MapCanvasProps = {
  document: MapDocument;
  interaction: MapInteraction;
  paused: boolean;
  characters: readonly RuntimeMapCharacter[];
  objects?: readonly RuntimeMapObject[];
  objectEditing?: MapObjectEditing;
  onSelect?: (spot: MapSpot | null) => void;
  onError: (error: Error) => void;
};

function CameraFit({ mapSize, paused }: { mapSize: MapSize; paused: boolean }) {
  const { camera, size, invalidate } = useThree();
  const controls = useThree((state) => state.controls) as unknown as {
    target: Vector3;
    update(): void;
  } | null;
  useLayoutEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return;
    camera.position.set(...cameraPosition(mapSize));
    camera.lookAt(0, 0, 0);
    // Three.jsの可変オブジェクトを画面寸法へ同期する境界。
    // eslint-disable-next-line react-hooks/immutability
    camera.zoom = cameraZoom(mapSize, size);
    camera.updateProjectionMatrix();
    controls?.target.set(0, 0, 0);
    controls?.update();
    invalidate();
  }, [camera, controls, invalidate, mapSize, size]);
  useEffect(() => {
    if (!paused) invalidate();
  }, [paused, invalidate]);
  return null;
}

function ContextLoss({ onError }: Pick<MapCanvasProps, "onError">) {
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onError(new Error("WebGLの描画が中断されました。再試行してください。"));
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [canvas, onError]);
  return null;
}

function Scene({
  document,
  interaction,
  paused,
  characters,
  objects,
  objectEditing,
  onSelect,
  onError,
}: MapCanvasProps) {
  return (
    <>
      <CameraFit mapSize={document.size} paused={paused} />
      <ContextLoss onError={onError} />
      {/* PCは左ドラッグ・ホイール、タッチは1本指パン・2本指ピンチ。固定画面にはControlsを作りません。 */}
      {interaction === "explore" && (
        <MapControls
          makeDefault
          enabled={!paused}
          enableRotate={false}
          enableDamping={false}
          screenSpacePanning={false}
          minZoom={0.1}
          maxZoom={150}
          mouseButtons={{
            LEFT: MOUSE.PAN,
            MIDDLE: MOUSE.DOLLY,
            RIGHT: MOUSE.PAN,
          }}
          touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }}
        />
      )}
      {interaction === "explore" && !paused && (
        <MapInput spots={document.spots} onSelect={onSelect} />
      )}
      <GroundLayer document={document} />
      <MapRoomLayer size={document.size} room={document.room} />
      <MapObjectLayer document={document} objects={objects} editing={objectEditing} paused={paused} />
      {document.entities.map((entity) => {
        const position = toWorld(entity, document.size);
        position[0] += (entity.offsetX ?? 0) / 108;
        position[1] = -(entity.offsetY ?? 0) / 76.37;
        return (
          <ImageSprite
            key={entity.id}
            src={`/assets/map/tiles/${entity.sprite}.png`}
            position={position}
            width={entity.width / 76.37}
            height={entity.height / 76.37}
            trimTransparent={entity.trimTransparent}
            order={1000 + Math.round((entity.column + entity.row) * 100)}
            spotId={
              document.spots.find((spot) => spot.entityId === entity.id)?.id
            }
          />
        );
      })}
      {characters
        .filter((character) => isInside(character, document.size))
        .map((character) => {
          const position = toWorld(character, document.size);
          return (
            <group key={character.id}>
              <ImageSprite
                src={character.src}
                position={position}
                width={0.7}
                height={1.05}
                order={
                  1001 + Math.round((character.column + character.row) * 100)
                }
                character
              />
              <Html
                position={[position[0], 1.4, position[2]]}
                center
                style={{ pointerEvents: "none" }}
                zIndexRange={[5, 1]}
              >
                <span className="badge max-w-32 truncate bg-base-100/90 text-xs">
                  {character.name}
                </span>
              </Html>
            </group>
          );
        })}
    </>
  );
}

function supportsWebGL() {
  try {
    const context = window.document
      .createElement("canvas")
      .getContext("webgl2");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** 描画実装の差し替え口。ルート・API・イベント状態には依存しません。 */
export default function MapCanvas(props: MapCanvasProps) {
  // CanvasのHTML fallbackは「canvas要素非対応」用です。WebGL2の非対応は先に共通境界へ伝えます。
  const [supported] = useState(supportsWebGL);
  if (!supported)
    throw new Error("WebGLを利用できるブラウザで表示してください。");
  return (
    <Canvas
      orthographic
      camera={{
        position: cameraPosition(props.document.size),
        near: 0.1,
        far: 1000,
        zoom: 20,
      }}
      dpr={[1, 1.5]}
      frameloop={props.paused ? "never" : "demand"}
      gl={{ antialias: false }}
      fallback="Canvasを利用できるブラウザで表示してください。"
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
