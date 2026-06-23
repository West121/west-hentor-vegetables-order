# 蔬菜预订系统前后端真实测试用例文档

版本：2026-06-23  
项目目录：`/Users/west/Downloads/west-hentor-vegetables-order`  
测试范围：管理后台、微信小程序、Next API、Spring API、数据库、对象存储、快递100云打印、跨端业务链路。

## 1. 文档目标

这份文档用于指导真实测试，不只看静态代码，也不只测 Java 后端。验收时必须同时覆盖：

- 管理后台：Next.js + React + shadcn + Tailwind，运行在 `apps/admin-web`。
- 微信小程序：Taro + NutUI，运行在 `apps/miniapp`，使用微信开发者工具验证。
- Next API：`apps/admin-web/app/api/admin/**` 和 `apps/admin-web/app/api/v1/**`。
- Spring API：`apps/spring-api/src/main/java/cn/hentor/vegetables/controller/**`，接口前缀为 `/api/spring/**`。
- 数据层：PostgreSQL、Redis、MinIO、Prisma、Spring MyBatis Plus。
- 外部能力：微信手机号登录预留、微信支付预留、快递100电子面单和云打印。

测试原则：

- 以真实页面、真实 API、真实数据库状态为准。
- Figma 原型只作为视觉和交互基线，最终以可运行系统行为验收。
- 后台和小程序同一业务必须串起来测，例如后台下架菜品后，小程序首页和提交校验都要一致。
- 所有列表必须验证分页、筛选、查询条件、空态和异常态。
- 所有可写动作必须验证操作日志，日志至少包含请求参数、返回参数、响应时长、操作人、来源端、IP、User-Agent、时间。

## 2. 环境与启动

### 2.1 基础依赖

- Node.js / pnpm：使用项目根目录 `package.json` 中的脚本。
- Java 21 / Maven：用于 `apps/spring-api`。
- Docker Compose：用于 PostgreSQL、Redis、MinIO。
- 微信开发者工具：用于小程序手工测试和运行时截图。

### 2.2 初始化命令

```bash
pnpm install
pnpm setup:dev
pnpm dev:admin
pnpm dev:mini
pnpm dev:spring
```

### 2.3 自动化验证命令

```bash
pnpm test
pnpm build
pnpm build:spring
pnpm smoke:admin-artifacts
pnpm smoke:admin-runtime-visual
pnpm smoke:miniapp-artifacts
pnpm smoke:miniapp-runtime-visual
pnpm smoke:real
pnpm smoke:spring-api
node scripts/completion-audit.mjs
node --test scripts/*.test.mjs
```

### 2.4 关键测试账号与数据

- 管理后台地址：`http://127.0.0.1:3000`
- 管理员：种子数据中的超级管理员账号。
- 小程序手机号：`15295081992`
- 测试会员：导入张三、张建国、无套餐会员等种子会员。
- 默认地址：江苏省 南京市 六合区 龙池街道冠城大通。
- 测试套餐：8斤周套餐，附加权益包含鸡蛋 1 箱。
- 快递配置：快递100授权 key、secret、云打印 `siid` 使用环境变量注入，不写入文档和源码。

## 3. 覆盖矩阵

| 编号 | 测试对象 | 主要路径 | 自动化覆盖 | 手工覆盖 |
|---|---|---|---|---|
| MATRIX-001 | 管理后台 UI | `apps/admin-web/app/ui/**` | usage test、runtime visual smoke | Chrome 页面核对 |
| MATRIX-002 | 小程序 UI | `apps/miniapp/src/pages/**` | lib test、artifact smoke、runtime visual smoke | 微信开发者工具 |
| MATRIX-003 | Next API | `apps/admin-web/app/api/**` | route test、real data smoke | 浏览器/API 调试 |
| MATRIX-004 | Spring API | `apps/spring-api/src/main/java/**` | JUnit、spring route contract、spring smoke | curl/Postman |
| MATRIX-005 | 数据持久化 | `packages/db/prisma/**` | package db tests | Prisma Studio/SQL |
| MATRIX-006 | 外部服务 | MinIO、快递100、微信能力 | 单元测试 + 配置缺失测试 | 沙箱或真实配置 |
| MATRIX-007 | 跨端链路 | 后台配置 -> 小程序展示 -> 订单 -> 后台处理 | `pnpm smoke:real` | 联调验收 |

