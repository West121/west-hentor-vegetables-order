SET @has_order_shipment_kuaidicom := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'OrderShipment'
    AND COLUMN_NAME = 'kuaidicom'
);
SET @sql_order_shipment_kuaidicom := IF(
  @has_order_shipment_kuaidicom = 0,
  'ALTER TABLE `OrderShipment` ADD COLUMN `kuaidicom` varchar(64) NULL AFTER `logisticsNo`',
  'SELECT 1'
);
PREPARE stmt_order_shipment_kuaidicom FROM @sql_order_shipment_kuaidicom;
EXECUTE stmt_order_shipment_kuaidicom;
DEALLOCATE PREPARE stmt_order_shipment_kuaidicom;

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
