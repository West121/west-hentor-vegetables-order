import { hash } from "bcryptjs";

import { prisma, Prisma } from "../src/index";

async function main() {
  const passwordHash = await hash("Admin123456", 10);

  const franchisee = await prisma.franchisee.upsert({
    where: { id: "seed-franchisee-hentor" },
    update: {},
    create: {
      id: "seed-franchisee-hentor",
      name: "恒拓生鲜加盟商",
      contactName: "徐竹西",
      contactPhone: "13800000000",
      contractEndsAt: new Date("2027-12-31T23:59:59+08:00"),
    },
  });

  const store = await prisma.store.upsert({
    where: { code: "lotus-garden" },
    update: {
      name: "莲花小区加盟店",
      status: "ACTIVE",
    },
    create: {
      id: "seed-store-lotus",
      franchiseeId: franchisee.id,
      code: "lotus-garden",
      name: "莲花小区加盟店",
      type: "FRANCHISE",
      contactName: "张店长",
      contactPhone: "13900000001",
      province: "北京市",
      city: "北京市",
      district: "朝阳区",
      address: "望京街道 10 号院",
      customerServiceTel: "400-800-1000",
      cutoffTime: "18:00",
      franchiseEndsAt: new Date("2027-12-31T23:59:59+08:00"),
    },
  });

  const permissions = [
    ["orders.read", "查看订单"],
    ["orders.write", "处理订单"],
    ["members.read", "查看会员"],
    ["members.write", "管理会员"],
    ["stores.manage", "管理门店"],
    ["system.manage", "系统管理"],
  ] as const;

  for (const [code, name] of permissions) {
    await prisma.adminPermission.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }

  const superAdminRole = await prisma.adminRole.upsert({
    where: { code: "super_admin" },
    update: { name: "超级管理员" },
    create: { code: "super_admin", name: "超级管理员" },
  });

  const allPermissions = await prisma.adminPermission.findMany();
  for (const permission of allPermissions) {
    await prisma.adminRolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });
  }

  const admin = await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: {
      name: "Xu West",
      passwordHash,
      status: "ACTIVE",
    },
    create: {
      username: "admin",
      name: "Xu West",
      phone: "13800000000",
      passwordHash,
      status: "ACTIVE",
    },
  });

  await prisma.adminUserRole.upsert({
    where: {
      adminUserId_roleId: {
        adminUserId: admin.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      adminUserId: admin.id,
      roleId: superAdminRole.id,
    },
  });

  await prisma.adminUserStore.upsert({
    where: {
      adminUserId_storeId: {
        adminUserId: admin.id,
        storeId: store.id,
      },
    },
    update: {},
    create: {
      adminUserId: admin.id,
      storeId: store.id,
    },
  });

  const user = await prisma.user.upsert({
    where: { openid: "mock-openid-lotus-001" },
    update: {
      phone: "13800005678",
      nickname: "张建国",
      defaultStoreId: store.id,
    },
    create: {
      openid: "mock-openid-lotus-001",
      phone: "13800005678",
      nickname: "张建国",
      defaultStoreId: store.id,
    },
  });

  await prisma.memberStoreBinding.upsert({
    where: {
      userId_storeId: {
        userId: user.id,
        storeId: store.id,
      },
    },
    update: {
      isDefault: true,
      status: "ACTIVE",
    },
    create: {
      userId: user.id,
      storeId: store.id,
      isDefault: true,
      source: "seed",
    },
  });

  const address = await prisma.address.upsert({
    where: { id: "seed-address-lotus-001" },
    update: {
      userId: user.id,
      storeId: store.id,
      isDefault: true,
    },
    create: {
      id: "seed-address-lotus-001",
      userId: user.id,
      storeId: store.id,
      receiverName: "张建国",
      receiverPhone: "13800005678",
      province: "北京市",
      city: "北京市",
      district: "朝阳区",
      detail: "莲花小区 3栋 602",
      isDefault: true,
    },
  });

  const packageTemplate = await prisma.packageTemplate.upsert({
    where: { id: "seed-package-8jin-weekly" },
    update: {
      name: "8斤周套餐",
      weightLimitJin: new Prisma.Decimal("8.00"),
      totalTimes: 8,
    },
    create: {
      id: "seed-package-8jin-weekly",
      storeId: store.id,
      name: "8斤周套餐",
      totalTimes: 8,
      weightLimitJin: new Prisma.Decimal("8.00"),
      validDays: 90,
      sortOrder: 1,
    },
  });

  const userPackage = await prisma.userPackage.upsert({
    where: { id: "seed-user-package-lotus-001" },
    update: {
      status: "ACTIVE",
      usedTimes: 3,
    },
    create: {
      id: "seed-user-package-lotus-001",
      userId: user.id,
      storeId: store.id,
      templateId: packageTemplate.id,
      nameSnapshot: packageTemplate.name,
      totalTimes: 8,
      usedTimes: 3,
      weightLimitJin: new Prisma.Decimal("8.00"),
      status: "ACTIVE",
      startsAt: new Date("2026-06-01T00:00:00+08:00"),
      expiresAt: new Date("2026-09-01T23:59:59+08:00"),
      nextOrderDate: new Date("2026-06-24T00:00:00+08:00"),
    },
  });

  const dishSeed = [
    ["seed-dish-spinach", "菠菜", "LEAFY", "0.50", "82.00"],
    ["seed-dish-tomato", "番茄", "FRUIT", "1.00", "40.00"],
    ["seed-dish-cucumber", "黄瓜", "ACTIVITY", "0.50", "18.00"],
    ["seed-dish-lettuce", "生菜", "LEAFY", "0.50", "45.00"],
  ] as const;

  for (const [id, name, category, stepJin, stockJin] of dishSeed) {
    await prisma.dish.upsert({
      where: { id },
      update: {
        name,
        stockJin: new Prisma.Decimal(stockJin),
        status: "ON_SALE",
      },
      create: {
        id,
        storeId: store.id,
        name,
        category,
        stepJin: new Prisma.Decimal(stepJin),
        stockJin: new Prisma.Decimal(stockJin),
        status: "ON_SALE",
        description: "本周新鲜到店",
      },
    });
  }

  const weeklyTask = await prisma.task.upsert({
    where: { id: "seed-task-weekly-reservation" },
    update: {
      cutoffTime: "18:00",
      endsAt: new Date("2099-12-31T23:59:59+08:00"),
      name: "本周精选预订任务",
      startsAt: new Date("2026-01-01T00:00:00+08:00"),
      status: "ACTIVE",
      tag: "本周精选",
    },
    create: {
      id: "seed-task-weekly-reservation",
      storeId: store.id,
      name: "本周精选预订任务",
      status: "ACTIVE",
      startsAt: new Date("2026-01-01T00:00:00+08:00"),
      endsAt: new Date("2099-12-31T23:59:59+08:00"),
      cutoffTime: "18:00",
      tag: "本周精选",
    },
  });

  await prisma.taskDish.deleteMany({
    where: { taskId: weeklyTask.id },
  });
  await prisma.taskDish.createMany({
    data: [
      { taskId: weeklyTask.id, dishId: "seed-dish-spinach", sortOrder: 0 },
      { taskId: weeklyTask.id, dishId: "seed-dish-tomato", sortOrder: 1 },
      { taskId: weeklyTask.id, dishId: "seed-dish-cucumber", sortOrder: 2 },
      { taskId: weeklyTask.id, dishId: "seed-dish-lettuce", sortOrder: 3 },
    ],
  });

  await prisma.order.upsert({
    where: { orderNo: "OD202606170042" },
    update: {},
    create: {
      storeId: store.id,
      userId: user.id,
      userPackageId: userPackage.id,
      addressId: address.id,
      orderNo: "OD202606170042",
      status: "PENDING_SHIPMENT",
      totalWeightJin: new Prisma.Decimal("2.50"),
      addressSnapshot: {
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
        detail: address.detail,
      },
      userVisibleRemark: "不要香菜，配送前电话确认。",
      items: {
        create: [
          {
            dishId: "seed-dish-spinach",
            dishNameSnapshot: "菠菜",
            weightJin: new Prisma.Decimal("1.00"),
            stepJinSnapshot: new Prisma.Decimal("0.50"),
          },
          {
            dishId: "seed-dish-cucumber",
            dishNameSnapshot: "黄瓜",
            weightJin: new Prisma.Decimal("1.50"),
            stepJinSnapshot: new Prisma.Decimal("0.50"),
          },
        ],
      },
    },
  });

  await prisma.systemConfig.upsert({
    where: {
      storeId_key: {
        storeId: store.id,
        key: "cutoff_time",
      },
    },
    update: {
      value: "18:00",
    },
    create: {
      storeId: store.id,
      key: "cutoff_time",
      value: "18:00",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