## 4. P0 管理后台测试用例

### P0-ADMIN-001 登录与会话

前置条件：数据库已 seed，后台服务运行。  
步骤：

1. 打开 `http://127.0.0.1:3000/login`。
2. 输入管理员账号密码，点击登录。
3. 刷新页面，确认仍在管理后台。
4. 点击右上角用户区域，执行退出登录。

预期：

- 登录页左侧为蔬菜主题图片，不展示无意义统计。
- 登录成功进入运营总览。
- 会话写入服务端，刷新不丢失。
- 退出登录后回到登录页。
- 操作日志记录登录成功、退出登录，包含响应时长。

自动化建议：

- `apps/admin-web/app/login/page.usage.test.ts`
- `apps/admin-web/app/lib/session-token.test.ts`
- `apps/admin-web/app/api/admin/auth/login/route.ts`

### P0-ADMIN-002 菜单层级、折叠与搜索

步骤：

1. 查看一级菜单：工作台、订单管理、会员管理、套餐管理、任务管理、系统管理。
2. 展开二级菜单，确认后台用户、操作日志、菜单管理、角色管理分属系统管理。
3. 折叠侧边栏，确认只显示一级菜单图标。
4. 鼠标悬浮有二级菜单的一级图标，确认浮层展示二级菜单。
5. 在顶部搜索框输入“订单”“操作日志”“菜品”，确认以层级形式展示搜索结果。

预期：

- 一级菜单可配置图标，二级菜单显示正确图标。
- 收缩按钮在侧边栏右上边缘，图标清晰，不显示“展开”文字。
- 搜索是“搜索菜单 / 功能”，不是订单搜索。
- 点击搜索结果能跳到对应模块。

自动化建议：

- `apps/admin-web/app/ui/admin-shell-navigation-state.test.ts`
- `apps/admin-web/app/ui/admin-menu-search.usage.test.ts`
- `scripts/admin-runtime-visual-smoke.mjs`

### P0-ADMIN-003 shadcn 表单组件一致性

步骤：

1. 打开订单管理、任务管理、会员管理、套餐管理。
2. 检查筛选下拉、日期选择、时间输入。
3. 使用订单状态筛选和日期筛选查询列表。

预期：

- 下拉使用 shadcn `Select`，不能出现浏览器原生下拉样式。
- 日期使用 shadcn `Popover + Calendar`，不能使用原生 date input。
- 查询、重置、分页状态同步。

自动化建议：

- `apps/admin-web/app/ui/list-filters.usage.test.ts`
- `apps/admin-web/app/ui/admin-date-time-picker.tsx`

### P0-ADMIN-004 弹窗详情、新建、编辑

步骤：

1. 在订单、会员、套餐、菜品、任务列表打开详情。
2. 点击编辑或新建。
3. 拖拽标题栏，调整弹窗位置。
4. 拖拽右下角，调整尺寸。
5. 点击全屏图标，再恢复。
6. 修改未保存内容后关闭。

预期：

- 详情、编辑、新建都在弹窗中打开。
- 标题栏支持拖拽。
- 右下角支持伸缩。
- 右上角全屏按钮是图标按钮。
- 关闭未保存内容使用系统内自定义确认，不使用浏览器原生 `window.confirm`。
- 弹窗内不展示“弹窗工作模式”等给开发者看的说明。

自动化建议：

- `apps/admin-web/app/ui/draggable-modal-controls.usage.test.ts`
- `apps/admin-web/app/ui/admin-modal-close-guard.test.ts`
- `apps/admin-web/app/ui/order-modal-dirty.test.ts`

### P0-ADMIN-005 订单管理列表与处理

步骤：

1. 进入订单管理。
2. 使用状态、下单日期、关键词筛选。
3. 翻页，确认总数和当前页正确。
4. 打开订单详情。
5. 编辑配送处理，添加多个快递单。
6. 对蔬菜包裹、鸡蛋包裹分别录入物流信息。
7. 保存，刷新列表和详情。

预期：

- 列表有筛选、分页、查询、重置。
- 订单详情展示会员、地址、套餐、菜品明细、附加权益。
- 每个订单支持多个物流号，包裹类型可区分蔬菜、鸡蛋、其他权益。
- 保存后状态和物流信息持久化。
- 操作日志记录订单查看、编辑、发货、批量发货。

