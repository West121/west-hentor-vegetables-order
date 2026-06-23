# Java 后端真实测试用例文档

**范围：** 只测试 Java Spring Boot 后端 `apps/spring-api` 暴露的 `/api/spring/**` 接口、服务逻辑和基础设施连接。不测试 Next.js API、管理后台页面、Taro 小程序页面或 Figma 视觉还原。

**当前代码基线：** Spring Boot 3.5.15、JDK 21、MyBatis-Plus 3.5.16、MyBatis-Plus-Join 1.5.7、PostgreSQL、Redis、MinIO、快递100云打印预留。

**使用的 Codex / Superpowers 能力：**

- `superpowers:using-superpowers`：用于确认应先选择技能再行动。
- `superpowers:writing-plans`：用于把真实后端测试拆成可执行、可追踪的文档结构。
- `superpowers:test-driven-development`：后续新增 Java 测试代码时，按“先写失败测试，再实现”的原则执行。
- `tool_search` 结果：没有发现比上述技能更贴合“Java 后端测试用例文档”的额外插件；搜索结果偏 iOS/Xcode，和本任务无关。

## 运行前置条件

1. 依赖服务启动：

```bash
pnpm docker:up
docker ps --format '{{.Names}} {{.Status}}' | rg 'hentor-(postgres|redis|minio)'
```

期望：`hentor-postgres`、`hentor-redis`、`hentor-minio` 均为 `healthy`。

2. 数据库初始化：

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

3. Java 后端启动：

```bash
pnpm dev:spring
```

期望日志包含：

- `Starting VegetablesSpringApiApplication using Java 21`
- `Spring Boot :: (v3.5.15)`
- `mybatis plus join ... 1.5.7`
- `Tomcat started on port 8080`

4. 测试账号与默认数据：

- 后台账号：`admin`
- 后台密码：`Admin123456`
- 默认门店编码：`lotus-garden`
- 本地会员手机号：`15295081992`
- API Base URL：`http://127.0.0.1:8080`

5. 通用请求约定：

- 后台接口先调用 `POST /api/spring/admin/auth/login`，后续请求带 `Authorization: Bearer <adminToken>`。
- 小程序接口先调用 `POST /api/spring/v1/auth/dev-login`，后续请求带 `Authorization: Bearer <miniToken>`。
- 所有 JSON API 期望 envelope：`success: true|false`、`data`、`error`。

## 自动化入口

| 命令 | 目标 | 当前覆盖 |
| --- | --- | --- |
| `pnpm build:spring` | Maven 编译与 JUnit | 快递100签名、参数、缺失配置 |
| `node --test scripts/spring-route-contract.test.mjs` | Spring/Next 路由契约与目标栈证明 | Spring 覆盖现有 API 方法、JDK21/MPJ/Redis/MinIO 使用证明、Next 后端仍保留 |
| `pnpm smoke:spring-api` | 真实 8080 HTTP smoke | 健康检查、后台登录、管理端列表、图片上传、订单创建/作废、小程序登录/首页/地址/订单/我的 |
| `node scripts/completion-audit.mjs` | 完成度审计 | Spring 后端文件、启动脚本、源代码关键契约 |

## P0 基础设施与启动

### JAVA-BE-001 健康检查同时验证 PostgreSQL、Redis、MinIO

**接口：** `GET /api/spring/health`

**步骤：**

```bash
curl -s http://127.0.0.1:8080/api/spring/health | python3 -m json.tool
```

**期望：**

- `success = true`
- `data.database.ok = true`
- `data.redis.ok = true`
- `data.redis.message = "PONG"`
- `data.minio.ok = true`
- `data.minio.bucket = "hentor-assets"`

**自动化建议：** 保持在 `scripts/spring-api-smoke.mjs` 中作为 smoke 第一关，任何基础设施失败直接终止。

### JAVA-BE-002 Spring 路由覆盖 Next API 合约

**命令：**

```bash
node --test scripts/spring-route-contract.test.mjs
```

**期望：**

- `Spring backend exposes every method from the existing Next API contract` 通过。
- `existing Next.js API backend remains present beside the Spring backend` 通过。

