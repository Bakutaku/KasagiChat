"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Raycaster, Vector2 } from "three";
import { beginTap, isTap, moveTap, type TapState } from "./map-geometry";
import type { MapHover, MapSpot, RuntimeMapCharacter } from "./map-types";

export function MapInput({
  spots,
  characters,
  onSelect,
  onSelectCharacter,
  onHover,
}: {
  spots: MapSpot[];
  characters: readonly RuntimeMapCharacter[];
  onSelect?: (spot: MapSpot | null) => void;
  onSelectCharacter?: (character: RuntimeMapCharacter) => void;
  onHover?: (hover: MapHover | null) => void;
}) {
  const { camera, gl, scene } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const ray = new Raycaster();
    let start: TapState = null;
    const pointers = new Set<number>();
    const hitAt = (event: PointerEvent): MapHover | null => {
      const bounds = canvas.getBoundingClientRect();
      ray.setFromCamera(
        new Vector2(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        ), camera,
      );
      const hit = ray.intersectObjects(scene.children, true)
        .filter(({ object }) => object.userData.spotId || object.userData.characterId)
        .sort((a, b) => b.object.renderOrder - a.object.renderOrder)[0];
      if (!hit) return null;
      return {
        kind: hit.object.userData.characterId ? "character" : "spot",
        id: hit.object.userData.characterId ?? hit.object.userData.spotId,
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
    };
    const clearHover = () => {
      onHover?.(null);
      canvas.style.cursor = "";
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      clearHover();
      pointers.add(event.pointerId);
      start = beginTap(start, event.pointerId, event.clientX, event.clientY);
      if (pointers.size > 1 && start) start.cancelled = true;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId === start?.pointerId)
        start = moveTap(start, event.clientX, event.clientY);
      // パン・ピンチ中とタッチでは浮かべず、マウス／ペンの静止した対象だけ案内します。
      if (pointers.size || event.pointerType === "touch") return;
      const hit = hitAt(event);
      onHover?.(hit);
      canvas.style.cursor = hit ? "pointer" : "";
    };
    const up = (event: PointerEvent) => {
      const select =
        pointers.size === 1 &&
        isTap(start, event.pointerId, event.clientX, event.clientY);
      pointers.delete(event.pointerId);
      if (!pointers.size) start = null;
      if (!select) return;
      clearHover();
      const hit = hitAt(event);
      if (hit?.kind === "character") {
        const character = characters.find((character) => character.id === hit.id);
        if (character) onSelectCharacter?.(character);
      } else {
        onSelect?.(spots.find((spot) => spot.id === hit?.id) ?? null);
      }
    };
    const cancel = () => {
      start = null;
      pointers.clear();
      clearHover();
    };
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearHover();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("lostpointercapture", cancel);
    canvas.addEventListener("pointerleave", cancel);
    canvas.addEventListener("wheel", clearHover, { passive: true });
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", dismiss);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", cancel);
      canvas.removeEventListener("pointerleave", cancel);
      canvas.removeEventListener("wheel", clearHover);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", dismiss);
      canvas.style.cursor = "";
      onHover?.(null);
    };
  }, [camera, gl, scene, spots, characters, onSelect, onSelectCharacter, onHover]);
  return null;
}