自动化建议：

- `apps/admin-web/app/ui/order-management-panel.usage.test.ts`
- `packages/db/src/orders.test.ts`
- `pnpm smoke:real`

### P0-ADMIN-006 订单打印与快递100云打印

步骤：

1. 配置快递100 key、secret、云打印设备 `siid`、寄件人信息。
2. 打开待配送订单。
3. 点击打印面单。
4. 对多包裹订单分别创建打印任务。
5. 检查打印结果和错误提示。

预期：

- 打印入口在订单管理列表和详情中可见。
- 云打印调用快递100电子面单接口，不只是本地预览。
- 接口保持旧项目 `Hyhyxcx` 参数口径：`https://api.kuaidi100.com/label/order`、`method=order`、`printType=CLOUD`、`tempId`、`siid`、`code`、`partnerId`、`partnerKey`。
- 缺少配置时提示明确缺哪个配置。
- 100mm x 150mm 面单内容包含收件人、收件电话、地址、商品摘要、包裹数量。
- 打印请求和响应写入操作日志。

自动化建议：

- `apps/admin-web/app/api/admin/orders/print-labels/route.ts`
- `apps/spring-api/src/main/java/cn/hentor/vegetables/service/Kuaidi100Service.java`
- `apps/spring-api/src/test/java/cn/hentor/vegetables/service/Kuaidi100ServiceTest.java`

### P0-ADMIN-007 会员用户管理

步骤：

1. 进入会员用户。
2. 搜索手机号、昵称、备注。
3. 按状态筛选。
4. 打开编辑会员。
5. 修改昵称、省、市、区、详细地址、备注、服务状态。
6. 保存并重新打开详情。

预期：

- 会员用户和后台用户分开管理。
- 会员默认地址包含省、市、区、详细地址。
- 不显示门店或加盟相关显性文案。
- 停用会员需要原因。
- 操作日志记录查看、编辑、停用、恢复。

自动化建议：

- `apps/admin-web/app/ui/member-management-panel.usage.test.ts`
- `packages/db/src/members.test.ts`

### P0-ADMIN-008 会员导入与会员套餐导入

步骤：

1. 进入会员用户。
2. 点击导入会员。
3. 上传 `.xlsx`、`.xls`、`.csv` 三种格式测试文件。
4. 点击会员行内“调整套餐”或“导入套餐”。
5. 上传会员套餐文件。

预期：

- 只支持文件上传，不支持复制粘贴导入。
- 导入入口在会员管理里，不需要单独会员套餐页面。
- 导入结果展示成功数、失败数、失败行号和失败原因。
- 会员套餐按添加时间先进先用，前天套餐用完后再扣昨天套餐。
- 不出现有效期、到期、下次可预订日期等字段。

自动化建议：

- `apps/admin-web/app/lib/spreadsheet-import.test.ts`
- `apps/admin-web/app/ui/member-import-parser.test.ts`
- `apps/admin-web/app/api/admin/members/import/route.ts`
- `apps/admin-web/app/api/admin/user-packages/import/route.ts`

### P0-ADMIN-009 菜品管理、图片、上下架、库存

步骤：

1. 进入菜品管理。
2. 新建菜品，上传图片。
3. 验证图片格式和大小限制说明。
4. 编辑菜品，确认不能直接修改库存。
5. 使用库存调整弹窗调整库存。
6. 使用列表快捷图标执行上架、下架。
7. 刷新小程序首页。

预期：

- 支持 JPG、PNG、WEBP 等限定格式，文件大小限制有可见说明。
- 图片上传到 MinIO 或配置的对象存储，后台显示预览，小程序首页显示真实图片。
- 编辑菜品不能修改库存，库存只能通过库存调整记录变更。
- 上下架是图标按钮。
- 下架菜品不再展示在小程序可选列表。
- 如果用户今日订单已包含下架菜品，小程序修改页面仍展示该菜，并提示该菜已下架请修改。

自动化建议：

- `apps/admin-web/app/api/admin/uploads/dish-images/route.test.ts`
- `apps/admin-web/app/ui/dish-management-panel.usage.test.ts`
- `packages/db/src/dishes.test.ts`

### P0-ADMIN-010 套餐模板与附加权益

步骤：

