SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Kuaidi100Printer'
    AND COLUMN_NAME = 'senderMobile'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE `Kuaidi100Printer` ADD COLUMN `senderMobile` varchar(64) NULL AFTER `senderCompany`',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
