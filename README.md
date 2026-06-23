# Hentor Fresh Vegetables Order

蔬菜套餐预订系统，包含管理后台和微信小程序：

- 管理后台：Next.js + React + Tailwind + shadcn 风格组件
- 小程序：Taro + NutUI 依赖栈
- 数据库：PostgreSQL
- 缓存：Redis
- 对象存储：MinIO
- 并行后端：Spring Boot + JDK 21 + MyBatis-Plus + MyBatis-Plus-Join

## 本地启动

1. 安装依赖：

```bash
pnpm install
```

2. 复制环境变量：

```bash
cp .env.example .env
```

3. 启动 PostgreSQL、Redis 和 MinIO，并初始化数据库：

```bash
pnpm setup:dev
```

4. 启动管理后台：

```bash
pnpm dev:admin
```

后台默认账号：

- 用户名：`admin`
- 密码：`Admin123456`

5. 启动小程序构建：

```bash
pnpm dev:mini
```

微信开发者工具打开 `apps/miniapp`，AppID 使用 `wx165126960d67638f`。`project.config.json`
已经把 `miniprogramRoot` 指向 `dist`，不要直接打开 `apps/miniapp/dist`。

本地联调时请保持 `pnpm dev:mini` 运行，或在打开开发者工具前执行一次：

```bash
pnpm --filter @hentor/miniapp build:dev
```

开发构建会把小程序 API 指向 `http://127.0.0.1:3000`。如果页面像没有样式，先确认
`apps/miniapp/dist/pages/login/index.wxss` 存在并且微信开发者工具点一次“编译/重新编译”，必要时清理缓存后重新导入 `apps/miniapp`。

## Spring Boot 并行后端

Next.js 后端继续保留在 `apps/admin-web/app/api`，Spring Boot 后端作为并行实现放在
`apps/spring-api`。当前 Spring 服务使用 JDK 21、MyBatis-Plus、MyBatis-Plus-Join、
PostgreSQL、Redis 和 MinIO，默认端口 `8080`。

启动基础设施：

```bash
pnpm docker:up
```

编译验证：

```bash
pnpm build:spring
```

启动 Spring 服务：

```bash
pnpm dev:spring
```

已接入的首批接口：

- `GET http://127.0.0.1:8080/api/spring/health`：检查 PostgreSQL、Redis、MinIO
- `GET http://127.0.0.1:8080/api/spring/stores/current?code=lotus-garden`：读取当前门店
- `GET http://127.0.0.1:8080/api/spring/admin/dishes?storeId=...`：读取菜品列表
- `GET http://127.0.0.1:8080/api/spring/admin/orders?storeId=...&page=1&pageSize=20`：订单分页列表
- `GET http://127.0.0.1:8080/api/spring/admin/members?storeId=...&page=1&pageSize=20`：会员分页列表
- `GET http://127.0.0.1:8080/api/spring/admin/user-packages?storeId=...&page=1&pageSize=20`：用户套餐分页列表
- `GET http://127.0.0.1:8080/api/spring/admin/package-templates?storeId=...&page=1&pageSize=20`：套餐模板分页列表，包含附加权益
- `POST http://127.0.0.1:8080/api/spring/admin/auth/login`：后台登录，Redis 保存后台会话
- `GET http://127.0.0.1:8080/api/spring/admin/auth/me`：读取后台当前登录用户、角色、权限和可访问门店
- `POST http://127.0.0.1:8080/api/spring/v1/auth/dev-login`：小程序本地开发登录，按已导入会员手机号签发 Redis 会话
- `GET http://127.0.0.1:8080/api/spring/v1/home?storeCode=lotus-garden`：小程序首页数据，包含套餐、附加权益、默认地址、任务菜品和今日可编辑订单
- `GET http://127.0.0.1:8080/api/spring/v1/addresses?storeCode=lotus-garden`：小程序地址列表
- `POST http://127.0.0.1:8080/api/spring/v1/addresses`：小程序新增地址，包含基础校验、最多 10 条和默认地址处理
- `POST http://127.0.0.1:8080/api/spring/v1/reservations`：小程序提交预订，校验会员、套餐、配送范围、今日任务、上下架、库存、重量额度和一天一单
- `PUT http://127.0.0.1:8080/api/spring/v1/orders/{orderId}`：小程序修改今日预订，保留套餐次数，仅重算菜品、库存、附加权益和多包裹记录

Spring 专用环境变量使用 `SPRING_` 前缀，避免和 Next.js 当前 `.env` 中的 MinIO 变量格式冲突：

```bash
SPRING_API_PORT="8080"
SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/hentor_vegetables"
SPRING_DATASOURCE_USERNAME="hentor"
SPRING_DATASOURCE_PASSWORD="hentor_dev_password"
REDIS_HOST="localhost"
REDIS_PORT="6379"
SPRING_MINIO_ENDPOINT="http://localhost:9000"
SPRING_MINIO_PUBLIC_URL="http://localhost:9000"
SPRING_MINIO_ACCESS_KEY="hentor_minio"
SPRING_MINIO_SECRET_KEY="hentor_minio_password"
SPRING_MINIO_BUCKET="hentor-assets"
```

