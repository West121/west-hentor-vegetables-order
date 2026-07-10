SET @has_track_map_status := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'OrderShipmentTrack'
    AND COLUMN_NAME = 'mapStatus'
);
SET @sql_track_map_status := IF(
  @has_track_map_status = 0,
  'ALTER TABLE `OrderShipmentTrack`
    ADD COLUMN `mapStatus` varchar(64) NULL AFTER `lastSyncAt`,
    ADD COLUMN `mapMessage` varchar(500) NULL AFTER `mapStatus`,
    ADD COLUMN `mapTrailUrl` varchar(1000) NULL AFTER `mapMessage`,
    ADD COLUMN `mapArrivalTime` varchar(191) NULL AFTER `mapTrailUrl`,
    ADD COLUMN `mapTotalTime` varchar(191) NULL AFTER `mapArrivalTime`,
    ADD COLUMN `mapRemainTime` varchar(191) NULL AFTER `mapTotalTime`,
    ADD COLUMN `mapSyncedAt` datetime NULL AFTER `mapRemainTime`,
    ADD COLUMN `mapRawJson` json NULL AFTER `mapSyncedAt`',
  'SELECT 1'
);
PREPARE stmt_track_map_status FROM @sql_track_map_status;
EXECUTE stmt_track_map_status;
DEALLOCATE PREPARE stmt_track_map_status;