1. 新建 8斤周套餐。
2. 配置总次数 8 次、单次蔬菜额度 8 斤。
3. 增加附加权益：鸡蛋，总量 1 箱。
4. 保存模板并给会员开通套餐。
5. 在小程序首页刷新。

预期：

- 套餐支持可配置权益，不限于蔬菜，后续可扩展老母鸡、玉米、水果。
- 蔬菜额度按每次订单扣减。
- 鸡蛋按套餐总量扣减，不占蔬菜斤数。
- 鸡蛋剩余为 0 时，首页套餐卡仍展示“鸡蛋 0箱”，但今日菜品列表不再展示鸡蛋可选项。
- 后台和小程序不展示套餐有效期。

自动化建议：

- `packages/db/src/package-templates.test.ts`
- `packages/db/src/packages.test.ts`
- `apps/admin-web/app/ui/package-template-management-panel.usage.test.ts`

### P0-ADMIN-011 任务管理与每日任务

步骤：

1. 创建明日配送任务，配置可订菜品和截止时间。
2. 任务生效后尝试修改。
3. 第二天刷新任务。
4. 检查首页可订菜品和数量。

预期：

- 任务未生效前可编辑。
- 任务一旦生效不能再修改关键内容。
- 第二天任务刷新后，已选数量和菜品选择重置。
- 小程序首页菜品展示由任务菜品和实时上下架状态共同决定。
- 预订提交、修改时再次校验任务、上下架、库存、截止时间。

自动化建议：

- `packages/db/src/tasks.test.ts`
- `apps/admin-web/app/ui/task-management-panel.usage.test.ts`

### P0-ADMIN-012 系统设置、配送范围、角色权限

步骤：

1. 进入系统设置。
2. 配置配送范围：省、市。
3. 进入菜单管理，查看树形表格。
4. 进入角色管理，新增角色并配置菜单权限。
5. 新增后台用户并绑定角色。

预期：

- 配送范围先限制省、市。
- 小程序新增和编辑地址时，省市不在配送范围内不能保存。
- 菜单管理是树形表格，支持一级菜单图标配置。
- 角色权限影响后台菜单和接口访问。
- 后台用户、角色、菜单、操作日志属于系统管理。

自动化建议：

- `apps/admin-web/app/ui/system-settings-panel.usage.test.ts`
- `apps/admin-web/app/ui/menu-management-panel.tsx`
- `apps/admin-web/app/ui/role-management-panel.tsx`
- `packages/db/src/system-management.test.ts`

### P0-ADMIN-013 暗色主题切换

步骤：

1. 在管理后台切换暗色主题。
2. 再切回浅色主题。
3. 重复多次，观察动画方向和覆盖区域。

预期：

- 支持浅色、暗色主题。
- 切换动画速度自然。
- 浅色到暗色从右上向左下扩散。
- 暗色到浅色从左下向右上扩散。
- 侧边栏和主内容区域都被动画覆盖。
- 主题偏好持久化。

自动化建议：

- `apps/admin-web/app/ui/admin-theme-toggle.usage.test.ts`
- `apps/admin-web/app/ui/admin-shell-preferences.test.ts`

## 5. P0 微信小程序测试用例

### P0-MINI-001 登录页与手机号登录

步骤：

1. 打开小程序登录页。
2. 检查登录页背景、顶部、按钮和协议展示。
3. 勾选协议。
4. 点击微信手机号快捷登录。
5. 登录后进入首页。

预期：

- 登录页简洁，符合蔬菜预订主题。
- 不展示冗余介绍、无套餐说明。
- 使用微信最新手机号授权能力，避免废弃 API。
- 授权失败有明确提示。
- 登录成功后服务端写入会员信息和操作日志。

自动化建议：

- `apps/miniapp/src/pages/login/index.tsx`
- `apps/admin-web/app/api/v1/auth/wx-phone/route.test.ts`

### P0-MINI-002 昵称修改

步骤：

1. 进入我的页面。
2. 进入账号设置。
3. 修改昵称。
4. 保存并回到我的页面。

预期：

- 支持用户手动修改昵称。
- 微信昵称获取使用最新可用 API 能力，不能依赖废弃的 `wx.getUserInfo` 自动获取。
- 保存后首页、我的页面、后台会员详情同步显示新昵称。
- 操作日志记录昵称修改。

自动化建议：

- `apps/miniapp/src/lib/me.test.ts`
- `apps/admin-web/app/api/v1/me/route.ts`

