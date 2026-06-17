# Hentor Fresh Vegetables Order

蔬菜套餐预订系统，包含管理后台和微信小程序：

- 管理后台：Next.js + React + Tailwind + shadcn 风格组件
- 小程序：Taro + NutUI 依赖栈
- 数据库：PostgreSQL
- 对象存储：MinIO

## 本地启动

1. 安装依赖：

```bash
pnpm install
```

2. 复制环境变量：

```bash
cp .env.example .env
```

3. 启动 PostgreSQL 和 MinIO，并初始化数据库：

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

微信开发者工具打开 `apps/miniapp`，AppID 使用 `wx165126960d67638f`。

## Docker 服务

`docker-compose.yml` 会启动：

- PostgreSQL：`localhost:5432`
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

小程序当前门店由 `TARO_APP_STORE_CODE` 控制。开发环境默认是 `lotus-garden`，如需为加盟店单独构建，可在 Taro 配置里切换门店编码。

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