**断言重点：**

- Java 后端新增或重构时，不能缺少原 Next API 的 HTTP method/path。
- 只验证 `/api/spring` 的 Java 入口，不要求前端切换到 Java。

### JAVA-BE-003 Spring 启动脚本正确加载 `.env` 且不破坏 MinIO

**命令：**

```bash
pnpm dev:spring
pnpm smoke:spring-api
```

**期望：**

- smoke 返回 `health.database = true`、`health.redis = true`、`health.minio = true`。
- `.env` 中的 `MINIO_ENDPOINT=localhost` 不应覆盖 Spring 的 `SPRING_MINIO_ENDPOINT=http://localhost:9000`。

**自动化建议：** `scripts/dev-spring.sh` 必须继续保留 `SPRING_MINIO_ENDPOINT` 映射和 `unset MINIO_ENDPOINT`。

## P0 后台认证与权限

### JAVA-BE-010 后台登录成功并写入 Redis 会话

**接口：** `POST /api/spring/admin/auth/login`

**请求：**

```json
{
  "username": "admin",
  "password": "Admin123456"
}
```

**期望：**

- `success = true`
- `data.token` 非空
- `data.user.username = "admin"`
- `data.user.roles` 非空
- `data.user.permissions` 非空

**自动化建议：** 在 `AdminAuthService` 上补 `@SpringBootTest` 或 Testcontainers 集成测试，断言 Redis 中存在后台 session key。

### JAVA-BE-011 后台登录失败返回业务错误

**接口：** `POST /api/spring/admin/auth/login`

**请求：**

```json
{
  "username": "admin",
  "password": "wrong-password"
}
```

**期望：**

- `success = false`
- `error.code` 为认证失败类错误。
- HTTP 状态不能是 500。

### JAVA-BE-012 当前后台用户、角色、权限读取

**接口：** `GET /api/spring/admin/auth/me`

**前置：** 使用 JAVA-BE-010 的 token。

**期望：**

- 返回当前管理员。
- 返回角色列表。
- 返回权限列表。
- 返回可访问数据范围。

### JAVA-BE-013 后台退出登录后 token 失效

**接口：** `POST /api/spring/admin/auth/logout`

**步骤：**

1. 登录拿到 token。
2. 调用 logout。
3. 再调用 `GET /api/spring/admin/auth/me`。

**期望：**

- logout `success = true`。
- logout 后 `auth/me` 返回未授权错误，不允许继续读用户信息。

## P0 管理端订单

### JAVA-BE-020 订单分页列表

**接口：** `GET /api/spring/admin/orders?storeId=<storeId>&page=1&pageSize=20`

**期望：**

- `success = true`
- 列表字段为数组。
- 分页字段包含 `page`、`pageSize`、`total`、`totalPages`。
- 每条订单至少包含订单号、会员、套餐、重量、状态、下单时间。

**已覆盖：** `scripts/spring-api-smoke.mjs` 管理端列表 smoke。

### JAVA-BE-021 创建订单时缺必要参数返回 `INVALID_PARAMS`

**接口：** `POST /api/spring/admin/orders`

**请求：**

```json
{
  "storeId": "<storeId>"
}
```

**期望：**

- `success = false`
- `error.code = "INVALID_PARAMS"`
- 不产生订单数据。

**已覆盖：** `scripts/spring-api-smoke.mjs`。

### JAVA-BE-022 后台创建订单成功并生成包裹

**接口：** `POST /api/spring/admin/orders`

**请求：**

```json
{
  "storeId": "<storeId>",
  "userId": "<memberUserId>",
  "userPackageId": "<activePackageId>",
  "addressId": "<defaultAddressId>",
  "items": [
    { "dishId": "<onSaleDishId>", "weightJin": 0.5 }
  ],
  "internalRemark": "Java backend test order, will void",
  "userVisibleRemark": "java-backend-test"
}
```

**期望：**

- `success = true`
- `data.order.status = "PENDING_SHIPMENT"`
- 订单明细 `items` 包含请求菜品。
- 订单明细 `shipments` 为数组；蔬菜订单至少包含 `蔬菜包裹`。
- 会员套餐使用次数、库存扣减符合业务规则。

