"use client";

import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import {
  LinearFilter,
  CanvasTexture,
  NearestFilter,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from "three";
import { makeFloor } from "./floor-texture";
import { toWorld } from "./map-geometry";
import { visibleImageBounds } from "./map-image-bounds";
import {
  floorColors,
  floorNames,
  groundNames,
  type MapDocument,
  type MapFloor,
} from "./map-types";

function floorKey(tile: MapFloor) {
  return `${tile.sprite}:${tile.tone?.color ?? ""}:${tile.tone?.mix ?? ""}`;
}

export function GroundLayer({ document }: { document: MapDocument }) {
  const usedGround = useMemo(
    () =>
      groundNames.filter((name) =>
        document.ground.some((tile) => tile.sprite === name),
      ),
    [document],
  );
  const sources = useLoader(
    TextureLoader,
    usedGround.map((name) => `/assets/map/floor/${name}.png`),
  );
  const textures = useMemo(() => {
    const result = new Map<string, Texture>();
    usedGround.forEach((name, index) => {
      const texture = sources[index].clone();
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;
      result.set(name, texture);
    });
    floorNames.forEach((name) => {
      if (
        name !== "plain" &&
        document.ground.some((tile) => tile.sprite === name)
      )
        result.set(name, makeFloor(name));
    });
    // 調色は凡例ごとに一度だけ行い、全タイルで同じテクスチャを共有します。
    // 元画像やuseLoaderのキャッシュを書き換えず、室内の既存色も維持します。
    document.ground.forEach((tile) => {
      if (!tile.tone || result.has(floorKey(tile))) return;
      const source = result.get(tile.sprite);
      if (!source) return;
      const canvas = window.document.createElement("canvas");
      const image = source.image as HTMLImageElement | HTMLCanvasElement;
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      context.globalAlpha = tile.tone.mix;
      context.fillStyle = tile.tone.color;
      context.fillRect(0, 0, canvas.width, canvas.height);
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.magFilter = NearestFilter;
      result.set(floorKey(tile), texture);
    });
    return result;
  }, [document, sources, usedGround]);
  useEffect(
    () => () => textures.forEach((texture) => texture.dispose()),
    [textures],
  );
  return document.ground.map((tile) => (
    <mesh
      key={`${tile.column}:${tile.row}`}
      position={toWorld(tile, document.size)}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={textures.get(floorKey(tile)) ?? textures.get(tile.sprite) ?? null}
        color={
          tile.color ??
          (tile.sprite === "plain" ? floorColors.plain : "#ffffff")
        }
      />
    </mesh>
  ));
}

export function ImageSprite({
  src,
  position,
  width,
  height,
  order,
  spotId,
  characterId,
  character = false,
  trimTransparent = false,
}: {
  src: string;
  position: [number, number, number];
  width: number;
  height: number;
  order: number;
  spotId?: string;
  characterId?: string;
  character?: boolean;
  trimTransparent?: boolean;
}) {
  const source = useLoader(TextureLoader, src);
  const { texture, aspect } = useMemo(() => {
    const clone = source.clone();
    let aspect: number | undefined;
    if (trimTransparent) {
      const image = source.image as HTMLImageElement;
      const canvas = window.document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(image, 0, 0);
        const bounds = visibleImageBounds(context.getImageData(0, 0, image.width, image.height).data, image.width, image.height);
        clone.repeat.set(bounds.width / image.width, bounds.height / image.height);
        clone.offset.set(bounds.left / image.width, 1 - (bounds.top + bounds.height) / image.height);
        aspect = bounds.width / bounds.height;
      }
    }
    clone.colorSpace = SRGBColorSpace;
    clone.magFilter = character ? LinearFilter : NearestFilter;
    clone.needsUpdate = true;
    return { texture: clone, aspect };
  }, [source, character, trimTransparent]);
  useEffect(() => () => texture.dispose(), [texture]);
  const fittedWidth = aspect ? Math.min(width, height * aspect) : width;
  const fittedHeight = aspect ? fittedWidth / aspect : height;
  return (
    <sprite
      position={position}
      center={[0.5, 0]}
      scale={[fittedWidth, fittedHeight, 1]}
      renderOrder={order}
      userData={{ spotId, characterId }}
    >
      <spriteMaterial
        map={texture}
        transparent
        alphaTest={0.08}
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  );
}
