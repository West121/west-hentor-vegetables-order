CREATE TABLE "PackageTemplateBenefit" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'EGG',
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "totalQuantity" DECIMAL(10,2) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "shipmentGroup" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PackageTemplateBenefit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPackageBenefit" (
  "id" TEXT NOT NULL,
  "userPackageId" TEXT NOT NULL,
  "templateBenefitId" TEXT,
  "kind" TEXT NOT NULL,
  "nameSnapshot" TEXT NOT NULL,
  "unitSnapshot" TEXT NOT NULL,
  "totalQuantity" DECIMAL(10,2) NOT NULL,
  "usedQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "shipmentGroup" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserPackageBenefit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderBenefitItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userPackageBenefitId" TEXT,
  "kind" TEXT NOT NULL,
  "nameSnapshot" TEXT NOT NULL,
  "unitSnapshot" TEXT NOT NULL,
  "quantity" DECIMAL(10,2) NOT NULL,
  "shipmentGroup" TEXT,

  CONSTRAINT "OrderBenefitItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderShipment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "packageType" TEXT NOT NULL,
  "packageName" TEXT NOT NULL,
  "logisticsNo" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "shippedAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "remark" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrderShipment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PackageTemplateBenefit_templateId_sortOrder_idx" ON "PackageTemplateBenefit"("templateId", "sortOrder");
CREATE INDEX "UserPackageBenefit_userPackageId_sortOrder_idx" ON "UserPackageBenefit"("userPackageId", "sortOrder");
CREATE INDEX "OrderBenefitItem_orderId_idx" ON "OrderBenefitItem"("orderId");
CREATE INDEX "OrderBenefitItem_userPackageBenefitId_idx" ON "OrderBenefitItem"("userPackageBenefitId");
CREATE INDEX "OrderShipment_orderId_sortOrder_idx" ON "OrderShipment"("orderId", "sortOrder");

ALTER TABLE "PackageTemplateBenefit"
  ADD CONSTRAINT "PackageTemplateBenefit_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "PackageTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPackageBenefit"
  ADD CONSTRAINT "UserPackageBenefit_userPackageId_fkey"
  FOREIGN KEY ("userPackageId") REFERENCES "UserPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPackageBenefit"
  ADD CONSTRAINT "UserPackageBenefit_templateBenefitId_fkey"
  FOREIGN KEY ("templateBenefitId") REFERENCES "PackageTemplateBenefit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderBenefitItem"
  ADD CONSTRAINT "OrderBenefitItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderBenefitItem"
  ADD CONSTRAINT "OrderBenefitItem_userPackageBenefitId_fkey"
  FOREIGN KEY ("userPackageBenefitId") REFERENCES "UserPackageBenefit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderShipment"
  ADD CONSTRAINT "OrderShipment_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
