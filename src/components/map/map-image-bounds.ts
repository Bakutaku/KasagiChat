/** 透過余白を除いた描画範囲。画像ファイルを加工せず、接地位置と縮尺を揃えます。 */
export function visibleImageBounds(data: Uint8ClampedArray, width: number, height: number) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= 8) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return right < left
    ? { left: 0, top: 0, width, height }
    : { left, top, width: right - left + 1, height: bottom - top + 1 };
}
