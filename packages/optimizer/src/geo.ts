import type { LatLng } from "./types.js";

const R = 6_371_000; // Earth radius, meters
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export type XY = readonly [number, number];

/**
 * Local equirectangular projection around `ref`.
 * Optimizing on raw lat/lng treats a degree of longitude as equal to a degree
 * of latitude, which only holds at the equator - at 50 degrees N a lng degree
 * is ~64% the length of a lat degree, so results skew east-west. Projecting to
 * meters first keeps the optimization isotropic.
 */
export function toXY(p: LatLng, ref: LatLng): XY {
  return [
    R * rad(p.lng - ref.lng) * Math.cos(rad(ref.lat)),
    R * rad(p.lat - ref.lat),
  ];
}

export function toLatLng([x, y]: XY, ref: LatLng): LatLng {
  return {
    lat: ref.lat + deg(y / R),
    lng: ref.lng + deg(x / (R * Math.cos(rad(ref.lat)))),
  };
}

export function dist(a: XY, b: XY): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
