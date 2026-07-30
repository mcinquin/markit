-- AlterTable
ALTER TABLE "Team" ADD COLUMN "createdById" TEXT;

-- AlterTable
ALTER TABLE "BingoCard" ADD COLUMN "createdById" TEXT;

-- Backfill team creators from OWNER membership
UPDATE "Team" t
SET "createdById" = tm."userId"
FROM "TeamMember" tm
WHERE tm."teamId" = t.id AND tm.role = 'OWNER' AND t."createdById" IS NULL;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoCard" ADD CONSTRAINT "BingoCard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