**已覆盖：** `scripts/spring-api-smoke.mjs` 创建后立即作废。

### JAVA-BE-023 订单详情包含菜品、权益、多个物流包裹

**接口：** `GET /api/spring/admin/orders/{orderId}?storeId=<storeId>`

**期望：**

- `orderNo` 非空。
- `items` 为数组。
- `benefits` 为数组。
- `shipments` 为数组。
- `user`、`userPackage` 引用完整。

### JAVA-BE-024 订单作废回滚业务状态

**接口：** `POST /api/spring/admin/orders/{orderId}/void`

**请求：**

```json
{
  "storeId": "<storeId>",
  "reason": "java backend test rollback"
}
```

**期望：**

- `data.order.status = "VOIDED"`
- 操作日志记录作废动作。
- 不影响其他订单。

**已覆盖：** `scripts/spring-api-smoke.mjs`。

### JAVA-BE-025 单订单多物流号发货

**接口：** `POST /api/spring/admin/orders/{orderId}/ship`

**请求：**

```json
{
  "storeId": "<storeId>",
  "shipments": [
    {
      "shipmentId": "<vegetableShipmentId>",
      "logisticsNo": "SF-VEG-202606230001",
      "packageName": "蔬菜包裹"
    },
    {
      "shipmentId": "<eggShipmentId>",
      "logisticsNo": "SF-EGG-202606230001",
      "packageName": "鸡蛋包裹"
    }
  ]
}
```

**期望：**

- 每个 shipment 分别回写物流号。
- 订单状态变为待签收或已发货状态。
- 订单顶层物流号可保留首个物流号用于兼容列表展示。

### JAVA-BE-026 批量发货返回成功和失败明细

**接口：** `POST /api/spring/admin/orders/batch-ship`

**请求：**

```json
{
  "storeId": "<storeId>",
  "orders": [
    {
      "orderId": "<orderId>",
      "shipments": [
        { "shipmentId": "<shipmentId>", "logisticsNo": "SF-BATCH-001" }
      ]
    }
  ]
}
```

**期望：**

- `successes` 为数组。
- `failures` 为数组。
- 部分失败不能导致已成功订单回滚为未发货。

### JAVA-BE-027 打印配送标签返回 HTML 并自动调起打印

**接口：** `GET /api/spring/admin/orders/print-labels?storeId=<storeId>&orderIds=<orderId>`

**期望：**

- HTTP `Content-Type` 为 `text/html`。
- HTML 包含订单号、收件人、手机号、地址、菜品/权益内容。
- HTML 包含 `window.print()`。

### JAVA-BE-028 快递100云打印缺配置时明确失败

**接口：** `POST /api/spring/admin/orders/print-labels`

**前置：** `.env` 未配置 `KUAIDI100_PARTNER_ID`、`KUAIDI100_TEMP_ID` 或 `KUAIDI100_SIID`。

**请求：**

```json
{
  "storeId": "<storeId>",
  "orderIds": ["<orderId>"],
  "includePrinted": false
}
```

**期望：**

- `success = false`
- `error.code = "KUAIDI100_CONFIG_MISSING"`
- 错误信息列出缺失配置。
- 不写入 `logisticsNo`。

**已覆盖一部分：** `Kuaidi100ServiceTest.missingConfigReportsRequiredCloudPrintFields`。

### JAVA-BE-029 快递100参数签名符合官方要求

**测试类型：** JUnit 单元测试。

**目标类：** `Kuaidi100Service`

**期望：**

- `param` 包含 `type`、`kuaidicom`、`partnerId`、`tempid`、`siid`、`recMan`、`sendMan`。
- `sign = MD5(param + t + key + secret).toUpperCase()`。
- 同一订单的不同 shipment 可产生不同 `orderId`。

**已覆盖：** `Kuaidi100ServiceTest`。

## P0 小程序登录、首页、预订

### JAVA-BE-040 小程序开发登录签发会员会话

**接口：** `POST /api/spring/v1/auth/dev-login`