### P0-MINI-003 首页有套餐状态

步骤：

1. 使用有套餐会员登录。
2. 打开首页。
3. 检查顶部套餐卡、菜品网格、底部地址和已选区域。
4. 调整菜品斤数。
5. 选择鸡蛋。

预期：

- 顶部融合小程序状态栏，不额外显示“首页”大标题。
- 套餐卡展示总次数、已用次数、剩余次数，数字后带“次”。
- 套餐卡展示附加权益，包括鸡蛋剩余 0 箱也要展示。
- 菜品默认每行 3 个，可配置。
- 菜品图片在上，名称和斤数垂直间距合理，按钮不同机型不错位。
- 鸡蛋有剩余时展示在可选列表，选中鸡蛋不占蔬菜斤数。
- 底部固定区域在 Tabbar 上方，包含配送地址、切换或新增地址、已选汇总、提交按钮。

自动化建议：

- `apps/miniapp/src/pages/home/index.usage.test.ts`
- `apps/miniapp/src/lib/home.test.ts`
- `scripts/miniapp-runtime-visual-smoke.mjs`

### P0-MINI-004 首页无套餐状态

步骤：

1. 使用无套餐会员登录。
2. 打开首页。
3. 尝试选择菜品并提交。

预期：

- 首页展示无可用套餐提示。
- 菜品可浏览但不能提交，或按钮置灰。
- 提示用户去“我的-套餐”购买，微信支付入口仅预留。
- 不展示无意义空套餐卡。

自动化建议：

- `apps/miniapp/src/lib/home.test.ts`
- `pnpm smoke:real`

### P0-MINI-005 一天只能一个订单

步骤：

1. 首页选择菜品提交。
2. 提交成功后回到首页。
3. 再次进入小程序。
4. 查看今日已订状态。

预期：

- 同一天只能有一个有效订单。
- 提交成功后按钮变成“修改预订”。
- 每次重新进入小程序要刷新今日预订数量，不使用旧缓存。
- 我的页面也刷新今日预订卡片。
- 超过截止时间不可修改。

自动化建议：

- `apps/miniapp/src/lib/orders.test.ts`
- `packages/db/src/reservations.test.ts`
- `apps/admin-web/app/api/v1/orders/route.test.ts`

### P0-MINI-006 提交与修改确认页

步骤：

1. 首页选择番茄 4斤、鸡蛋 1箱。
2. 点击提交预订。
3. 查看确认页。
4. 保存后回到首页。
5. 再点击修改预订。

预期：

- 页面左上角有返回。
- 不展示“变化明细”“本次修改”等复杂区块。
- 只展示和首页一致的已选菜品卡片和斤数，去掉加减号，未选菜品不显示。
- 鸡蛋作为附加权益卡片展示，单位为箱。
- 地址卡片展示完整省市区和详细地址。
- 保存后覆盖原预订。
- 提交失败时提示业务原因，不出现 500 页面。

自动化建议：

- `apps/miniapp/src/pages/home/index.usage.test.ts`
- `apps/admin-web/app/api/v1/orders/[orderId]/route.test.ts`

### P0-MINI-007 地址新增、编辑、默认地址

步骤：

1. 首页底部点击新增地址。
2. 在弹框表单中填写收货人、电话、省市区、详细地址。
3. 使用级联地址选择省市区。
4. 保存。
5. 编辑默认地址。
6. 尝试关闭默认地址开关。

预期：

- 新增地址不是单独页面，使用弹框或底部抽屉。
- 省市区使用 Taro/NutUI 或微信原生 region picker 的级联体验。
- 详细地址单独输入。
- 默认地址不能直接关闭，只能将其他地址设为默认。
- 配送范围按后台配置校验省、市。
- 操作日志记录新增、编辑、设为默认、删除。

自动化建议：

- `apps/miniapp/src/lib/addresses.test.ts`
- `apps/admin-web/app/api/v1/addresses/route.test.ts`
- `packages/db/src/addresses.test.ts`

### P0-MINI-008 我的页面

步骤：

1. 进入我的页面。
2. 检查顶部会员区、套餐卡、今日预订卡、常用服务。
3. 点击订单、修改预订、地址管理、套餐、账号设置。
4. 检查 Tabbar 图标。

预期：

