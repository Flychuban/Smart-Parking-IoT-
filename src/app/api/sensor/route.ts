import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type SensorPayload = {
  sensor_id: string;
  status: "OCCUPIED" | "FREE";
  distance_cm: number;
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  let payload: SensorPayload;
  try {
    payload = (await req.json()) as SensorPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  console.log("[/api/sensor] payload:", payload);

  const { sensor_id, status, distance_cm } = payload;
  if (
    typeof sensor_id !== "string" ||
    (status !== "OCCUPIED" && status !== "FREE") ||
    typeof distance_cm !== "number"
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload shape" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const isOccupied = status === "OCCUPIED";

  const spot = await prisma.parkingSpot.upsert({
    where: { label: sensor_id },
    update: { isOccupied, distanceCm: distance_cm },
    create: { label: sensor_id, isOccupied, distanceCm: distance_cm },
  });

  await prisma.sensorEvent.create({
    data: {
      spotId: spot.id,
      status,
      distanceCm: distance_cm,
    },
  });

  return NextResponse.json({ ok: true, spot }, { headers: CORS_HEADERS });
}
