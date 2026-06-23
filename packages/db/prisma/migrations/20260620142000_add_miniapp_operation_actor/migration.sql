ALTER TABLE "AdminOperationLog" ADD COLUMN "userId" TEXT;
ALTER TABLE "AdminOperationLog" ALTER COLUMN "operatorId" DROP NOT NULL;
CREATE INDEX "AdminOperationLog_userId_resource_createdAt_idx" ON "AdminOperationLog"("userId", "resource", "createdAt");
ALTER TABLE "AdminOperationLog" ADD CONSTRAINT "AdminOperationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
