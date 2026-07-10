SET @kuaidi_printer_sender_address_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Kuaidi100Printer'
    AND COLUMN_NAME = 'senderAddress'
);

SET @kuaidi_printer_sender_address_sql := IF(
  @kuaidi_printer_sender_address_exists = 0,
  'ALTER TABLE `Kuaidi100Printer` ADD COLUMN `senderAddress` varchar(500) NULL AFTER `tempId`',
  'SELECT 1'
);

PREPARE kuaidi_printer_sender_address_stmt FROM @kuaidi_printer_sender_address_sql;
EXECUTE kuaidi_printer_sender_address_stmt;
DEALLOCATE PREPARE kuaidi_printer_sender_address_stmt;
