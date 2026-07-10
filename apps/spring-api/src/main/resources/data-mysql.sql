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
  ('seed-config-user-agreement-content', 'seed-store-lotus', 'user_agreement_content', JSON_QUOTE('<h2>用户服务协议</h2><p>本协议是您与本生鲜小程序运营主体就线上生鲜订购、配送、会员服务订立的合法有效合约。您在点击登录、勾选同意、使用小程序下单前，请完整阅读本协议及配套《隐私政策》；若不认可全部条款，您可点击登录页【取消 / 返回】退出登录，仅以游客身份浏览商品，不可使用下单、配送、售后等核心功能。平台正式提供蔬菜、水果、肉禽水产、预制生鲜、月度 / 季度 / 年度生鲜套餐选购、线上下单、配送到家、订单售后、会员储值、订单查询等服务。用户需保证提交信息真实有效，禁止恶意刷单、虚假售后、恶意占单、爬虫、破解或篡改接口。生鲜属于鲜活易损耗品类，无变质、缺斤少两、破损等质量问题不支持无理由退货；存在质量问题时可凭实拍凭证申请售后。本协议适用中华人民共和国现行法律，争议优先协商，协商不成可向平台运营主体所在地人民法院提起诉讼。</p>'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-config-privacy-policy-content', 'seed-store-lotus', 'privacy_policy_content', JSON_QUOTE('<h2>隐私政策</h2><p>本隐私政策依据《中华人民共和国个人信息保护法》《网络安全法》《电子商务法》制定，用于说明本生鲜小程序如何收集、使用、存储、保护您的个人信息。平台仅在您主动发起登录时申请微信昵称、头像、OpenID 用于账号识别；如需配送服务，由您自愿填写手机号、收货地址。相关信息仅用于生鲜商城订单履约、会员服务、售后处理、配送到家、订单通知和客服沟通，不用于无关营销骚扰，不对外出售、出租或无偿共享给无关第三方。平台不会主动申请相册、麦克风、定位、通讯录、身份证等非必要敏感信息；如后续业务需要，将单独弹窗告知用途并取得明确授权。用户个人信息存储于中国大陆境内合规服务器，并通过加密存储、分级权限、操作日志审计等方式保护。您可在个人中心查看、修改收货地址、联系电话，也可联系客服申请删除个人信息或撤回授权。</p>'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

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