**请求：**

```json
{
  "phone": "15295081992",
  "storeCode": "lotus-garden"
}
```

**期望：**

- `success = true`
- `data.token` 非空。
- `data.user.phone = "15295081992"`。
- Redis 中存在小程序 session。

**已覆盖：** `scripts/spring-api-smoke.mjs`。

### JAVA-BE-041 微信手机号登录走真实路由和微信 API 适配

**接口：** `POST /api/spring/v1/auth/wx-phone`

**请求：**

```json
{
  "code": "<wxLoginCode>",
  "phoneCode": "<wxPhoneCode>",
  "storeCode": "lotus-garden",
  "nickname": "测试会员"
}
```

**期望：**

- 成功时绑定或更新会员手机号、openid、昵称。
- 微信接口失败时返回业务错误，不落半成品会员绑定。
- 不能把微信异常吞成 500。

**自动化建议：** 用本地 HTTP stub 模拟 `jscode2session` 和 `getuserphonenumber`。

### JAVA-BE-042 首页返回套餐、权益、地址、今日订单和可选菜品

**接口：** `GET /api/spring/v1/home?storeCode=lotus-garden`

**期望：**

- `store.id` 非空。
- `member.id` 非空。
- `package` 展示蔬菜总次数、已用次数、剩余次数。
- 鸡蛋等附加权益即使剩余为 0，也应在套餐卡数据中可表达；但剩余为 0 时不应出现在可选菜品列表中。
- `dishes` 只展示今日任务内且当前上架的菜品；如果今日已提交下架菜品，应在当前订单里保留并提示。
- `defaultAddress` 可为空，前端据此阻止下单。

**已覆盖基础形状：** `scripts/spring-api-smoke.mjs`。

### JAVA-BE-043 提交预订成功，一天只允许一个有效订单

**接口：** `POST /api/spring/v1/reservations`

**请求：**

```json
{
  "storeCode": "lotus-garden",
  "addressId": "<defaultAddressId>",
  "items": [
    { "dishId": "<onSaleDishId>", "weightJin": 0.5 }
  ],
  "benefitSelections": [
    { "benefitId": "<eggBenefitId>", "quantity": 1 }
  ]
}
```

**期望：**

- 首次提交成功生成今日订单。
- 再次 `POST /reservations` 返回一天一单业务错误。
- 第二次修改应走 `PUT /api/spring/v1/orders/{orderId}`。
- 库存、套餐次数、附加权益扣减一致。

### JAVA-BE-044 修改今日预订不重复扣套餐次数

**接口：** `PUT /api/spring/v1/orders/{orderId}`

**请求：**

```json
{
  "storeCode": "lotus-garden",
  "addressId": "<defaultAddressId>",
  "items": [
    { "dishId": "<onSaleDishId>", "weightJin": 1.0 }
  ],
  "benefitSelections": []
}
```

**期望：**

- 修改成功。
- 原订单菜品明细被覆盖为新选择。
- 套餐已用次数不因修改重复增加。
- 截单后返回不可修改错误。
- 下架或库存不足的新增菜品不能提交成功。

### JAVA-BE-045 无套餐或冻结套餐禁止提交预订

**接口：** `POST /api/spring/v1/reservations`

**场景：**

- 会员没有有效套餐。
- 会员套餐被冻结。
- 会员套餐次数已用完。

**期望：**

- 均返回业务错误。
- 不创建订单。
- 不扣库存。

## P0 菜品、任务、库存

### JAVA-BE-060 菜品分页、筛选和上下架状态

**接口：** `GET /api/spring/admin/dishes?storeId=<storeId>&keyword=&category=&status=&page=1&pageSize=20`

**期望：**

- 返回分页。
- 支持关键字、分类、状态筛选。
- 每条菜品包含名称、图片、分类、库存、步进、状态。

### JAVA-BE-061 图片上传到 MinIO 并能公开读取

**接口：** `POST /api/spring/admin/uploads/dish-images`

**请求：** `multipart/form-data`，字段 `file`，使用 png/jpg/webp。

**期望：**

