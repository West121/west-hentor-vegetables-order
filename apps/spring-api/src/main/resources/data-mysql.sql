INSERT IGNORE INTO `Franchisee` (`id`, `name`, `contactName`, `contactPhone`, `status`, `contractEndsAt`, `createdAt`, `updatedAt`)
VALUES ('seed-franchisee-hentor', '恒拓生鲜', '徐竹西', '13800000000', 'ACTIVE', '2027-12-31 23:59:59', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `Store` (
  `id`, `franchiseeId`, `code`, `name`, `type`, `status`, `contactName`, `contactPhone`,
  `province`, `city`, `district`, `address`, `deliveryProvinces`, `deliveryCities`,
  `customerServiceTel`, `cutoffTime`, `franchiseEndsAt`, `createdAt`, `updatedAt`
) VALUES (
  'seed-store-lotus', 'seed-franchisee-hentor', 'lotus-garden', '莲花小区服务点', 'DIRECT', 'ACTIVE',
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

INSERT IGNORE INTO `AdminUser` (`id`, `username`, `name`, `phone`, `passwordHash`, `status`, `createdAt`, `updatedAt`)
VALUES ('seed-admin-user', 'admin', 'Xu West', '13800000000', '$2b$10$VUFyNiNnAnRSQte4FHA0heDMxjSzmpQHW0I.bsLIgcoP9SxpRVU9G', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `AdminUserRole` (`adminUserId`, `roleId`)
VALUES ('seed-admin-user', 'role-super-admin');

INSERT IGNORE INTO `AdminUserStore` (`adminUserId`, `storeId`)
VALUES ('seed-admin-user', 'seed-store-lotus');

INSERT IGNORE INTO `User` (`id`, `openid`, `phone`, `nickname`, `status`, `defaultStoreId`, `createdAt`, `updatedAt`)
VALUES ('seed-user-lotus-001', 'mock-openid-lotus-001', '13800005678', '张建国', 'ACTIVE', 'seed-store-lotus', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `MemberStoreBinding` (`id`, `userId`, `storeId`, `status`, `source`, `isDefault`, `createdAt`, `updatedAt`)
VALUES ('seed-binding-lotus-001', 'seed-user-lotus-001', 'seed-store-lotus', 'ACTIVE', 'seed', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `Address` (`id`, `userId`, `storeId`, `receiverName`, `receiverPhone`, `province`, `city`, `district`, `detail`, `isDefault`, `createdAt`, `updatedAt`)
VALUES ('seed-address-lotus-001', 'seed-user-lotus-001', 'seed-store-lotus', '张建国', '13800005678', '江苏省', '南京市', '六合区', '莲花小区 3栋 602', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `PackageTemplate` (`id`, `storeId`, `name`, `totalTimes`, `weightLimitJin`, `validDays`, `status`, `sortOrder`, `createdAt`, `updatedAt`)
VALUES ('seed-package-8jin-weekly', 'seed-store-lotus', '8斤周套餐', 8, 8.00, 0, 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `PackageTemplateBenefit` (`id`, `templateId`, `kind`, `name`, `unit`, `totalQuantity`, `sortOrder`, `shipmentGroup`, `createdAt`, `updatedAt`)
VALUES ('seed-package-8jin-weekly-egg', 'seed-package-8jin-weekly', 'EGG', '鸡蛋', '箱', 1.00, 1, '鸡蛋包裹', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `UserPackage` (`id`, `userId`, `storeId`, `templateId`, `nameSnapshot`, `totalTimes`, `usedTimes`, `weightLimitJin`, `status`, `startsAt`, `expiresAt`, `createdAt`, `updatedAt`)
VALUES ('seed-user-package-lotus-001', 'seed-user-lotus-001', 'seed-store-lotus', 'seed-package-8jin-weekly', '8斤周套餐', 8, 0, 8.00, 'ACTIVE', CURRENT_TIMESTAMP, '2099-12-31 23:59:59', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `UserPackageBenefit` (`id`, `userPackageId`, `templateBenefitId`, `kind`, `nameSnapshot`, `unitSnapshot`, `totalQuantity`, `usedQuantity`, `sortOrder`, `shipmentGroup`, `createdAt`, `updatedAt`)
VALUES ('seed-user-package-lotus-001-egg', 'seed-user-package-lotus-001', 'seed-package-8jin-weekly-egg', 'EGG', '鸡蛋', '箱', 1.00, 0.00, 1, '鸡蛋包裹', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `Dish` (`id`, `storeId`, `name`, `category`, `status`, `stepJin`, `stockJin`, `description`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
  ('seed-dish-spinach', 'seed-store-lotus', '菠菜', 'LEAFY', 'ON_SALE', 0.50, 82.00, '本周新鲜到店', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-dish-tomato', 'seed-store-lotus', '番茄', 'FRUIT', 'ON_SALE', 1.00, 40.00, '本周新鲜到店', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-dish-cucumber', 'seed-store-lotus', '黄瓜', 'ACTIVITY', 'ON_SALE', 0.50, 18.00, '本周新鲜到店', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-dish-lettuce', 'seed-store-lotus', '生菜', 'LEAFY', 'ON_SALE', 0.50, 45.00, '本周新鲜到店', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `Task` (`id`, `storeId`, `name`, `status`, `startsAt`, `endsAt`, `cutoffTime`, `tag`, `createdAt`, `updatedAt`)
VALUES ('seed-task-weekly-reservation', 'seed-store-lotus', '本周精选预订任务', 'ACTIVE', '2026-01-01 00:00:00', '2099-12-31 23:59:59', '18:00', '本周精选', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `TaskDish` (`taskId`, `dishId`, `sortOrder`) VALUES
  ('seed-task-weekly-reservation', 'seed-dish-spinach', 0),
  ('seed-task-weekly-reservation', 'seed-dish-tomato', 1),
  ('seed-task-weekly-reservation', 'seed-dish-cucumber', 2),
  ('seed-task-weekly-reservation', 'seed-dish-lettuce', 3);

INSERT IGNORE INTO `SystemConfig` (`id`, `storeId`, `key`, `value`, `createdAt`, `updatedAt`)
VALUES ('seed-config-cutoff-time', 'seed-store-lotus', 'cutoff_time', JSON_QUOTE('18:00'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `SystemConfig` (`id`, `storeId`, `key`, `value`, `createdAt`, `updatedAt`) VALUES
  ('seed-config-login-title', 'seed-store-lotus', 'login_title', JSON_QUOTE('Hentor Fresh'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-config-login-subtitle', 'seed-store-lotus', 'login_subtitle', JSON_QUOTE('社区鲜蔬会员'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-config-login-welcome', 'seed-store-lotus', 'login_welcome', JSON_QUOTE('欢迎来到蔬菜预订'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-config-login-image-url', 'seed-store-lotus', 'login_image_url', JSON_QUOTE(''), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

SET FOREIGN_KEY_CHECKS = 1;
