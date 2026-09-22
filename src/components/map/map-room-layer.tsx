"use client";

import type { MapRoom, MapSize } from "./map-types";

type Triple = [number, number, number];

function Block({ position, size, color }: { position: Triple; size: Triple; color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/** 壁面と同じローカル座標で窓枠・桟・窓台を組み立てます。 */
function Window({ width, height, trim }: { width: number; height: number; trim: string }) {
  return (
    <group>
      <Block position={[0, 0, 0]} size={[width + 0.14, height + 0.14, 0.08]} color={trim} />
      <Block position={[0, 0, 0.05]} size={[width, height, 0.03]} color="#c4dad2" />
      <Block position={[0, -height * 0.24, 0.075]} size={[width, height * 0.48, 0.015]} color="#a5c1aa" />
      <Block position={[0, 0, 0.09]} size={[0.055, height, 0.035]} color="#fff0d7" />
      <Block position={[0, 0, 0.09]} size={[width, 0.055, 0.035]} color="#fff0d7" />
      <Block position={[0, -height / 2 - 0.08, 0.1]} size={[width + 0.3, 0.09, 0.3]} color={trim} />
    </group>
  );
}

/**
 * 床の外縁（セル中心から半マス外側）に奥の二面だけを立てます。
 * 前面は開放し、配置地点を隠しません。室内指定のない街・会場には描画しません。
 * 床・壁は不透明な奥のレイヤー、家具と配置品は既存の列+行順で手前に描画します。
 */
export function MapRoomLayer({ size, room }: { size: MapSize; room?: MapRoom }) {
  if (!room) return null;
  const { columns, rows } = size;
  const { wallHeight: height, wallColor, accentColor, trimColor } = room;
  const back = -rows / 2 - 0.06;
  const left = -columns / 2 - 0.06;
  return (
    <group>
      <Block position={[0, -0.16, 0]} size={[columns + 0.26, 0.3, rows + 0.26]} color={trimColor} />
      <Block position={[0, height / 2, back]} size={[columns + 0.24, height, 0.12]} color={wallColor} />
      <Block position={[left, height / 2, 0]} size={[0.12, height, rows + 0.24]} color={accentColor} />
      <Block position={[0, 0.14, back + 0.09]} size={[columns, 0.28, 0.075]} color={trimColor} />
      <Block position={[left + 0.09, 0.14, 0]} size={[0.075, 0.28, rows]} color={trimColor} />
      <Block position={[0, height, back]} size={[columns + 0.24, 0.09, 0.19]} color={trimColor} />
      <Block position={[left, height, 0]} size={[0.19, 0.09, rows + 0.24]} color={trimColor} />
      {/* 小さいマップでは窓幅を縮め、壁からはみ出さないようにします。 */}
      <group position={[columns * 0.12, height * 0.63, back + 0.08]}>
        <Window width={Math.min(1.8, columns * 0.5)} height={height * 0.42} trim={trimColor} />
      </group>
      <group position={[left + 0.08, height * 0.63, -rows * 0.04]} rotation={[0, Math.PI / 2, 0]}>
        <Window width={Math.min(1.5, rows * 0.5)} height={height * 0.42} trim={trimColor} />
      </group>
    </group>
  );
}