- `success = true`
- `data.image.key` 非空。
- `data.image.url` 非空。
- `data.image.mimeType` 以 `image/` 开头。
- 访问 `image.url` 返回 HTTP 200。

**已覆盖：** `scripts/spring-api-smoke.mjs` 上传 1x1 PNG 并读取公开 URL。

### JAVA-BE-062 编辑菜品不能直接修改库存

**接口：** `PUT /api/spring/admin/dishes/{dishId}`

**请求：** 修改名称、分类、图片、上下架、步进，不传库存字段。

**期望：**

- 菜品基础信息更新成功。
- 库存字段保持不变。
- 如请求体包含库存字段，应被忽略或返回业务错误，不能绕过库存调整接口。

### JAVA-BE-063 库存调整只能通过专用接口并记录原因

**接口：** `POST /api/spring/admin/dishes/{dishId}/inventory`

**请求：**

```json
{
  "storeId": "<storeId>",
  "deltaJin": 10,
  "reason": "今日补货"
}
```

**期望：**

- 库存增加 10 斤。
- `reason` 不能为空。
- 调整后库存不能为负。
- 操作日志记录调整前、调整后、原因。

### JAVA-BE-064 任务生效后不可修改

**接口：** `PUT /api/spring/admin/tasks/{taskId}`

**场景：**

- 创建明日任务后可修改。
- 任务进入当天生效状态后再次修改。

**期望：**

- 未生效任务可修改菜品和配送日期。
- 已生效任务返回业务错误，不能改菜品、日期或状态。

### JAVA-BE-065 首页菜品由今日任务和实时上下架共同决定

**步骤：**

1. 今日任务包含菠菜、番茄。
2. 将番茄下架。
3. 调用 `GET /api/spring/v1/home`。

**期望：**

- 番茄不在 `dishes` 可选列表中。
- 如果用户今日订单已包含番茄，`currentOrder.items` 仍展示番茄并带状态提示。
- 新提交或修改时不能新增下架番茄。

## P1 会员、地址、套餐

### JAVA-BE-080 会员分页筛选

**接口：** `GET /api/spring/admin/members?storeId=<storeId>&keyword=&status=&page=1&pageSize=20`

**期望：**

- 支持手机号、昵称、备注关键字。
- 支持状态筛选。
- 返回分页。
- 每条会员包含手机号、默认地址、有效套餐数量、订单数量、状态。

### JAVA-BE-081 会员编辑包含省市区和详细地址

**接口：** `PUT /api/spring/admin/members/{userId}`

**请求：**

```json
{
  "storeId": "<storeId>",
  "nickname": "导入张三",
  "phone": "15295081992",
  "address": {
    "receiverName": "徐竹西",
    "receiverPhone": "15295081992",
    "province": "江苏省",
    "city": "南京市",
    "district": "六合区",
    "detail": "龙池街道冠城大通"
  },
  "status": "ACTIVE",
  "remark": "8斤周套餐"
}
```

**期望：**

- 会员基础信息更新。
- 默认地址省市区和详细地址完整保存。
- 不把套餐 ID 当作展示名称返回。

### JAVA-BE-082 会员 Excel/CSV 文件导入

**接口：** `POST /api/spring/admin/members/import`

**请求：** `multipart/form-data`，字段 `file`，支持 `.xlsx`、`.xls`、`.csv`。

**期望：**

- 有效行创建或更新会员。
- 失败行返回行号、原因。
- 不支持的文件格式返回业务错误。
- 同一手机号重复导入不生成重复会员。

### JAVA-BE-083 用户套餐增删改查

**接口：**

- `GET /api/spring/admin/user-packages`
- `POST /api/spring/admin/user-packages`
- `GET /api/spring/admin/user-packages/{packageId}`
- `PUT /api/spring/admin/user-packages/{packageId}`
- `DELETE /api/spring/admin/user-packages/{packageId}`

**期望：**

- 套餐按添加时间先进先扣。
- 不再要求有效期字段。
- 支持总次数、已用次数、单次斤数、附加权益。
- 删除已有订单关联套餐时必须拒绝或软删除，不能破坏历史订单。

