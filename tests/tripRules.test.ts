import { test } from "node:test";
import assert from "node:assert/strict";
import type { Driver, Vehicle } from "@prisma/client";
import { assertDispatchable } from "../src/lib/tripRules";

const DAY = 24 * 3600 * 1000;

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "v1",
    registrationNo: "VAN-05",
    name: "Van 05",
    type: "Van",
    region: "Central",
    maxLoadKg: 500,
    odometerKm: 1000,
    acquisitionCost: 20000,
    status: "AVAILABLE",
    createdAt: new Date(),
    ...overrides,
  };
}

function driver(overrides: Partial<Driver> = {}): Driver {
  return {
    id: "d1",
    name: "Alex",
    licenseNo: "LIC-001",
    licenseCategory: "B",
    licenseExpiry: new Date(Date.now() + 365 * DAY),
    phone: "555-0100",
    safetyScore: 100,
    status: "AVAILABLE",
    createdAt: new Date(),
    ...overrides,
  };
}

test("allows an available vehicle and licensed driver within capacity", () => {
  assert.equal(assertDispatchable(vehicle(), driver(), 450), null);
});

test("allows cargo exactly at max capacity", () => {
  assert.equal(assertDispatchable(vehicle({ maxLoadKg: 500 }), driver(), 500), null);
});

test("rejects a vehicle in the shop", () => {
  const violation = assertDispatchable(vehicle({ status: "IN_SHOP" }), driver(), 100);
  assert.match(violation ?? "", /not available/);
});

test("rejects a retired vehicle", () => {
  const violation = assertDispatchable(vehicle({ status: "RETIRED" }), driver(), 100);
  assert.match(violation ?? "", /not available/);
});

test("rejects a vehicle already on a trip (no double-booking)", () => {
  const violation = assertDispatchable(vehicle({ status: "ON_TRIP" }), driver(), 100);
  assert.match(violation ?? "", /not available/);
});

test("rejects a driver already on a trip (no double-booking)", () => {
  const violation = assertDispatchable(vehicle(), driver({ status: "ON_TRIP" }), 100);
  assert.match(violation ?? "", /not available/);
});

test("rejects a suspended driver", () => {
  const violation = assertDispatchable(vehicle(), driver({ status: "SUSPENDED" }), 100);
  assert.match(violation ?? "", /not available/);
});

test("rejects an off-duty driver", () => {
  const violation = assertDispatchable(vehicle(), driver({ status: "OFF_DUTY" }), 100);
  assert.match(violation ?? "", /not available/);
});

test("rejects a driver with an expired license", () => {
  const violation = assertDispatchable(
    vehicle(),
    driver({ licenseExpiry: new Date(Date.now() - DAY) }),
    100
  );
  assert.match(violation ?? "", /license expired/);
});

test("rejects cargo above max capacity", () => {
  const violation = assertDispatchable(vehicle({ maxLoadKg: 500 }), driver(), 501);
  assert.match(violation ?? "", /exceeds/);
});

test("vehicle availability is checked before driver and cargo", () => {
  const violation = assertDispatchable(vehicle({ status: "IN_SHOP" }), driver({ status: "SUSPENDED" }), 9999);
  assert.match(violation ?? "", /Vehicle/);
});
