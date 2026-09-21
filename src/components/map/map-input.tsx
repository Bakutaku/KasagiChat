"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Raycaster, Vector2 } from "three";
import { beginTap, isTap, moveTap, type TapState } from "./map-geometry";
import type { MapSpot } from "./map-types";

export function MapInput({
  spots,
  onSelect,
}: {
  spots: MapSpot[];
  onSelect?: (spot: MapSpot | null) => void;
}) {
  const { camera, gl, scene } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const ray = new Raycaster();
    let start: TapState = null;
    const pointers = new Set<number>();
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointers.add(event.pointerId);
      start = beginTap(start, event.pointerId, event.clientX, event.clientY);
      if (pointers.size > 1 && start) start.cancelled = true;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId === start?.pointerId)
        start = moveTap(start, event.clientX, event.clientY);
    };
    const up = (event: PointerEvent) => {
      const select =
        pointers.size === 1 &&
        isTap(start, event.pointerId, event.clientX, event.clientY);
      pointers.delete(event.pointerId);
      if (!pointers.size) start = null;
      if (!select) return;
      const bounds = canvas.getBoundingClientRect();
      ray.setFromCamera(
        new Vector2(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray
        .intersectObjects(scene.children, true)
        .filter((hit) => hit.object.userData.spotId)
        .sort((a, b) => b.object.renderOrder - a.object.renderOrder)[0];
      onSelect?.(
        spots.find((spot) => spot.id === hit?.object.userData.spotId) ?? null,
      );
    };
    const cancel = () => {
      start = null;
      pointers.clear();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("lostpointercapture", cancel);
    canvas.addEventListener("pointerleave", cancel);
    window.addEventListener("blur", cancel);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", cancel);
      canvas.removeEventListener("pointerleave", cancel);
      window.removeEventListener("blur", cancel);
    };
  }, [camera, gl, scene, spots, onSelect]);
  return null;
}