### JAVA-BE-084 用户套餐附加权益扣减

**场景：** 套餐配置 `8次8斤蔬菜 + 1箱鸡蛋`。

**期望：**

- 鸡蛋不占蔬菜斤数。
- 鸡蛋是总权益，不是每次都可选。
- 第一次选 1 箱鸡蛋后，权益剩余为 0。
- 下一次首页套餐卡仍展示鸡蛋剩余 0，但可选列表不展示鸡蛋。
- 后续可扩展到老母鸡等其他权益，不写死 `EGG` 逻辑。

### JAVA-BE-085 用户套餐导入

**接口：** `POST /api/spring/admin/user-packages/import`

**请求：** `multipart/form-data`，字段 `file`，支持 `.xlsx`、`.xls`、`.csv`。

**期望：**

- 通过手机号绑定会员。
- 通过套餐模板名称或编码绑定套餐模板。
- 成功行创建套餐。
- 失败行返回具体错误。
- 不复制粘贴文本导入。

### JAVA-BE-086 地址 CRUD 和默认地址

**接口：**

- `GET /api/spring/v1/addresses`
- `POST /api/spring/v1/addresses`
- `PUT /api/spring/v1/addresses/{addressId}`
- `POST /api/spring/v1/addresses/{addressId}/default`
- `DELETE /api/spring/v1/addresses/{addressId}`

**期望：**

- 地址包含省、市、区、详细地址。
- 默认地址不可直接关闭，只能把其他地址设为默认。
- 最多地址数量受限制。
- 删除默认地址时要重新选择默认或返回明确错误。

### JAVA-BE-087 配送范围只限制省、市

**接口：** `PUT /api/spring/admin/system-settings`

**请求：**

```json
{
  "storeId": "<storeId>",
  "deliveryProvinces": ["江苏省"],
  "deliveryCities": ["南京市"],
  "cutoffTime": "18:00"
}
```

**期望：**

- 江苏省南京市地址可提交预订。
- 非配置省或非配置市地址提交预订失败。
- 区县不参与限制。

## P1 系统管理、角色、日志

### JAVA-BE-100 后台用户 CRUD 和密码重置

**接口：**

- `GET /api/spring/admin/admin-users`
- `POST /api/spring/admin/admin-users`
- `PUT /api/spring/admin/admin-users/{adminUserId}`
- `POST /api/spring/admin/admin-users/{adminUserId}/password`

**期望：**

- 支持分页、关键字、状态筛选。
- 新增用户可分配角色。
- 停用用户不能登录。
- 重置密码后旧密码失效。

### JAVA-BE-101 角色和权限配置

**接口：**

- `GET /api/spring/admin/roles`
- `GET /api/spring/admin/roles/permissions`
- `POST /api/spring/admin/roles`
- `PUT /api/spring/admin/roles/{roleId}`

**期望：**

- 权限树非空。
- 新角色可绑定权限。
- 低权限用户访问订单、会员、菜品、套餐、任务管理接口时返回 403 类错误。

### JAVA-BE-102 操作日志包含请求参数、返回参数和响应时长

**接口：** `GET /api/spring/admin/operation-logs?page=1&pageSize=20`

**期望：**

- 支持分页和筛选。
- 时间格式为 `yyyy-MM-dd HH:mm:ss`。
- 包含操作者、动作、模块、请求参数、返回参数、响应时长、IP、User-Agent。
- 小程序登录、新增/修改地址、提交/修改预订也应进入日志。

## P1 小程序订单、套餐购买、账号

### JAVA-BE-120 小程序订单列表和详情

**接口：**

- `GET /api/spring/v1/orders?storeCode=lotus-garden`
- `GET /api/spring/v1/orders/{orderId}?storeCode=lotus-garden`

**期望：**

- 只返回当前会员订单。
- 已隐藏订单不再返回。
- 详情包含菜品、附加权益、多个物流包裹。

### JAVA-BE-121 小程序取消订单

**接口：** `POST /api/spring/v1/orders/{orderId}/cancel`

**请求：**