- 我的页面和 Figma 原型一致。
- 暂时隐藏联系客服、最近消耗。
- 保留订单入口、套餐入口。
- 小程序我的订单中隐藏修改入口。
- 账号设置里的“注销”改为“退出登录”。
- Tabbar 首页、我的图标清晰，不模糊。

自动化建议：

- `apps/miniapp/src/pages/me/index.usage.test.ts`
- `scripts/miniapp-artifact-smoke.mjs`

### P0-MINI-009 小程序图片与资源

步骤：

1. 后台上传菜品图片。
2. 小程序重新进入首页。
3. 检查菜品图片。
4. 模拟图片加载失败。

预期：

- 小程序展示后台上传图片，不只显示本地占位图。
- 图片比例统一，不能遮挡菜名。
- 图片加载失败使用稳定占位，不导致布局错乱。

自动化建议：

- `apps/miniapp/src/assets/dishes/**`
- `apps/miniapp/src/lib/home.test.ts`
- `pnpm smoke:miniapp-runtime-visual`

## 6. P0 Next API 测试用例

### P0-NEXT-001 管理后台订单 API

覆盖接口：

- `GET /api/admin/orders`
- `GET /api/admin/orders/:orderId`
- `POST /api/admin/orders`
- `PUT /api/admin/orders/:orderId`
- `POST /api/admin/orders/:orderId/ship`
- `POST /api/admin/orders/batch-ship`
- `POST /api/admin/orders/print-labels`
- `GET /api/admin/orders/export`

预期：

- 所有列表接口支持分页参数。
- 筛选条件传入后返回结果与数据库一致。
- 多物流号保存后，详情和列表都能展示。
- 打印面单接口能处理快递100配置缺失和成功返回。
- 所有写接口记录操作日志。

### P0-NEXT-002 小程序订单 API

覆盖接口：

- `GET /api/v1/home`
- `POST /api/v1/reservations`
- `GET /api/v1/orders`
- `POST /api/v1/orders`
- `PUT /api/v1/orders/:orderId`
- `POST /api/v1/orders/:orderId/cancel`
- `POST /api/v1/orders/:orderId/user-visible`

预期：

- 首页返回今日任务、套餐、附加权益、今日订单、地址。
- 同日重复提交返回业务错误。
- 修改订单校验上下架、库存、任务、截止时间。
- 用户隐藏订单后，后台仍可见，小程序不可见。

### P0-NEXT-003 会员与套餐 API

覆盖接口：

- `GET /api/admin/members`
- `POST /api/admin/members/import`
- `GET /api/admin/members/:userId`
- `PUT /api/admin/members/:userId`
- `GET /api/admin/user-packages`
- `POST /api/admin/user-packages`
- `PUT /api/admin/user-packages/:packageId`
- `POST /api/admin/user-packages/import`

预期：

- 会员导入支持 xlsx、xls、csv。
- 会员套餐导入支持文件上传。
- 套餐按创建时间先进先用。
- 不接受有效期字段。

### P0-NEXT-004 操作日志 API

覆盖接口：

- `GET /api/admin/operation-logs`

预期：

- 支持分页、关键词、模块、动作、来源端、时间范围筛选。
- 时间格式为 `yyyy-MM-dd HH:mm:ss`。
- 记录请求参数、返回参数、响应时长。
- 小程序登录、新增地址、编辑地址、修改昵称、提交预订都能在后台看到日志。

## 7. P0 Spring API 测试用例

### P0-BE-001 Spring 健康检查

接口：`GET /api/spring/health`  
预期：

- 返回 PostgreSQL、Redis、MinIO 状态。
- 任一依赖不可用时返回明确状态，不抛未处理异常。

自动化：

- `scripts/spring-api-smoke.mjs`
- `apps/spring-api/src/main/java/cn/hentor/vegetables/controller/HealthController.java`

### P0-BE-002 Spring 管理后台接口

覆盖：

- `OrderController`
- `MemberController`
- `UserPackageController`
- `PackageTemplateController`
- `DishController`
- `TaskController`
- `SystemSettingsController`
- `OperationLogController`
- `AdminRoleController`
- `AdminUserController`

预期：

- 与 Next API 关键字段保持一致。
- 分页结构统一。
- 列表、详情、创建、编辑、删除、状态操作都返回 `ApiResponse`。
- 业务错误走全局异常处理。

