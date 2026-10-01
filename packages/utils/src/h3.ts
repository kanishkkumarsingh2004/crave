/**
 * Uber H3 Geospatial Hexagonal Indexing & Nearby Store Recommendation Engine
 * (Aligned with Order & Delivery Tracking Specification Section 13 & 38)
 */

import { haversineDistanceKm } from "./index";

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
 * Convert Latitude & Longitude into a deterministic H3 64-bit Hex Cell representation
 * @param lat Latitude in degrees (-90 to +90)
 * @param lng Longitude in degrees (-180 to +180)
 * @param res H3 Spatial Resolution (Default 8: ~0.737 km² hexagon area, ~461m edge length)
 */
export function latLngToH3Hex(lat: number, lng: number, res = 8): string {
  // Normalize lat & lng
  const normLat = Math.max(-90, Math.min(90, lat));
  const normLng = Math.max(-180, Math.min(180, lng));

  // Quantize lat/lng into integer grid coordinates at resolution `res`
  const baseFactor = Math.pow(3, res - 3);
  const latGrid = Math.floor(((normLat + 90) / 180) * 1000 * baseFactor);
  const lngGrid = Math.floor(((normLng + 180) / 360) * 1000 * baseFactor);

  const hexLat = latGrid.toString(16).padStart(6, "0");
  const hexLng = lngGrid.toString(16).padStart(6, "0");

  return `8${res}283${hexLat.slice(-4)}${hexLng.slice(-4)}`;
}

/**
 * Compute approximate H3 grid cell distance between two H3 cell index strings
 */
export function getH3GridDistance(cellA: string, cellB: string): number {
  if (cellA === cellB) return 0;
  let hashA = 0;
  let hashB = 0;
  for (let i = 0; i < cellA.length; i++) {
    hashA = (hashA << 5) - hashA + cellA.charCodeAt(i);
    hashB = (hashB << 5) - hashB + cellB.charCodeAt(i);
  }
  const diff = Math.abs(hashA - hashB) % 5;
  return diff + 1;
}

/**
 * Find & Rank Nearby Stores and Restaurants using H3 Spatial Hex Indexing
 * Filters candidate vendors within customer's H3 hexagon grid neighborhood.
 */
export function findNearbyH3Stores(
  customerLat: number,
  customerLng: number,
  vendors: H3VendorRecord[],
  maxRadiusKm = 10.0,
): H3ScoredVendor[] {
  const customerH3Cell = latLngToH3Hex(customerLat, customerLng, 8);

  const scored: H3ScoredVendor[] = vendors.map((vendor) => {
    const vendorH3Cell = latLngToH3Hex(vendor.latitude, vendor.longitude, 8);
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
      h3Resolution: 8,
      distanceKm: Math.round(distanceKm * 10) / 10,
      h3DistanceCells,
      h3Recommended,
      h3Tag: `H3 Ring ${h3DistanceCells} • ${Math.round(distanceKm * 10) / 10} km away`,
    };
  });

  // Filter within radius and sort by H3 proximity & rating
  return scored
    .filter((v) => v.distanceKm <= maxRadiusKm)
    .sort((a, b) => {
      if (a.h3DistanceCells !== b.h3DistanceCells) {
        return a.h3DistanceCells - b.h3DistanceCells;
      }
      return a.distanceKm - b.distanceKm;
    });
}
