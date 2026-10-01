import { describe, it, expect } from "vitest";
import { findShortestPathAStar, findNearestNode, DEFAULT_ROAD_NODES } from "../aStar";

describe("A* (A-Star) Pathfinding Algorithm", () => {
  it("finds the nearest graph node for a given GPS coordinate", () => {
    const gpsLocation = { latitude: 12.9348, longitude: 77.6105 };
    const nearest = findNearestNode(gpsLocation);

    expect(nearest).toBeDefined();
    expect(nearest.id).toBe("node-1");
  });

  it("calculates shortest path and waypoints between start and destination", () => {
    const driverGps = { latitude: 12.9308, longitude: 77.6085 }; // Near Forum Mall (node-9)
    const customerDestination = { latitude: 12.9392, longitude: 77.6248 }; // Near Outer Ring Road (node-8)

    const result = findShortestPathAStar(driverGps, customerDestination);

    expect(result).toBeDefined();
    expect(result.path.length).toBeGreaterThan(2);
    expect(result.totalDistanceKm).toBeGreaterThan(0);
    expect(result.estimatedMins).toBeGreaterThan(0);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.startPoint).toEqual(driverGps);
    expect(result.endPoint).toEqual(customerDestination);
  });

  it("handles identical start and end locations gracefully", () => {
    const loc = { latitude: 12.9345, longitude: 77.6101 };
    const result = findShortestPathAStar(loc, loc);

    expect(result).toBeDefined();
    expect(result.totalDistanceKm).toBe(0);
    expect(result.path.length).toBeGreaterThanOrEqual(2);
  });
});
