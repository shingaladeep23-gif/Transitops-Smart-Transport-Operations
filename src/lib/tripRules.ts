import type { Driver, Vehicle } from "@prisma/client";

// Mandatory business rules: a trip can only involve an Available vehicle
// (never Retired/In Shop/On Trip), an Available driver with a valid license,
// and cargo within the vehicle's capacity. Used by both server actions and
// the REST API so the rules cannot diverge.
export function assertDispatchable(vehicle: Vehicle, driver: Driver, cargoWeightKg: number): string | null {
  if (vehicle.status !== "AVAILABLE") {
    return `Vehicle ${vehicle.registrationNo} is not available (status: ${vehicle.status.replace("_", " ")}).`;
  }
  if (driver.status !== "AVAILABLE") {
    return `Driver ${driver.name} is not available (status: ${driver.status.replace("_", " ")}).`;
  }
  if (driver.licenseExpiry < new Date()) {
    return `Driver ${driver.name}'s license expired on ${driver.licenseExpiry.toISOString().slice(0, 10)}.`;
  }
  if (cargoWeightKg > vehicle.maxLoadKg) {
    return `Cargo weight ${cargoWeightKg} kg exceeds ${vehicle.registrationNo}'s max capacity of ${vehicle.maxLoadKg} kg.`;
  }
  return null;
}
