import type { Cell, MapDocument } from "./map-data";

/** 参加者は配置可能な床に置き、建物・NPCとの重なりを避けます。 */
export function placeGuests<T extends Cell>(
  document: MapDocument,
  guests: T[],
): T[] {
  const occupied = new Set(
    [...document.npcs, ...document.entities].map(
      (item) => `${Math.round(item.column)},${Math.round(item.row)}`,
    ),
  );
  const available = document.ground.filter(
    (tile) => tile.spawnAllowed && !occupied.has(`${tile.column},${tile.row}`),
  );
  const anchors: Cell[] = [...document.npcs];

  return guests.flatMap((guest) => {
    const spaced = available.filter((tile) =>
      anchors.every((anchor) => {
        const dx = tile.column - tile.row - (anchor.column - anchor.row);
        const dy = (tile.column + tile.row - (anchor.column + anchor.row)) / 2;
        return dx * dx + dy * dy >= 12;
      }),
    );
    const candidates = spaced.length ? spaced : available;
    const nearest = candidates.toSorted(
      (a, b) =>
        Math.abs(a.column - guest.column) +
        Math.abs(a.row - guest.row) -
        (Math.abs(b.column - guest.column) + Math.abs(b.row - guest.row)),
    )[0];
    if (!nearest) return [];

    available.splice(available.indexOf(nearest), 1);
    anchors.push(nearest);
    return [{ ...guest, column: nearest.column, row: nearest.row }];
  });
}
