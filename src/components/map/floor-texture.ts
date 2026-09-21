import { CanvasTexture, SRGBColorSpace } from "three";
import { floorColors, floorNames } from "./map-types";

type ProceduralFloorName = Exclude<(typeof floorNames)[number], "plain">;

export function makeFloor(name: ProceduralFloorName) {
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
