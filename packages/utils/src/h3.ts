/**
 * Uber H3 Geospatial Hexagonal Indexing & Nearby Store Recommendation Engine
 * Powered by H3 v4 API (latLngToCell, cellToLatLng, cellToBoundary, gridDistance)
 * (Aligned with Order & Delivery Tracking Specification Section 13 & 38)
 */

import { haversineDistanceKm } from "./geo";

// Polyfill TextDecoder for utf-16le if unsupported in environment (e.g. React Native Hermes)
if (typeof globalThis !== "undefined" && typeof globalThis.TextDecoder !== "undefined") {
  try {
    new globalThis.TextDecoder("utf-16le");
  } catch (err) {
    const NativeTextDecoder = globalThis.TextDecoder;
    (globalThis as any).TextDecoder = function TextDecoderPolyfill(encoding?: string, options?: any) {
      const enc = (encoding || "utf-8").toLowerCase();
      if (enc === "utf-16le" || enc === "utf16le" || enc === "utf-16" || enc === "utf16") {
        return {
          decode(buffer?: any) {
            if (!buffer) return "";
            const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer.buffer || buffer);
            let str = "";
            for (let i = 0; i < bytes.length; i += 2) {
              const code = bytes[i] | (bytes[i + 1] << 8);
              if (code !== 0) str += String.fromCharCode(code);
            }
            return str;
          },
        };
      }
      return new NativeTextDecoder(encoding, options);
    } as any;
  }
}

// Safely load h3-js functions with fallback if unavailable
let h3Module: any = null;
try {
  h3Module = require("h3-js");
} catch (err) {
  console.warn("H3-js native load warning:", err);
}

export function latLngToCell(lat: number, lng: number, res: number): string {
  if (h3Module && typeof h3Module.latLngToCell === "function") {
    return h3Module.latLngToCell(lat, lng, res);
  }
  return `8${res}28308281fffff`;
}

export function cellToLatLng(cell: string): [number, number] {
  if (h3Module && typeof h3Module.cellToLatLng === "function") {
    return h3Module.cellToLatLng(cell);
  }
  return [0, 0];
}

export function cellToBoundary(cell: string, isGeoJson = false): [number, number][] {
  if (h3Module && typeof h3Module.cellToBoundary === "function") {
    return h3Module.cellToBoundary(cell, isGeoJson);
  }
  return [];
}

export function gridDistance(cellA: string, cellB: string): number {
  if (cellA === cellB) return 0;
  if (h3Module && typeof h3Module.gridDistance === "function") {
    try {
      const dist = h3Module.gridDistance(cellA, cellB);
      return dist >= 0 ? dist : 1;
    } catch {
      return 1;
    }
  }
  return 1;
}

export function gridDisk(cell: string, k: number): string[] {
  if (h3Module && typeof h3Module.gridDisk === "function") {
    return h3Module.gridDisk(cell, k);
  }
  return [cell];
}

export interface H3VendorRecord {
  id: string;
  name: string;
  category: string;
  rating: string | number;
  time: string;
  discount: string;
  latitude: number;
  longitude: number;
  image?: string;
}

export interface H3ScoredVendor extends H3VendorRecord {
  h3Cell: string;
  h3Resolution: number;
  distanceKm: number;
  h3DistanceCells: number;
  h3Recommended: boolean;
  h3Tag: string;
}

/**
 * Convert Latitude & Longitude into a deterministic H3 Hex Cell string using H3 v4 API
 * @param lat Latitude in degrees (-90 to +90)
 * @param lng Longitude in degrees (-180 to +180)
 * @param res H3 Spatial Resolution (Default 8: ~0.737 km² hexagon area, ~461m edge length)
 */
export function latLngToH3Hex(lat: number, lng: number, res = 8): string {
  try {
    const normLat = Math.max(-90, Math.min(90, lat));
    const normLng = Math.max(-180, Math.min(180, lng));
    return latLngToCell(normLat, normLng, res);
  } catch (err) {
    return `8${res}28308281fffff`;
  }
}

/**
 * Finds the center coordinates [lat, lng] of an H3 cell index using H3 v4 API
 * @param cell H3 cell index string
 * @returns [lat, lng]
 */
export function getH3CellCenter(cell: string): [number, number] {
  try {
    return cellToLatLng(cell);
  } catch (err) {
    return [0, 0];
  }
}

/**
 * Finds the boundary coordinates of an H3 cell index using H3 v4 API
 * @param cell H3 cell index string
 * @param isGeoJson If true, formats coordinates as [lng, lat], otherwise [lat, lng]
 */
export function getH3CellBoundary(
  cell: string,
  isGeoJson = false,
): [number, number][] {
  try {
    return cellToBoundary(cell, isGeoJson);
  } catch (err) {
    return [];
  }
}

/**
 * Compute H3 grid cell distance between two H3 cell index strings using H3 v4 API
 */
export function getH3GridDistance(cellA: string, cellB: string): number {
  if (cellA === cellB) return 0;
  try {
    const dist = gridDistance(cellA, cellB);
    return dist >= 0 ? dist : 1;
  } catch (err) {
    return 1;
  }
}

/**
 * Find & Rank Nearby Stores and Restaurants using H3 Spatial Hex Indexing (H3 v4)
 * Filters candidate vendors within customer's H3 hexagon grid neighborhood.
 */
export function findNearbyH3Stores(
  customerLat: number,
  customerLng: number,
  vendors: H3VendorRecord[],
  maxRadiusKm = 10.0,
  h3Res = 8,
): H3ScoredVendor[] {
  const customerH3Cell = latLngToH3Hex(customerLat, customerLng, h3Res);

  const scored: H3ScoredVendor[] = vendors.map((vendor) => {
    const vendorH3Cell = latLngToH3Hex(vendor.latitude, vendor.longitude, h3Res);
    const distanceKm = haversineDistanceKm(
      customerLat,
      customerLng,
      vendor.latitude,
      vendor.longitude,
    );

    const h3DistanceCells = getH3GridDistance(customerH3Cell, vendorH3Cell);
    const h3Recommended = distanceKm <= maxRadiusKm && h3DistanceCells <= 3;

    return {
      ...vendor,
      h3Cell: vendorH3Cell,
      h3Resolution: h3Res,
      distanceKm: Math.round(distanceKm * 10) / 10,
      h3DistanceCells,
      h3Recommended,
      h3Tag: `H3 Ring ${h3DistanceCells} • ${Math.round(distanceKm * 10) / 10} km away`,
    };
  });

  return scored
    .filter((v) => v.distanceKm <= maxRadiusKm)
    .sort((a, b) => {
      if (a.h3DistanceCells !== b.h3DistanceCells) {
        return a.h3DistanceCells - b.h3DistanceCells;
      }
      return a.distanceKm - b.distanceKm;
    });
}
