"use client";

import type { MapBackdrop, MapSize } from "./map-types";

type Triple = [number, number, number];

function Block({ position, size, color }: { position: Triple; size: Triple; color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function Hill({ position, radius, color, rotation }: {
  position: Triple;
  radius: number;
  color: string;
  rotation?: Triple;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <circleGeometry args={[radius, 32]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/**
 * 屋外マップの床を厚い箱庭にし、カメラ奥の二面だけへ空と丘の遠景を置きます。
 * 前面は開放して操作対象を隠さず、街固有の建物やキャラクターにも依存しません。
 */
export function MapBackdropLayer({ size, backdrop }: { size: MapSize; backdrop?: MapBackdrop }) {
  if (!backdrop) return null;
  const { columns, rows } = size;
  const { height, baseThickness, baseColor, skyColor, distantColor, landscapeColor } = backdrop;
  const back = -rows / 2 - 0.13;
  const left = -columns / 2 - 0.13;
  const rearHills = [
    { offset: -0.34, radius: 1.25 },
    { offset: -0.08, radius: 1.65 },
    { offset: 0.27, radius: 1.05 },
  ];

  return (
    <group>
      <Block
        position={[0, -baseThickness / 2 - 0.02, 0]}
        size={[columns + 0.34, baseThickness, rows + 0.34]}
        color={baseColor}
      />
      <Block position={[0, height / 2, back]} size={[columns + 0.34, height, 0.16]} color={skyColor} />
      <Block position={[left, height / 2, 0]} size={[0.16, height, rows + 0.34]} color={distantColor} />
      {rearHills.map(({ offset, radius }, index) => (
        <Hill
          key={`back:${offset}`}
          position={[columns * offset, radius * 0.45, back + 0.09 + index * 0.006]}
          radius={radius}
          color={index === 1 ? distantColor : landscapeColor}
        />
      ))}
      {rearHills.map(({ offset, radius }, index) => (
        <Hill
          key={`left:${offset}`}
          position={[left + 0.09 + index * 0.006, radius * 0.45, rows * offset]}
          radius={radius}
          color={index === 1 ? landscapeColor : distantColor}
          rotation={[0, Math.PI / 2, 0]}
        />
      ))}
      <Block position={[0, 0.25, back + 0.11]} size={[columns + 0.1, 0.5, 0.08]} color={landscapeColor} />
      <Block position={[left + 0.11, 0.25, 0]} size={[0.08, 0.5, rows + 0.1]} color={landscapeColor} />
    </group>
  );
}
