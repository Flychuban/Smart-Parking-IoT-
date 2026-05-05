import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const labels = ["A1", "A2", "B1", "B2"];
  for (const label of labels) {
    await prisma.parkingSpot.upsert({
      where: { label },
      update: {},
      create: { label },
    });
  }
  console.log(`Seeded ${labels.length} parking spots: ${labels.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
