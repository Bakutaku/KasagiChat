"use client";

import { useEffect, useState } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { NearestFilter, SRGBColorSpace, TextureLoader, type Texture } from "three";
import { LuCheck, LuPlus } from "react-icons/lu";
import { toWorld } from "./map-geometry";
import { visibleImageBounds } from "./map-image-bounds";
import type { MapDocument, MapObjectEditing, MapPlacementAnchor, RuntimeMapObject } from "./map-types";
import styles from "./map-object-layer.module.css";

/** 動的画像の失敗を部屋全体へ波及させず、その品だけローカル画像へ戻します。 */
function ObjectSprite({ object, anchor, document }: {
  object: RuntimeMapObject;
  anchor: MapPlacementAnchor;
  document: MapDocument;
}) {
  const [loaded, setLoaded] = useState<{ src: string; texture: Texture; aspect: number } | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    let active = true;
    const textures: Texture[] = [];
    const loader = new TextureLoader();
    function load(src: string) {
      const texture = loader.load(src, (result) => {
        if (!active) return;
        const image = result.image as HTMLImageElement;
        let aspect = image.width / image.height;
        // 透過PNGの余白が大きくても、品物の底辺が配置地点から浮かないようUVを合わせます。
        try {
          const canvas = window.document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d");
          if (context) {
            context.drawImage(image, 0, 0);
            const bounds = visibleImageBounds(context.getImageData(0, 0, image.width, image.height).data, image.width, image.height);
            result.repeat.set(bounds.width / image.width, bounds.height / image.height);
            result.offset.set(bounds.left / image.width, 1 - (bounds.top + bounds.height) / image.height);
            aspect = bounds.width / bounds.height;
          }
        } catch {
          // 画素読取を許可しない配信元では元画像の比率をそのまま使います。
        }
        result.colorSpace = SRGBColorSpace;
        result.magFilter = NearestFilter;
        result.needsUpdate = true;
        setLoaded({ src: object.src, texture: result, aspect });
        invalidate();
      }, undefined, () => {
        if (active && src !== object.fallbackSrc) load(object.fallbackSrc);
      });
      textures.push(texture);
    }
    load(object.src);
    return () => {
      active = false;
      textures.forEach((texture) => texture.dispose());
    };
  }, [object.src, object.fallbackSrc, invalidate]);
  if (!loaded || loaded.src !== object.src) return null;
  const texture = loaded.texture;
  const aspect = loaded.aspect;
  const width = Math.min(anchor.width, anchor.height * aspect);
  const height = width / aspect;
  return (
    <sprite
      position={toWorld(anchor, document.size)}
      center={[0.5, 0]}
      scale={[width, height, 1]}
      renderOrder={1001 + Math.round((anchor.column + anchor.row) * 100)}
    >
      <spriteMaterial map={texture} transparent alphaTest={0.08} depthTest={false} depthWrite={false} />
    </sprite>
  );
}

/** 画像と操作ボタンは同一のマップ座標・カメラを使います。画面の%位置は持ちません。 */
export function MapObjectLayer({ document, objects = [], editing, paused }: {
  document: MapDocument;
  objects?: readonly RuntimeMapObject[];
  editing?: MapObjectEditing;
  paused: boolean;
}) {
  return document.placementAnchors.map((anchor) => {
    const object = objects.find((item) => item.anchorId === anchor.id);
    const available = !object && editing?.availableAnchorIds.includes(anchor.id);
    const selected = !!object && object.id === editing?.selectedId;
    const position = toWorld(anchor, document.size);
    return (
      <group key={anchor.id}>
        {object && <ObjectSprite object={object} anchor={anchor} document={document} />}
        {editing?.anchorIds.includes(anchor.id) && (
          <Html position={[position[0], 0.25, position[2]]} center zIndexRange={[7, 6]}>
            {object || available ? (
              <button
                type="button"
                className={`${styles.anchor} ${selected ? styles.selected : ""} ${available ? styles.available : ""}`}
                disabled={paused || editing.disabled}
                aria-pressed={object ? selected : undefined}
                aria-label={object ? `${anchor.label}の${object.name}を選択` : `${anchor.label}に選択中のアイテムを配置`}
                title={object ? object.name : anchor.label}
                onClick={() => object ? editing.onSelectObject(object.id) : editing.onSelectAnchor(anchor.id)}
              >
                {selected ? <LuCheck aria-hidden="true" /> : available ? <LuPlus aria-hidden="true" /> : <span aria-hidden="true">{anchor.label}</span>}
              </button>
            ) : (
              <span className={`${styles.anchor} ${styles.empty}`} aria-label={`${anchor.label}、空き`}>
                {anchor.label}
              </span>
            )}
          </Html>
        )}
      </group>
    );
  });
}
