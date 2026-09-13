"use client";

import { Html, MapControls } from "@react-three/drei";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo } from "react";
import {
  CanvasTexture,
  LinearFilter,
  MOUSE,
  NearestFilter,
  OrthographicCamera,
  Raycaster,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
} from "three";
import {
  groundNames,
  groundTextureFiles,
  previewCharacters,
} from "./map-assets";
import {
  floorColors,
  floorNames,
  systemNpcCatalog,
  type Cell,
  type FloorName,
  type MapDocument,
  type MapSize,
} from "./map-data";
import { cameraPosition, cameraZoom, toWorld } from "./map-geometry";
import { placeGuests } from "./map-operations";

export type MapCanvasProps = {
  document: MapDocument;
  /** 会話中は操作と継続描画を止め、背景として保持します。 */
  paused?: boolean;
  playerSrc?: string;
  pan?: boolean;
  resetKey?: number;
  showCharacters?: boolean;
  onSelect?: (name: string | null) => void;
};

type ProceduralFloorName = Exclude<(typeof floorNames)[number], "plain">;

function makeFloor(name: ProceduralFloorName) {
  const canvas = window.document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  context.fillStyle = floorColors[name];
  context.fillRect(0, 0, 256, 256);

  if (name === "oak") {
    for (let y = 0; y < 256; y += 64) {
      context.fillStyle = y % 128 === 0 ? "#d0a574" : "#c69a66";
      context.fillRect(0, y, 256, 64);
      context.fillStyle = "#ad8051";
      context.fillRect(0, y, 256, 2);
      context.fillRect(y % 128 === 0 ? 0 : 128, y, 2, 64);
      for (let index = 0; index < 7; index += 1) {
        context.strokeStyle = "rgba(114,76,36,.13)";
        context.beginPath();
        context.moveTo(0, y + 8 + index * 8);
        context.bezierCurveTo(
          85,
          y + 4 + index * 8,
          170,
          y + 12 + index * 8,
          256,
          y + 8 + index * 8,
        );
        context.stroke();
      }
    }
  } else if (name === "limestone") {
    context.fillStyle = "#c5c2b8";
    context.fillRect(0, 0, 256, 3);
    context.fillRect(0, 0, 3, 256);
    for (let index = 0; index < 450; index += 1) {
      context.fillStyle = index % 2 ? "#e4e1d8" : "#d4d1c6";
      context.fillRect(
        ((index * 73) % 253) + 3,
        ((index * 113) % 253) + 3,
        2,
        1,
      );
    }
  } else if (name === "carpet") {
    for (let y = 0; y < 256; y += 4) {
      for (let x = 0; x < 256; x += 4) {
        context.fillStyle = (x + y) % 8 === 0 ? "#84998d" : "#748b7e";
        context.fillRect(x, y, 2, 2);
      }
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function CharacterLabel({
  cell,
  mapSize,
  name,
  message,
  display,
}: {
  cell: Cell;
  mapSize: MapSize;
  name: string;
  message: string;
  display: MapDocument["display"];
}) {
  if (!display.showNames && (!display.showBubbles || !message)) return null;
  const position = toWorld(cell, mapSize);
  position[1] = 1.35;

  return (
    <Html
      position={position}
      center
      style={{ pointerEvents: "none" }}
      zIndexRange={[30, 10]}
    >
      <div className="flex w-[150px] -translate-y-1/2 flex-col items-center gap-1">
        {display.showBubbles && message && (
          <div className="relative max-w-[150px] break-words rounded-xl border border-[#d4cbb9] bg-[#fffef7] px-2.5 py-1.5 text-[11px] leading-4 text-[#4b463d] shadow-sm">
            {message}
            <span className="absolute -bottom-[5px] left-[calc(50%-4px)] size-2 rotate-45 border-b border-r border-[#d4cbb9] bg-[#fffef7]" />
          </div>
        )}
        {display.showNames && (
          <span className="mt-0.5 max-w-[150px] break-words rounded-xl bg-[#3d423bd9] px-2 py-0.5 text-[10px] text-white">
            {name}
          </span>
        )}
      </div>
    </Html>
  );
}

type ImageSpriteProps = {
  src: string;
  position: [number, number, number];
  width: number;
  height: number;
  order: number;
  entityId?: string;
};

function ImageSprite(props: ImageSpriteProps) {
  return (
    <Suspense fallback={null}>
      <LoadedImageSprite {...props} />
    </Suspense>
  );
}

function LoadedImageSprite({
  src,
  position,
  width,
  height,
  order,
  entityId,
}: ImageSpriteProps) {
  const source = useLoader(TextureLoader, src);
  const texture = useMemo(() => {
    const result = source.clone();
    result.colorSpace = SRGBColorSpace;
    result.magFilter = src?.includes("/npc/") ? LinearFilter : NearestFilter;
    result.needsUpdate = true;
    return result;
  }, [source, src]);

  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite
      position={position}
      center={[0.5, 0]}
      scale={[width, height, 1]}
      renderOrder={order}
      userData={{ entityId }}
    >
      <spriteMaterial
        map={texture}
        color="#ffffff"
        transparent
        alphaTest={0.08}
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  );
}

function CameraFit({
  mapSize,
  resetKey,
}: {
  mapSize: MapSize;
  resetKey: number;
}) {
  const { camera, size: viewport, invalidate } = useThree();
  const controls = useThree((state) => state.controls) as unknown as {
    target: Vector3;
    update: () => void;
  } | null;

  useLayoutEffect(() => {
    const orthographic = camera as OrthographicCamera;
    orthographic.position.set(...cameraPosition(mapSize));
    orthographic.lookAt(0, 0, 0);
    // Three.js camera objects are mutable; reset synchronizes them with map and viewport size.
    // eslint-disable-next-line react-hooks/immutability
    orthographic.zoom = cameraZoom(mapSize, viewport);
    orthographic.updateProjectionMatrix();
    controls?.target.set(0, 0, 0);
    controls?.update();
    invalidate();
  }, [camera, controls, invalidate, mapSize, resetKey, viewport]);
  return null;
}

/** ドラッグは視点移動、短いクリックだけをスポット選択として扱います。 */
function PointerInput({ onSelect }: Pick<MapCanvasProps, "onSelect">) {
  const { camera, gl, scene } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const ray = new Raycaster();
    let start: { id: number; x: number; y: number } | null = null;
    const down = (event: PointerEvent) => {
      if (event.button === 0)
        start = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const up = (event: PointerEvent) => {
      if (!start || start.id !== event.pointerId) return;
      const click =
        Math.hypot(event.clientX - start.x, event.clientY - start.y) < 5;
      start = null;
      if (!click) return;
      const bounds = canvas.getBoundingClientRect();
      ray.setFromCamera(
        new Vector2(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        ),
        camera,
      );
      const entity = ray
        .intersectObjects(scene.children, true)
        .filter((item) => item.object.userData.entityId)
        .sort((a, b) => b.object.renderOrder - a.object.renderOrder)[0];
      onSelect?.((entity?.object.userData.entityId as string) ?? null);
    };
    const cancel = () => {
      start = null;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("pointerleave", cancel);
    window.addEventListener("blur", cancel);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("pointerleave", cancel);
      window.removeEventListener("blur", cancel);
    };
  }, [camera, gl, scene, onSelect]);
  return null;
}

const isGroundSprite = (sprite: FloorName) =>
  (groundNames as readonly string[]).includes(sprite);
const groundTextureUrls = groundNames.map((name) => groundTextureFiles[name]);

function useGroundTextures() {
  const loaded = useLoader(TextureLoader, groundTextureUrls);
  return useMemo(() => {
    loaded.forEach((texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
    });
    return Object.fromEntries(
      groundNames.map((name, index) => [name, loaded[index]]),
    );
  }, [loaded]);
}

function GroundLayer({ document }: { document: MapDocument }) {
  const textures = useGroundTextures();
  return (
    <>
      {document.ground
        .filter((tile) => isGroundSprite(tile.sprite))
        .map((tile) => (
          <mesh
            key={tile.id}
            position={toWorld(tile, document.size)}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={1}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={textures[tile.sprite]} />
          </mesh>
        ))}
    </>
  );
}

/** Shown for the one frame the floor photos take to load, so ground tiles never flash empty. */
function GroundLayerFallback({ document }: { document: MapDocument }) {
  return (
    <>
      {document.ground
        .filter((tile) => isGroundSprite(tile.sprite))
        .map((tile) => (
          <mesh
            key={tile.id}
            position={toWorld(tile, document.size)}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={1}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={floorColors[tile.sprite]} />
          </mesh>
        ))}
    </>
  );
}

function Scene(props: MapCanvasProps) {
  const { document } = props;
  const textures = useMemo(
    () =>
      Object.fromEntries(
        floorNames
          .filter((name) => name !== "plain")
          .map((name) => [name, makeFloor(name)]),
      ),
    [],
  );
  useEffect(
    () => () => Object.values(textures).forEach((texture) => texture.dispose()),
    [textures],
  );
  const guests = placeGuests(
    document,
    previewCharacters.map((character) =>
      character.name === "あなた" && props.playerSrc
        ? { ...character, src: props.playerSrc }
        : character,
    ),
  );

  return (
    <>
      <CameraFit mapSize={document.size} resetKey={props.resetKey ?? 0} />
      <MapControls
        enabled={!props.paused}
        key={`${props.resetKey ?? 0}-${document.size.columns}-${document.size.rows}`}
        makeDefault
        enableRotate={false}
        enableDamping={false}
        screenSpacePanning={false}
        minZoom={1}
        maxZoom={500}
        mouseButtons={{
          LEFT: props.pan ? MOUSE.PAN : undefined,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.PAN,
        }}
      />
      {!props.paused && <PointerInput onSelect={props.onSelect} />}

      {document.ground
        .filter((tile) => !isGroundSprite(tile.sprite))
        .map((tile) => (
          <mesh
            key={tile.id}
            position={toWorld(tile, document.size)}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={1}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={tile.sprite === "plain" ? null : textures[tile.sprite]}
              color={
                tile.sprite === "plain"
                  ? (tile.color ?? floorColors.plain)
                  : "#ffffff"
              }
            />
          </mesh>
        ))}

      <Suspense fallback={<GroundLayerFallback document={document} />}>
        <GroundLayer document={document} />
      </Suspense>

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
            order={1000 + Math.round((entity.column + entity.row) * 100)}
            entityId={entity.id}
          />
        );
      })}

      {document.npcs.map((npc) => (
        <group key={npc.id}>
          <ImageSprite
            src={systemNpcCatalog[npc.asset].src}
            position={toWorld(npc, document.size)}
            width={0.7}
            height={1.05}
            order={1001 + (npc.column + npc.row) * 100}
            entityId={npc.id}
          />
          <CharacterLabel
            cell={npc}
            mapSize={document.size}
            name={npc.name}
            message={npc.message}
            display={document.display}
          />
        </group>
      ))}

      {props.showCharacters &&
        guests.map((character) => (
          <group key={character.name}>
            <ImageSprite
              src={character.src}
              position={toWorld(character, document.size)}
              width={0.7}
              height={1.05}
              order={
                1001 + Math.round((character.column + character.row) * 100)
              }
              entityId={`guest:${character.name}`}
            />
            <CharacterLabel
              cell={character}
              mapSize={document.size}
              name={character.name}
              message={document.display.characterBubble}
              display={document.display}
            />
          </group>
        ))}
    </>
  );
}

export function MapCanvas(props: MapCanvasProps) {
  return (
    <Canvas
      orthographic
      camera={{
        position: cameraPosition(props.document.size),
        near: 0.1,
        far: 1_000,
        zoom: 45,
      }}
      dpr={[1, 2]}
      frameloop={props.paused ? "never" : "demand"}
      gl={{ antialias: true }}
      fallback={
        <div className="p-8">WebGLを利用できるブラウザで表示してください。</div>
      }
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