自动化：

- `scripts/spring-route-contract.test.mjs`
- `scripts/spring-api-smoke.test.mjs`
- `pnpm build:spring`

### P0-BE-003 Spring 小程序接口

覆盖：

- `MiniappAuthController`
- `MiniappHomeController`
- `MiniappReservationController`
- `MiniappOrderController`
- `MiniappAddressController`
- `MiniappMeController`
- `MiniappPackageController`
- `MiniappPackagePurchaseController`

预期：

- 首页、登录、地址、预订、订单、我的页面接口可独立跑通。
- 蔬菜权益和鸡蛋权益分别扣减。
- 鸡蛋剩余 0 时仍在套餐卡返回权益状态，但不进入可选菜品列表。
- 地址保存校验配送范围。

### P0-BE-004 快递100服务

覆盖：

- `Kuaidi100Service`
- `Kuaidi100Properties`
- `OrderPrintLabelResult`
- `Kuaidi100CloudPrintRequest`

预期：

- 签名按快递100要求生成。
- 请求地址和参数保持旧项目 `Hyhyxcx` 电子面单口径，不使用 `printtask.do` 和 `method=eOrder`。
- 配置缺失时返回可读错误。
- 多包裹订单创建多个云打印任务。
- 打印结果落库到 `OrderShipment` 或对应配送记录。

自动化：

- `apps/spring-api/src/test/java/cn/hentor/vegetables/service/Kuaidi100ServiceTest.java`

## 8. P0 跨端业务链路

### P0-E2E-001 菜品上下架影响小程序

步骤：

1. 后台下架黄瓜。
2. 小程序首页刷新。
3. 确认黄瓜不在可选列表。
4. 构造已有订单包含黄瓜。
5. 进入修改预订。

预期：

- 首页不展示下架菜品。
- 已有订单里仍展示黄瓜。
- 页面提示黄瓜已下架，请修改。
- 提交时后端拒绝继续提交下架菜品。

### P0-E2E-002 库存不足

步骤：

1. 后台将番茄库存调为 3斤。
2. 小程序选择番茄 4斤。
3. 提交。

预期：

- 前端可提前提示库存不足。
- 后端必须再次校验，返回业务错误。
- 库存不被扣减。
- 操作日志记录失败请求。

### P0-E2E-003 鸡蛋权益

步骤：

1. 会员开通 8次8斤蔬菜 + 鸡蛋1箱套餐。
2. 首页选择番茄4斤和鸡蛋1箱。
3. 提交订单。
4. 再次进入首页。

预期：

- 第一次提交后蔬菜次数扣 1 次。
- 鸡蛋剩余变为 0箱。
- 套餐卡仍展示鸡蛋 0箱。
- 今日菜品列表不再展示鸡蛋。
- 订单详情、后台订单列表、打印面单都能看到鸡蛋包裹。

### P0-E2E-004 地址配送范围

步骤：

1. 后台系统设置只允许江苏省南京市。
2. 小程序新增地址选择江苏省南京市六合区，保存。
3. 小程序新增地址选择安徽省合肥市，保存。

预期：

- 南京地址保存成功。
- 合肥地址保存失败。
- 失败提示说明当前不在配送范围。
- 后台操作日志能看到失败请求和返回。

### P0-E2E-005 会员导入后下单

步骤：

1. 后台导入会员。
2. 后台导入会员套餐。
3. 小程序使用导入手机号登录。
4. 首页展示套餐。
5. 提交预订。

预期：

- 会员、地址、套餐导入后可直接用于小程序。
- 套餐按添加时间先进先用。
- 导入错误行不影响正确行入库。

### P0-E2E-006 订单处理、打印、发货

步骤：

1. 小程序提交含蔬菜和鸡蛋的订单。
2. 后台订单列表查询该订单。
3. 后台分别添加蔬菜包裹、鸡蛋包裹快递单。
4. 调用快递100云打印。
5. 标记发货。
6. 小程序订单详情查看物流。

预期：

- 后台订单详情展示多个配送包裹。
- 云打印结果成功入库。
- 小程序订单展示多个物流信息。
- 操作日志包含完整请求、响应、耗时。

## 9. P1 测试用例

### P1-001 管理后台所有列表分页

覆盖列表：