## 验证与真实数据 Smoke

常规验证：

```bash
pnpm test
pnpm lint
pnpm build
pnpm smoke:miniapp-artifacts
```

真实数据 smoke 会使用本地 Docker PostgreSQL、Redis、MinIO、seed 数据和正在运行的管理后台 API。当前覆盖后台登录、退出登录清 cookie、门店/加盟商/角色/会员/用户套餐/套餐模板/菜品/任务/日志列表、加盟商与加盟门店新增/详情/编辑/清理、套餐模板新增/详情/编辑停用/清理、已绑定套餐模板禁止修改总次数和单次重量保护、菜品图片上传到 MinIO 并读取公开 URL、菜品新增/详情/编辑下架/清理、任务新增/详情/编辑/复制/清理、后台用户新增/详情/重置密码/登录验证/编辑/清理、低权限后台账号对订单/会员/菜品/菜品图片上传/套餐模板/任务接口的权限拦截、会员详情/禁用/禁用列表/启用恢复/备注、用户套餐详情/次数重量日期调整/操作日志/冻结/冻结后小程序下单拦截/解冻、系统设置读取/编辑/恢复/操作日志、后台临时订单创建、备注、导出、打印标签、作废、发货、签收、批量发货和临时数据清理；也覆盖小程序首页、微信手机号登录（本地微信 stub、真实登录路由、token、DB 会员绑定与清理）、我的、门店、地址新增/编辑/设默认/删除、套餐购买与微信支付预留、账号注销/业务锁定/恢复、无套餐首页浏览/强制下单拦截/无订单落库、订单列表、提交预订、修改预订、取消预订、已取消订单删除隐藏和数据库状态复查：

```bash
pnpm db:seed
pnpm build
pnpm dev:admin
pnpm smoke:real
```

默认访问 `http://127.0.0.1:3000` 和门店 `lotus-garden`。如需切换：

```bash
SMOKE_BASE_URL=http://127.0.0.1:3001 SMOKE_STORE_CODE=lotus-garden pnpm smoke:real
```

微信手机号登录 smoke 会额外启动一个随机端口的 `next start`，并把本地微信 stub URL 注入
`WECHAT_API_BASE_URL`，所以需要先跑过 `pnpm build`，确保生产构建包含最新后端代码。

`pnpm smoke:miniapp-artifacts` 用于确认微信开发者工具应该打开 `apps/miniapp`，并检查 `dist`
里的首页、我的、地址、订单、套餐、登录页都生成了 `js / wxml / wxss`，避免出现页面无样式但构建未被发现的情况。

## Docker 服务

`docker-compose.yml` 会启动：

- PostgreSQL：`localhost:5432`
- Redis：`localhost:6379`
- MinIO API：`http://localhost:9000`
- MinIO Console：`http://localhost:9001`

MinIO 默认账号：

- 用户名：`hentor_minio`
- 密码：`hentor_minio_password`

## 微信真实登录

小程序登录接口走真实微信链路：

- `Taro.login()` 获取 `loginCode`
- `openType="getPhoneNumber"` 获取 `phoneCode`
- 后端调用微信 `jscode2session` 和手机号接口

启用真实登录前，需要在 `.env` 配置：

```bash
WECHAT_APP_ID="wx165126960d67638f"
WECHAT_APP_SECRET="你的微信小程序 AppSecret"
```

生产环境不需要配置 `WECHAT_API_BASE_URL`，默认请求微信官方 `https://api.weixin.qq.com`。
自动化 smoke 或本地联调如果需要模拟微信返回，可以临时设置 `WECHAT_API_BASE_URL`
指向本地 stub 服务，接口参数和错误处理仍走同一套后端登录代码。

小程序当前门店由 `TARO_APP_STORE_CODE` 控制。开发环境默认是 `lotus-garden`，如需为加盟店单独构建，可在 Taro 配置里切换门店编码。

小程序首页菜品网格由 `TARO_APP_HOME_DISH_COLUMNS` 控制，每行支持 `2`、`3`、`4`
个菜品，默认 `3` 个；空值或非法值会自动回退到默认三列。

## 多门店加盟模型

系统按加盟业务组织数据：

- `Franchisee`：加盟商，记录联系人、状态、合同到期时间
- `Store`：门店，分直营和加盟，加盟门店归属一个加盟商
- `MemberStoreBinding`：会员与门店绑定，会员数据按门店隔离
- 后台账号通过 `AdminUserStore` 控制可管理门店范围

小程序门店可用性规则：

- 直营门店：门店启用即可访问
- 加盟门店：门店启用、加盟商启用、加盟商合同未过期、门店加盟合同未过期

套餐支持冻结和解冻。冻结后小程序不能提交预订，后台可记录冻结原因并保留操作日志。
