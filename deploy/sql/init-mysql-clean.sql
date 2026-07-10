-- Hentor Fresh 蔬菜预订系统 MySQL 初始化脚本
-- 数据库名：hentor_vegetables
-- 字符集：utf8mb4
-- 排序规则：utf8mb4_unicode_ci
-- 说明：可直接在 MySQL 8.x 执行；包含表结构和最小可用基础数据。

CREATE DATABASE IF NOT EXISTS `hentor_vegetables`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `hentor_vegetables`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `Franchisee` (
  `id` varchar(191) PRIMARY KEY,
  `name` varchar(191) NOT NULL,
  `contactName` varchar(191),
  `contactPhone` varchar(64),
  `status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
  `contractEndsAt` datetime,
  `remark` text,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Store` (
  `id` varchar(191) PRIMARY KEY,
  `franchiseeId` varchar(191),
  `code` varchar(191) NOT NULL UNIQUE,
  `name` varchar(191) NOT NULL,
  `type` varchar(32) NOT NULL DEFAULT 'DIRECT',
  `status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
  `contactName` varchar(191),
  `contactPhone` varchar(64),
  `province` varchar(64),
  `city` varchar(64),
  `district` varchar(64),
  `address` varchar(500),
  `deliveryProvinces` json,
  `deliveryCities` json,
  `customerServiceTel` varchar(64),
  `cutoffTime` varchar(16) NOT NULL DEFAULT '18:00',
  `franchiseEndsAt` datetime,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `Store_franchiseeId_idx` (`franchiseeId`),
  KEY `Store_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `User` (
  `id` varchar(191) PRIMARY KEY,
  `openid` varchar(191) NOT NULL UNIQUE,
  `unionid` varchar(191),
  `phone` varchar(64),
  `nickname` varchar(191),
  `avatarUrl` varchar(1000),
  `status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
  `disabledReason` text,
  `remark` text,
  `defaultStoreId` varchar(191),
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `User_phone_idx` (`phone`),
  KEY `User_defaultStoreId_idx` (`defaultStoreId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MemberStoreBinding` (
  `id` varchar(191) PRIMARY KEY,
  `userId` varchar(191) NOT NULL,
  `storeId` varchar(191) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
  `source` varchar(64),
  `isDefault` boolean NOT NULL DEFAULT false,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `MemberStoreBinding_userId_storeId_key` (`userId`, `storeId`),
  KEY `MemberStoreBinding_storeId_idx` (`storeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Address` (
  `id` varchar(191) PRIMARY KEY,
  `userId` varchar(191) NOT NULL,
  `storeId` varchar(191) NOT NULL,
  `receiverName` varchar(191) NOT NULL,
  `receiverPhone` varchar(64) NOT NULL,
  `province` varchar(64),
  `city` varchar(64),
  `district` varchar(64),
  `detail` varchar(500) NOT NULL,
  `isDefault` boolean NOT NULL DEFAULT false,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `Address_userId_storeId_idx` (`userId`, `storeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PackageTemplate` (
  `id` varchar(191) PRIMARY KEY,
  `storeId` varchar(191),
  `name` varchar(191) NOT NULL,
  `totalTimes` int NOT NULL,
  `weightLimitJin` decimal(8,2) NOT NULL,
  `validDays` int NOT NULL DEFAULT 0,
  `status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
  `sortOrder` int NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `PackageTemplate_storeId_idx` (`storeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PackageTemplateBenefit` (
  `id` varchar(191) PRIMARY KEY,
  `templateId` varchar(191) NOT NULL,
  `kind` varchar(64) NOT NULL DEFAULT 'EGG',
  `name` varchar(191) NOT NULL,
  `unit` varchar(32) NOT NULL,
  `totalQuantity` decimal(10,2) NOT NULL,
  `sortOrder` int NOT NULL DEFAULT 0,
  `shipmentGroup` varchar(191),
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `PackageTemplateBenefit_templateId_sortOrder_idx` (`templateId`, `sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `UserPackage` (
  `id` varchar(191) PRIMARY KEY,
  `userId` varchar(191) NOT NULL,
  `storeId` varchar(191) NOT NULL,
  `templateId` varchar(191) NOT NULL,
  `nameSnapshot` varchar(191) NOT NULL,
  `totalTimes` int NOT NULL,
  `usedTimes` int NOT NULL DEFAULT 0,
  `weightLimitJin` decimal(8,2) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
  `frozenReason` text,
  `startsAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expiresAt` datetime NOT NULL DEFAULT '2099-12-31 23:59:59',
  `lastUsedAt` datetime,
  `nextOrderDate` datetime,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `UserPackage_userId_storeId_status_idx` (`userId`, `storeId`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `UserPackageBenefit` (
  `id` varchar(191) PRIMARY KEY,
  `userPackageId` varchar(191) NOT NULL,
  `templateBenefitId` varchar(191),
  `kind` varchar(64) NOT NULL,
  `nameSnapshot` varchar(191) NOT NULL,
  `unitSnapshot` varchar(32) NOT NULL,
  `totalQuantity` decimal(10,2) NOT NULL,
  `usedQuantity` decimal(10,2) NOT NULL DEFAULT 0,
  `sortOrder` int NOT NULL DEFAULT 0,
  `shipmentGroup` varchar(191),
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `UserPackageBenefit_userPackageId_sortOrder_idx` (`userPackageId`, `sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Dish` (
  `id` varchar(191) PRIMARY KEY,
  `storeId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `category` varchar(32) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'ON_SALE',
  `stepJin` decimal(8,2) NOT NULL,
  `stockJin` decimal(10,2) NOT NULL,
  `imageKey` varchar(500),
  `imageUrl` varchar(1000),
  `description` text,
  `sortOrder` int NOT NULL DEFAULT 0,
  `deletedAt` datetime,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `Dish_storeId_category_status_idx` (`storeId`, `category`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `InventoryLog` (
  `id` varchar(191) PRIMARY KEY,
  `storeId` varchar(191) NOT NULL,
  `dishId` varchar(191) NOT NULL,
  `beforeJin` decimal(10,2) NOT NULL,
  `changeJin` decimal(10,2) NOT NULL,
  `afterJin` decimal(10,2) NOT NULL,
  `reason` varchar(500) NOT NULL,
  `operatorId` varchar(191),
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `InventoryLog_storeId_dishId_idx` (`storeId`, `dishId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Task` (
  `id` varchar(191) PRIMARY KEY,
  `storeId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'DRAFT',
  `startsAt` datetime NOT NULL,
  `endsAt` datetime NOT NULL,
  `cutoffTime` varchar(16) NOT NULL,
  `tag` varchar(191),
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `Task_storeId_status_idx` (`storeId`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TaskDish` (
  `taskId` varchar(191) NOT NULL,
  `dishId` varchar(191) NOT NULL,
  `sortOrder` int NOT NULL DEFAULT 0,
  `totalWeightJin` decimal(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`taskId`, `dishId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Order` (
  `id` varchar(191) PRIMARY KEY,
  `storeId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `userPackageId` varchar(191) NOT NULL,
  `addressId` varchar(191),
  `orderNo` varchar(191) NOT NULL UNIQUE,
  `status` varchar(32) NOT NULL DEFAULT 'PENDING_SHIPMENT',
  `totalWeightJin` decimal(8,2) NOT NULL,
  `addressSnapshot` json NOT NULL,
  `logisticsNo` varchar(191),
  `userVisibleRemark` text,
  `internalRemark` text,
  `cancelReason` text,
  `shippedAt` datetime,
  `signedAt` datetime,
  `canceledAt` datetime,
  `modifiedAt` datetime,
  `deletedByUserAt` datetime,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `Order_storeId_status_createdAt_idx` (`storeId`, `status`, `createdAt`),
  KEY `Order_userId_storeId_idx` (`userId`, `storeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `OrderItem` (
  `id` varchar(191) PRIMARY KEY,
  `orderId` varchar(191) NOT NULL,
  `dishId` varchar(191) NOT NULL,
  `dishNameSnapshot` varchar(191) NOT NULL,
  `weightJin` decimal(8,2) NOT NULL,
  `stepJinSnapshot` decimal(8,2) NOT NULL,
  KEY `OrderItem_orderId_idx` (`orderId`),
  KEY `OrderItem_dishId_idx` (`dishId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `OrderBenefitItem` (
  `id` varchar(191) PRIMARY KEY,
  `orderId` varchar(191) NOT NULL,
  `userPackageBenefitId` varchar(191),
  `kind` varchar(64) NOT NULL,
  `nameSnapshot` varchar(191) NOT NULL,
  `unitSnapshot` varchar(32) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `shipmentGroup` varchar(191),
  KEY `OrderBenefitItem_orderId_idx` (`orderId`),
  KEY `OrderBenefitItem_userPackageBenefitId_idx` (`userPackageBenefitId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `OrderShipment` (
  `id` varchar(191) PRIMARY KEY,
  `orderId` varchar(191) NOT NULL,
  `packageType` varchar(64) NOT NULL,
  `packageName` varchar(191) NOT NULL,
  `logisticsNo` varchar(191),
  `kuaidicom` varchar(64),
  `status` varchar(32) NOT NULL DEFAULT 'PENDING',
  `sortOrder` int NOT NULL DEFAULT 0,
  `shippedAt` datetime,
  `signedAt` datetime,
  `remark` text,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `OrderShipment_orderId_sortOrder_idx` (`orderId`, `sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `OrderShipmentTrack` (
  `id` varchar(191) PRIMARY KEY,
  `orderId` varchar(191) NOT NULL,
  `shipmentId` varchar(191) NOT NULL,
  `logisticsNo` varchar(191) NOT NULL,
  `kuaidicom` varchar(64),
  `stateCode` varchar(32),
  `stateText` varchar(64),
  `subscribeStatus` varchar(64) NOT NULL DEFAULT 'PENDING',
  `subscribeMessage` varchar(500),
  `lastTraceTime` datetime,
  `lastSyncAt` datetime,
  `mapStatus` varchar(64),
  `mapMessage` varchar(500),
  `mapTrailUrl` varchar(1000),
  `mapArrivalTime` varchar(191),
  `mapTotalTime` varchar(191),
  `mapRemainTime` varchar(191),
  `mapSyncedAt` datetime,
  `mapRawJson` json,
  `rawJson` json,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `OrderShipmentTrack_shipmentId_uq` (`shipmentId`),
  KEY `OrderShipmentTrack_orderId_idx` (`orderId`),
  KEY `OrderShipmentTrack_logisticsNo_idx` (`logisticsNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `OrderShipmentTrackEvent` (
  `id` varchar(191) PRIMARY KEY,
  `trackId` varchar(191) NOT NULL,
  `shipmentId` varchar(191) NOT NULL,
  `eventTime` datetime,
  `content` varchar(1000) NOT NULL,
  `location` varchar(191),
  `status` varchar(64),
  `sortOrder` int NOT NULL DEFAULT 0,
  `rawJson` json,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `OrderShipmentTrackEvent_trackId_sort_idx` (`trackId`, `sortOrder`),
  KEY `OrderShipmentTrackEvent_shipmentId_idx` (`shipmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Kuaidi100Printer` (
  `id` varchar(191) PRIMARY KEY,
  `storeId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
  `isDefault` boolean NOT NULL DEFAULT false,
  `apiKey` varchar(191),
  `apiSecret` varchar(191),
  `partnerId` varchar(191),
  `partnerKey` varchar(191),
  `code` varchar(191),
  `kuaidicom` varchar(64),
  `expType` varchar(191),
  `payType` varchar(64),
  `siid` varchar(191) NOT NULL,
  `tempId` varchar(191),
  `senderAddress` varchar(500),
  `senderCompany` varchar(191),
  `senderMobile` varchar(64),
  `requestParams` json,
  `sortOrder` int NOT NULL DEFAULT 0,
  `remark` text,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `Kuaidi100Printer_storeId_status_idx` (`storeId`, `status`),
  KEY `Kuaidi100Printer_storeId_default_idx` (`storeId`, `isDefault`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `OrderChangeLog` (
  `id` varchar(191) PRIMARY KEY,
  `orderId` varchar(191) NOT NULL,
  `beforeItems` json NOT NULL,
  `afterItems` json NOT NULL,
  `beforeAddress` json,
  `afterAddress` json,
  `source` varchar(64) NOT NULL,
  `operatorId` varchar(191),
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `OrderChangeLog_orderId_idx` (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PackageOperationLog` (
  `id` varchar(191) PRIMARY KEY,
  `userPackageId` varchar(191) NOT NULL,
  `beforeValue` json,
  `afterValue` json,
  `reason` varchar(500) NOT NULL,
  `operatorId` varchar(191),
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `PackageOperationLog_userPackageId_idx` (`userPackageId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AdminUser` (
  `id` varchar(191) PRIMARY KEY,
  `username` varchar(191) NOT NULL UNIQUE,
  `name` varchar(191) NOT NULL,
  `phone` varchar(64),
  `passwordHash` varchar(191) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
  `lastLoginAt` datetime,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AdminWechatBinding` (
  `id` varchar(191) PRIMARY KEY,
  `adminUserId` varchar(191) NOT NULL UNIQUE,
  `openid` varchar(191) NOT NULL UNIQUE,
  `unionid` varchar(191),
  `lastLoginAt` datetime,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `AdminWechatBinding_unionid_idx` (`unionid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AdminRole` (
  `id` varchar(191) PRIMARY KEY,
  `code` varchar(191) NOT NULL UNIQUE,
  `name` varchar(191) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AdminPermission` (
  `id` varchar(191) PRIMARY KEY,
  `code` varchar(191) NOT NULL UNIQUE,
  `name` varchar(191) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AdminUserRole` (
  `adminUserId` varchar(191) NOT NULL,
  `roleId` varchar(191) NOT NULL,
  PRIMARY KEY (`adminUserId`, `roleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AdminRolePermission` (
  `roleId` varchar(191) NOT NULL,
  `permissionId` varchar(191) NOT NULL,
  PRIMARY KEY (`roleId`, `permissionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AdminUserStore` (
  `adminUserId` varchar(191) NOT NULL,
  `storeId` varchar(191) NOT NULL,
  PRIMARY KEY (`adminUserId`, `storeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AdminOperationLog` (
  `id` varchar(191) PRIMARY KEY,
  `storeId` varchar(191),
  `operatorId` varchar(191),
  `userId` varchar(191),
  `resource` varchar(191) NOT NULL,
  `resourceId` varchar(191),
  `action` varchar(191) NOT NULL,
  `beforeValue` json,
  `afterValue` json,
  `requestMethod` varchar(16),
  `requestPath` varchar(500),
  `requestParams` json,
  `statusCode` int,
  `responseData` json,
  `durationMs` int,
  `ip` varchar(64),
  `userAgent` varchar(1000),
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `AdminOperationLog_storeId_resource_createdAt_idx` (`storeId`, `resource`, `createdAt`),
  KEY `AdminOperationLog_userId_resource_createdAt_idx` (`userId`, `resource`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SystemConfig` (
  `id` varchar(191) PRIMARY KEY,
  `storeId` varchar(191),
  `key` varchar(191) NOT NULL,
  `value` json NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `SystemConfig_storeId_key_key` (`storeId`, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PackagePurchaseOrder` (
  `id` varchar(191) PRIMARY KEY,
  `storeId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `templateId` varchar(191) NOT NULL,
  `amountFen` int NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'PAYMENT_NOT_ENABLED',
  `payChannel` varchar(64),
  `expiresAt` datetime,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `PackagePurchaseOrder_storeId_userId_status_idx` (`storeId`, `userId`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PaymentOrder` (
  `id` varchar(191) PRIMARY KEY,
  `purchaseOrderId` varchar(191) NOT NULL,
  `channel` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'CREATED',
  `wechatPrepayId` varchar(191),
  `wechatTransactionId` varchar(191),
  `paidAt` datetime,
  `callbackDigest` varchar(191),
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `Franchisee` (`id`, `name`, `contactName`, `contactPhone`, `status`, `contractEndsAt`, `createdAt`, `updatedAt`)
VALUES ('seed-franchisee-hentor', '恒拓生鲜', '徐竹西', '13800000000', 'ACTIVE', '2027-12-31 23:59:59', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `Store` (
  `id`, `franchiseeId`, `code`, `name`, `type`, `status`, `contactName`, `contactPhone`,
  `province`, `city`, `district`, `address`, `deliveryProvinces`, `deliveryCities`,
  `customerServiceTel`, `cutoffTime`, `franchiseEndsAt`, `createdAt`, `updatedAt`
) VALUES (
  'seed-store-lotus', 'seed-franchisee-hentor', 'lotus-garden', '涵养总店', 'DIRECT', 'ACTIVE',
  '张建国', '13800005678', '江苏省', '南京市', '六合区', '龙池街道冠城大通',
  JSON_ARRAY('江苏省'), JSON_ARRAY('南京市'), '400-800-1000', '18:00', '2027-12-31 23:59:59',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT IGNORE INTO `AdminPermission` (`id`, `code`, `name`, `createdAt`) VALUES
  ('perm-dishes-read', 'dishes.read', '查看菜品', CURRENT_TIMESTAMP),
  ('perm-dishes-write', 'dishes.write', '管理菜品', CURRENT_TIMESTAMP),
  ('perm-orders-read', 'orders.read', '查看订单', CURRENT_TIMESTAMP),
  ('perm-orders-write', 'orders.write', '处理订单', CURRENT_TIMESTAMP),
  ('perm-members-read', 'members.read', '查看会员', CURRENT_TIMESTAMP),
  ('perm-members-write', 'members.write', '管理会员', CURRENT_TIMESTAMP),
  ('perm-packages-read', 'packages.read', '查看套餐', CURRENT_TIMESTAMP),
  ('perm-packages-write', 'packages.write', '管理套餐', CURRENT_TIMESTAMP),
  ('perm-stores-manage', 'stores.manage', '管理门店', CURRENT_TIMESTAMP),
  ('perm-system-manage', 'system.manage', '系统管理', CURRENT_TIMESTAMP),
  ('perm-tasks-read', 'tasks.read', '查看任务', CURRENT_TIMESTAMP),
  ('perm-tasks-write', 'tasks.write', '管理任务', CURRENT_TIMESTAMP);

INSERT IGNORE INTO `AdminRole` (`id`, `code`, `name`, `createdAt`, `updatedAt`)
VALUES ('role-super-admin', 'super_admin', '超级管理员', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `AdminRolePermission` (`roleId`, `permissionId`)
SELECT 'role-super-admin', `id` FROM `AdminPermission`;

INSERT IGNORE INTO `User` (`id`, `openid`, `phone`, `nickname`, `status`, `defaultStoreId`, `createdAt`, `updatedAt`)
VALUES ('seed-user-lotus-001', 'mock-openid-lotus-001', '13800005678', '张建国', 'ACTIVE', 'seed-store-lotus', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `MemberStoreBinding` (`id`, `userId`, `storeId`, `status`, `source`, `isDefault`, `createdAt`, `updatedAt`)
VALUES ('seed-binding-lotus-001', 'seed-user-lotus-001', 'seed-store-lotus', 'ACTIVE', 'seed', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `Address` (`id`, `userId`, `storeId`, `receiverName`, `receiverPhone`, `province`, `city`, `district`, `detail`, `isDefault`, `createdAt`, `updatedAt`)
VALUES ('seed-address-lotus-001', 'seed-user-lotus-001', 'seed-store-lotus', '张建国', '13800005678', '江苏省', '南京市', '六合区', '莲花小区 3栋 602', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `PackageTemplate` (`id`, `storeId`, `name`, `totalTimes`, `weightLimitJin`, `validDays`, `status`, `sortOrder`, `createdAt`, `updatedAt`)
VALUES ('seed-package-8jin-weekly', 'seed-store-lotus', '8斤周套餐', 8, 8.00, 0, 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `UserPackage` (`id`, `userId`, `storeId`, `templateId`, `nameSnapshot`, `totalTimes`, `usedTimes`, `weightLimitJin`, `status`, `startsAt`, `expiresAt`, `createdAt`, `updatedAt`)
VALUES ('seed-user-package-lotus-001', 'seed-user-lotus-001', 'seed-store-lotus', 'seed-package-8jin-weekly', '8斤周套餐', 8, 0, 8.00, 'ACTIVE', CURRENT_TIMESTAMP, '2099-12-31 23:59:59', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `Dish` (`id`, `storeId`, `name`, `category`, `status`, `stepJin`, `stockJin`, `description`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
  ('seed-dish-spinach', 'seed-store-lotus', '菠菜', 'LEAFY', 'ON_SALE', 0.50, 82.00, '本周新鲜到店', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-dish-tomato', 'seed-store-lotus', '番茄', 'FRUIT', 'ON_SALE', 1.00, 40.00, '本周新鲜到店', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-dish-cucumber', 'seed-store-lotus', '黄瓜', 'ACTIVITY', 'ON_SALE', 0.50, 18.00, '本周新鲜到店', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-dish-lettuce', 'seed-store-lotus', '生菜', 'LEAFY', 'ON_SALE', 0.50, 45.00, '本周新鲜到店', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `Task` (`id`, `storeId`, `name`, `status`, `startsAt`, `endsAt`, `cutoffTime`, `tag`, `createdAt`, `updatedAt`)
VALUES ('seed-task-weekly-reservation', 'seed-store-lotus', '本周精选预订任务', 'ACTIVE', '2026-01-01 00:00:00', '2099-12-31 23:59:59', '18:00', '本周精选', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `TaskDish` (`taskId`, `dishId`, `sortOrder`, `totalWeightJin`) VALUES
  ('seed-task-weekly-reservation', 'seed-dish-spinach', 0, 82.00),
  ('seed-task-weekly-reservation', 'seed-dish-tomato', 1, 40.00),
  ('seed-task-weekly-reservation', 'seed-dish-cucumber', 2, 18.00),
  ('seed-task-weekly-reservation', 'seed-dish-lettuce', 3, 45.00);

INSERT IGNORE INTO `SystemConfig` (`id`, `storeId`, `key`, `value`, `createdAt`, `updatedAt`)
VALUES ('seed-config-cutoff-time', 'seed-store-lotus', 'cutoff_time', JSON_QUOTE('18:00'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `SystemConfig` (`id`, `storeId`, `key`, `value`, `createdAt`, `updatedAt`) VALUES
  ('seed-config-admin-system-name', 'seed-store-lotus', 'admin_system_name', JSON_QUOTE('HanYang Fresh'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-config-home-dish-columns', 'seed-store-lotus', 'home_dish_columns', JSON_QUOTE('3'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-config-login-title', 'seed-store-lotus', 'login_title', JSON_QUOTE('Hentor Fresh'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-config-login-subtitle', 'seed-store-lotus', 'login_subtitle', JSON_QUOTE('社区鲜蔬会员'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-config-login-welcome', 'seed-store-lotus', 'login_welcome', JSON_QUOTE('欢迎来到蔬菜预订'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-config-login-image-url', 'seed-store-lotus', 'login_image_url', JSON_QUOTE(''), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `SystemConfig` (`id`, `storeId`, `key`, `value`, `createdAt`, `updatedAt`) VALUES
  ('seed-config-dict-index', 'seed-store-lotus', 'dict.index', JSON_ARRAY(
    JSON_OBJECT(
      'code', 'DISH_CATEGORY',
      'builtIn', true,
      'description', '菜品管理、任务选菜使用的菜品分类。',
      'enabled', true,
      'name', '菜品类型',
      'sortOrder', 1
    )
  ), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-config-dict-dish-category', 'seed-store-lotus', 'dict.DISH_CATEGORY', JSON_ARRAY(
    JSON_OBJECT('code', 'LEAFY', 'enabled', true, 'name', '叶菜', 'sortOrder', 1),
    JSON_OBJECT('code', 'FRUIT', 'enabled', true, 'name', '茄果', 'sortOrder', 2),
    JSON_OBJECT('code', 'ROOT', 'enabled', true, 'name', '根茎', 'sortOrder', 3),
    JSON_OBJECT('code', 'MUSHROOM', 'enabled', true, 'name', '菌菇', 'sortOrder', 4),
    JSON_OBJECT('code', 'ACTIVITY', 'enabled', true, 'name', '活动', 'sortOrder', 5)
  ), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

SET FOREIGN_KEY_CHECKS = 1;
