import { describe, it, expect } from "vitest";
import { cleanGpsFix, isInsideGeofence, calculateEmaSpeed } from "../tracking";

describe("Real-Time Tracking & Kinematics", () => {
  it("validates correct GPS coordinates within normal speed limits", () => {
    const prev = { latitude: 12.9352, longitude: 77.6245, timestamp: 100000 };
    const curr = { latitude: 12.9355, longitude: 77.6248, timestamp: 103000 };

    const result = cleanGpsFix(curr, prev);
    expect(result.isValid).toBe(true);
    expect(result.calculatedSpeedKmH).toBeGreaterThan(0);
    expect(result.calculatedSpeedKmH).toBeLessThan(60);
  });

  it("rejects unrealistic GPS teleportation jumps (>120 km/h)", () => {
    const prev = { latitude: 12.9352, longitude: 77.6245, timestamp: 100000 };
    // 50 km jump in 1 second
    const curr = { latitude: 13.5, longitude: 78.1, timestamp: 101000 };

    const result = cleanGpsFix(curr, prev);
    expect(result.isValid).toBe(false);
    expect(result.rejectReason).toContain("Unrealistic speed jump");
  });

  it("detects geofence proximity triggers correctly", () => {
    const storeLat = 12.93524;
    const storeLng = 77.6245;

    // Point ~50m away
    const nearDriverLat = 12.9355;
    const nearDriverLng = 77.6245;

    // Point ~2km away
    const farDriverLat = 12.95;
    const farDriverLng = 77.64;

    expect(isInsideGeofence(nearDriverLat, nearDriverLng, storeLat, storeLng, 100)).toBe(true);
    expect(isInsideGeofence(farDriverLat, farDriverLng, storeLat, storeLng, 100)).toBe(false);
  });

  it("calculates exponential moving average (EMA) speed smoothing", () => {
    const ema = calculateEmaSpeed(30, 20, 0.3);
    expect(ema).toBe(23);
  });
});
