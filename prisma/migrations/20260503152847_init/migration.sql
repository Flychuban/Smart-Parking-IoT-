-- CreateTable
CREATE TABLE "ParkingSpot" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
    "distanceCm" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingSpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorEvent" (
    "id" SERIAL NOT NULL,
    "spotId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "distanceCm" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParkingSpot_label_key" ON "ParkingSpot"("label");

-- AddForeignKey
ALTER TABLE "SensorEvent" ADD CONSTRAINT "SensorEvent_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "ParkingSpot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
