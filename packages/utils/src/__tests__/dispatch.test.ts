import { describe, it, expect } from "vitest";
import { rankDriverCandidates, findOptimalDeliveryBatch, DriverCandidate } from "../dispatch";

describe("Dispatch Algorithm", () => {
  const mockPickup = { latitude: 12.9716, longitude: 77.5946 }; // Bangalore Center

  const mockDrivers: DriverCandidate[] = [
    {
      id: "drv-far",
      name: "Ramesh Driver",
      phone: "+919876543210",
      latitude: 13.0,
      longitude: 77.6, // ~32 km away
      rating: 5.0,
      currentActiveDeliveries: 0,
      vehicleType: "BIKE",
      isOnline: true,
      status: "APPROVED",
    },
    {
      id: "drv-near-busy",
      name: "Suresh Driver",
      phone: "+919876543211",
      latitude: 12.972,
      longitude: 77.595, // ~100m away
      rating: 4.2,
      currentActiveDeliveries: 1,
      vehicleType: "BIKE",
      isOnline: true,
      status: "APPROVED",
    },
    {
      id: "drv-near-free",
      name: "Mahesh Driver",
      phone: "+919876543212",
      latitude: 12.973,
      longitude: 77.596, // ~200m away
      rating: 4.9,
      currentActiveDeliveries: 0,
      vehicleType: "BIKE",
      isOnline: true,
      status: "APPROVED",
    },
    {
      id: "drv-offline",
      name: "Dinesh Driver",
      phone: "+919876543213",
      latitude: 12.9716,
      longitude: 77.5946,
      rating: 5.0,
      currentActiveDeliveries: 0,
      vehicleType: "BIKE",
      isOnline: false,
      status: "APPROVED",
    },
  ];

  it("filters out offline drivers and ranks nearest free driver first", () => {
    const ranked = rankDriverCandidates(mockPickup, mockDrivers);

    expect(ranked.length).toBe(3); // offline driver excluded
    expect(ranked[0].id).toBe("drv-near-free");
  });

  it("calculates realistic ETA and distance metrics", () => {
    const ranked = rankDriverCandidates(mockPickup, mockDrivers);
    const topDriver = ranked[0];

    expect(topDriver.distanceKm).toBeGreaterThan(0);
    expect(topDriver.estimatedEtaMinutes).toBeGreaterThanOrEqual(1);
    expect(topDriver.score).toBeLessThan(ranked[ranked.length - 1].score);
  });

  it("finds optimal delivery batch for close orders", () => {
    const orders = [
      { id: "ord-1", pickup: { latitude: 12.9716, longitude: 77.5946 }, dropoff: { latitude: 12.98, longitude: 77.6 } },
      { id: "ord-2", pickup: { latitude: 12.972, longitude: 77.595 }, dropoff: { latitude: 12.981, longitude: 77.601 } },
      { id: "ord-3", pickup: { latitude: 13.5, longitude: 78.0 }, dropoff: { latitude: 13.6, longitude: 78.1 } }, // Far away
    ];

    const batched = findOptimalDeliveryBatch(orders, 3.0);
    expect(batched.length).toBe(2);
    expect(batched[0].map((o) => o.id)).toContain("ord-1");
    expect(batched[0].map((o) => o.id)).toContain("ord-2");
    expect(batched[1].map((o) => o.id)).toContain("ord-3");
  });
});
