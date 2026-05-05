import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const events = await prisma.sensorEvent.findMany({
    orderBy: { timestamp: "desc" },
    take: 15,
    include: { spot: true },
  });
  return NextResponse.json(events);
}
