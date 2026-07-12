import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("password123", 10);

  const users = [
    { email: "manager@transitops.com", name: "Maya Fleet", role: "FLEET_MANAGER" },
    { email: "driver@transitops.com", name: "Dan Dispatch", role: "DRIVER" },
    { email: "safety@transitops.com", name: "Sana Safety", role: "SAFETY_OFFICER" },
    { email: "finance@transitops.com", name: "Finn Analyst", role: "FINANCIAL_ANALYST" },
  ] as const;

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: hash },
    });
  }

  const year = (n: number) => new Date(Date.now() + n * 365 * 24 * 3600 * 1000);

  const vehicles = await Promise.all(
    [
      { registrationNo: "GJ-01-TX-1001", name: "Tata Ace", type: "Mini Truck", region: "West", maxLoadKg: 750, odometerKm: 42100, acquisitionCost: 650000 },
      { registrationNo: "GJ-01-TX-1002", name: "Ashok Leyland Dost", type: "Pickup", region: "West", maxLoadKg: 1250, odometerKm: 78500, acquisitionCost: 820000 },
      { registrationNo: "MH-12-KL-3401", name: "Eicher Pro 2049", type: "Truck", region: "Central", maxLoadKg: 5000, odometerKm: 121300, acquisitionCost: 1950000 },
      { registrationNo: "MH-12-KL-3402", name: "Tata 407", type: "Truck", region: "Central", maxLoadKg: 2500, odometerKm: 98000, acquisitionCost: 1100000 },
      { registrationNo: "DL-08-VN-0005", name: "Mahindra Supro Van-05", type: "Van", region: "North", maxLoadKg: 500, odometerKm: 15600, acquisitionCost: 540000 },
      { registrationNo: "KA-05-RT-7777", name: "BharatBenz 1617R", type: "Truck", region: "South", maxLoadKg: 9000, odometerKm: 205000, acquisitionCost: 2900000, status: "RETIRED" as const },
    ].map((v) =>
      prisma.vehicle.upsert({ where: { registrationNo: v.registrationNo }, update: {}, create: v })
    )
  );

  const drivers = await Promise.all(
    [
      { name: "Alex Kumar", licenseNo: "DL-2019-778812", licenseCategory: "LMV", licenseExpiry: year(3), phone: "+91 98200 11111", safetyScore: 94 },
      { name: "Ravi Sharma", licenseNo: "GJ-2017-334455", licenseCategory: "HMV", licenseExpiry: year(2), phone: "+91 98200 22222", safetyScore: 88 },
      { name: "Priya Patel", licenseNo: "MH-2020-990011", licenseCategory: "LMV", licenseExpiry: year(4), phone: "+91 98200 33333", safetyScore: 97 },
      { name: "Sunil Yadav", licenseNo: "KA-2015-112233", licenseCategory: "HMV", licenseExpiry: year(-1), phone: "+91 98200 44444", safetyScore: 71 },
      { name: "Imran Shaikh", licenseNo: "DL-2018-556677", licenseCategory: "HMV", licenseExpiry: year(1), phone: "+91 98200 55555", safetyScore: 45, status: "SUSPENDED" as const },
    ].map((d) => prisma.driver.upsert({ where: { licenseNo: d.licenseNo }, update: {}, create: d }))
  );

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000);

  // A completed trip with fuel log to power reports
  const existing = await prisma.trip.findUnique({ where: { refNo: "TRP-0001" } });
  if (!existing) {
    await prisma.trip.create({
      data: {
        refNo: "TRP-0001",
        source: "Ahmedabad",
        destination: "Mumbai",
        cargoWeightKg: 900,
        plannedKm: 530,
        revenue: 42000,
        status: "COMPLETED",
        startOdometerKm: 77900,
        endOdometerKm: 78500,
        fuelUsedL: 62,
        dispatchedAt: daysAgo(6),
        completedAt: daysAgo(5),
        vehicleId: vehicles[1].id,
        driverId: drivers[1].id,
      },
    });
    await prisma.fuelLog.create({
      data: { liters: 62, cost: 6300, date: daysAgo(5), note: "Trip TRP-0001 refuel", vehicleId: vehicles[1].id },
    });
    await prisma.trip.create({
      data: {
        refNo: "TRP-0002",
        source: "Pune",
        destination: "Nashik",
        cargoWeightKg: 1800,
        plannedKm: 210,
        revenue: 18500,
        status: "DRAFT",
        vehicleId: vehicles[3].id,
        driverId: drivers[2].id,
      },
    });
    await prisma.expense.create({
      data: { category: "Toll", amount: 1450, date: daysAgo(5), note: "NH48 tolls TRP-0001", vehicleId: vehicles[1].id },
    });
    await prisma.maintenanceLog.create({
      data: {
        title: "Brake pad replacement",
        description: "Front brake pads worn",
        cost: 8200,
        status: "CLOSED",
        openedAt: daysAgo(20),
        closedAt: daysAgo(18),
        vehicleId: vehicles[2].id,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