- 订单列表
- 发货统计
- 会员用户
- 会员套餐
- 套餐模板
- 菜品列表
- 任务列表
- 后台用户
- 角色列表
- 菜单树
- 操作日志

预期：

- 有总条数、当前页、上一页、下一页。
- 查询后分页重置到第一页。
- 空结果显示空态。
- 当前页删除最后一条后页码回退合理。

### P1-002 导出与导入边界

预期：

- 导出订单字段完整，手机号脱敏规则符合页面展示。
- 导入文件超过大小限制时提示。
- 导入空文件、错误表头、重复手机号、非法手机号、非法套餐名都有错误说明。

### P1-003 微信支付预留

预期：

- 购买套餐入口保留。
- 进入购买流程时提示微信支付暂未开放或返回预留状态。
- 后台套餐购买订单能看到待支付记录。
- 不影响现有预订。

### P1-004 主题与可访问性

预期：

- 暗色主题下文字、边框、弹窗、菜单、表格可读。
- 图标按钮有 `aria-label`。
- 搜索、筛选、弹窗关闭可键盘操作。

### P1-005 小程序多机型视觉

机型：

- iPhone SE
- iPhone 12/13
- iPhone 15 Pro
- Android 常见 390px 宽度

预期：

- 顶部状态栏融合。
- 菜品卡片不挤压。
- 加减按钮不偏移。
- 底部地址和已选区域不遮挡 Tabbar。

## 10. P2 测试用例

- 弱网下提交预订，按钮 loading 成对出现，失败后可重试。
- MinIO 图片读取失败，小程序使用占位图。
- Redis 会话过期后后台跳登录，小程序重新登录。
- 快递100超时后订单仍可保存人工物流号。
- 大量订单分页性能在 1000 条数据下可接受。
- 操作日志请求和返回参数需要脱敏手机号、openid、secret、token。

## 11. 建议新增自动化测试清单

| 优先级 | 文件建议 | 覆盖内容 |
|---|---|---|
| P0 | `apps/admin-web/app/ui/order-print-labels.usage.test.ts` | 多包裹云打印入口和状态 |
| P0 | `apps/admin-web/app/ui/member-package-import.usage.test.ts` | 会员内导入套餐 |
| P0 | `apps/miniapp/src/lib/benefit-selections.test.ts` | 鸡蛋等附加权益选择和扣减 |
| P0 | `apps/miniapp/src/pages/confirm/index.usage.test.ts` | 确认页只读卡片布局 |
| P0 | `apps/spring-api/src/test/java/cn/hentor/vegetables/service/MiniReservationServiceIntegrationTest.java` | 预订、修改、库存、上下架 |
| P0 | `apps/spring-api/src/test/java/cn/hentor/vegetables/service/OperationLogServiceIntegrationTest.java` | 请求、响应、耗时、脱敏 |
| P1 | `scripts/admin-shadcn-component-smoke.mjs` | 下拉、日期、弹窗组件非原生 |
| P1 | `scripts/miniapp-wechat-devtools-smoke.mjs` | 微信开发工具截图和控制台错误 |

## 12. 验收完成标准

交付前必须满足：

1. `node scripts/completion-audit.mjs` 通过。
2. `pnpm test` 通过。
3. `pnpm build:spring` 通过。
4. 管理后台能登录并打开订单、会员、菜品、任务、系统管理。
5. 小程序能登录、进入首页、提交预订、修改预订、进入我的页面。
6. 后台上传菜品图片后，小程序能显示。
7. 快递100配置缺失和配置存在两种路径都有测试。
8. 操作日志能看到后台和小程序关键写动作。
9. 文档中提到的“无有效期”“隐藏门店概念”“会员套餐导入在会员管理内”在页面和 API 中一致。

## 13. 当前项目已存在的验证入口

```bash
node scripts/completion-audit.mjs
node --test scripts/spring-route-contract.test.mjs
node --test scripts/spring-api-smoke.test.mjs
pnpm smoke:admin-artifacts
pnpm smoke:admin-runtime-visual
pnpm smoke:miniapp-artifacts
pnpm smoke:miniapp-runtime-visual
pnpm smoke:real
pnpm smoke:spring-api
```

这些入口只代表基础保障，不替代本文件中的真实业务验收。涉及微信登录、微信开发者工具渲染、快递100云打印设备、真实图片上传的用例，需要在本机真实环境补充手工验证记录。
