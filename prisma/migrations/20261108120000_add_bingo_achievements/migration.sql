-- CreateEnum
CREATE TYPE "BingoPatternType" AS ENUM ('row', 'column', 'diagonal');

-- CreateTable
CREATE TABLE "Bingo" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BingoPatternType" NOT NULL,
    "index" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bingo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bingo_cardId_type_index_key" ON "Bingo"("cardId", "type", "index");

-- AddForeignKey
ALTER TABLE "Bingo" ADD CONSTRAINT "Bingo_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "BingoCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bingo" ADD CONSTRAINT "Bingo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
