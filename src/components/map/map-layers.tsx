"use client";

import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import {
  LinearFilter,
  NearestFilter,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from "three";
import { makeFloor } from "./floor-texture";
import { toWorld } from "./map-geometry";
import {
  floorColors,
  floorNames,
  groundNames,
  type MapDocument,
} from "./map-types";

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
        map={textures.get(tile.sprite) ?? null}
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
  character = false,
}: {
  src: string;
  position: [number, number, number];
  width: number;
  height: number;
  order: number;
  spotId?: string;
  character?: boolean;
}) {
  const source = useLoader(TextureLoader, src);
  const texture = useMemo(() => {
    const clone = source.clone();
    clone.colorSpace = SRGBColorSpace;
    clone.magFilter = character ? LinearFilter : NearestFilter;
    clone.needsUpdate = true;
    return clone;
  }, [source, character]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite
      position={position}
      center={[0.5, 0]}
      scale={[width, height, 1]}
      renderOrder={order}
      userData={{ spotId }}
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
