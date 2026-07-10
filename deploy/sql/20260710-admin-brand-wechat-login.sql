-- 2026-07-10 admin brand/store migration and WeChat binding schema.
-- Safe to run repeatedly on an existing MySQL database.

UPDATE `Store`
SET `name` = '涵养总店',
    `updatedAt` = CURRENT_TIMESTAMP
WHERE `id` = 'seed-store-lotus';

INSERT INTO `SystemConfig` (`id`, `storeId`, `key`, `value`, `createdAt`, `updatedAt`)
SELECT CONCAT('migration-admin-system-name-', `id`), `id`, 'admin_system_name',
       JSON_QUOTE('HanYang Fresh'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `Store`
ON DUPLICATE KEY UPDATE
  `value` = VALUES(`value`),
  `updatedAt` = CURRENT_TIMESTAMP;

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
