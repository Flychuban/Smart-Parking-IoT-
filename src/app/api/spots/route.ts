import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const spots = await prisma.parkingSpot.findMany({
    orderBy: { label: "asc" },
  });
  return NextResponse.json(spots);
}