```json
{
  "storeCode": "lotus-garden",
  "reason": "用户取消"
}
```

**期望：**

- 截单前可取消。
- 截单后不可取消。
- 取消后库存、套餐次数、附加权益回滚。

### JAVA-BE-122 小程序隐藏订单

**接口：** `DELETE /api/spring/v1/orders/{orderId}/user-visible?storeCode=lotus-garden`

**期望：**

- 仅影响当前会员可见性。
- 后台管理仍可查到订单。

### JAVA-BE-123 套餐购买预留微信支付

**接口：**

- `POST /api/spring/v1/package-purchases`
- `POST /api/spring/v1/package-purchases/{purchaseId}/wechat-prepay`

**期望：**

- 创建购买单成功。
- 当前微信支付未开通时，预支付接口返回明确的预留/未启用状态。
- 不产生真实扣款。

### JAVA-BE-124 账号昵称修改和退出/注销

**接口：**

- `PATCH /api/spring/v1/account`
- `DELETE /api/spring/v1/account`

**期望：**

- 昵称可修改并在 `GET /api/spring/v1/me` 返回。
- 注销账号需要校验原因或确认参数。
- 注销后 session 失效，会员不可继续下单。

## P2 导出、报表与统计

### JAVA-BE-140 订单 CSV 导出

**接口：** `GET /api/spring/admin/orders/export?storeId=<storeId>&date=<yyyy-MM-dd>`

**期望：**

- `Content-Type` 为 CSV。
- 包含订单号、会员、手机号、地址、套餐、菜品、重量、状态、物流号。
- 中文不乱码。
- 筛选条件和列表一致。

### JAVA-BE-141 发货统计

**接口：** `GET /api/spring/admin/stats/shipment?storeId=<storeId>`

**期望：**

- 返回待发货订单数。
- 返回菜品汇总重量。
- 返回地址维度汇总。
- 与当天订单列表聚合结果一致。

## 建议新增的 Java 自动化测试文件

| 文件 | 测试重点 |
| --- | --- |
| `apps/spring-api/src/test/java/cn/hentor/vegetables/service/AdminAuthServiceIntegrationTest.java` | Redis session、登录失败、logout 后 token 失效 |
| `apps/spring-api/src/test/java/cn/hentor/vegetables/service/MiniReservationServiceIntegrationTest.java` | 一天一单、修改不重复扣次数、库存/上下架/截单校验、权益扣减 |
| `apps/spring-api/src/test/java/cn/hentor/vegetables/service/OrderQueryServiceIntegrationTest.java` | 多包裹、发货/作废/签收、打印标签 HTML |
| `apps/spring-api/src/test/java/cn/hentor/vegetables/service/DishImageStorageServiceIntegrationTest.java` | MinIO 上传、格式/大小限制、公开 URL |
| `apps/spring-api/src/test/java/cn/hentor/vegetables/service/MemberImportServiceTest.java` | xlsx/xls/csv 导入、重复手机号、失败行 |
| `apps/spring-api/src/test/java/cn/hentor/vegetables/service/OperationLogServiceIntegrationTest.java` | 请求/响应/耗时/IP/User-Agent、后台和小程序动作入库 |

## 当前覆盖与缺口

已覆盖并可直接执行：

- `pnpm build:spring` 覆盖快递100参数与签名。
- `pnpm smoke:spring-api` 覆盖真实 PG/Redis/MinIO、后台登录、管理列表、图片上传、订单创建/作废、小程序登录/首页/地址/订单/我的。
- `node --test scripts/spring-route-contract.test.mjs` 覆盖路由契约和目标技术栈使用证明。

优先补齐：

1. `MiniReservationServiceIntegrationTest`：这是业务核心，必须先覆盖套餐次数、库存、上下架、截单、一天一单和权益扣减。
2. `OrderQueryServiceIntegrationTest`：覆盖多物流号、打印标签、快递100缺配置、发货状态流转。
3. `OperationLogServiceIntegrationTest`：确认后台和小程序动作都记录请求/响应/耗时。
4. `MemberImportServiceTest`：确认会员和会员套餐文件上传导入不是 UI 假功能。

