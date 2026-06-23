ALTER TABLE "AdminOperationLog" ADD COLUMN "requestMethod" TEXT;
ALTER TABLE "AdminOperationLog" ADD COLUMN "requestPath" TEXT;
ALTER TABLE "AdminOperationLog" ADD COLUMN "requestParams" JSONB;
ALTER TABLE "AdminOperationLog" ADD COLUMN "statusCode" INTEGER;
ALTER TABLE "AdminOperationLog" ADD COLUMN "responseData" JSONB;
ALTER TABLE "AdminOperationLog" ADD COLUMN "durationMs" INTEGER;
