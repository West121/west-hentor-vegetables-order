# 蔬菜预订系统设计说明

日期：2026-06-17

## 目标

开发一套社区蔬菜预订系统，覆盖小程序用户下单、后台运营管理、套餐和库存闭环。现有 PRD 是业务规则依据，3 个 HTML 文件作为交互和信息结构参考，但正式系统需要重新设计视觉和前端结构。

第一版目标是做出可运行、可继续扩展的 MVP：

- PC 管理后台：订单、会员用户、套餐、用户套餐、菜品、任务、发货统计、管理员账号与权限。
- 小程序端：微信登录、首页选菜、地址管理、订单列表、我的套餐。
- 后端 API：统一服务小程序和后台，保证套餐次数、库存、订单状态的事务一致性。
- 数据库：PostgreSQL + Prisma，优先保证表结构清晰、事务可靠、审计可追踪。

## 后端选型

推荐第一版使用 Next.js 全栈后端，而不是先拆 Spring Boot 或 Go 服务。

### 方案对比

方案 A：Next.js 全栈 + Prisma + PostgreSQL

- 优点：后台页面、API、权限、类型、表结构在一个工程内闭环，适合快速交付 MVP。
- 优点：和 Web 管理端技术栈一致，减少服务拆分、联调和部署复杂度。
- 风险：长期复杂履约、定时任务、外部系统集成变多时，需要拆服务或引入任务队列。
- 结论：推荐。

方案 B：Spring Boot + Next.js 管理端 + Taro 小程序

- 优点：后端分层、事务、权限和企业项目治理成熟。
- 风险：第一版开发量更大，前后端契约和部署复杂度更高。
- 适合：业务已经确定长期多人维护、接口量和后台流程会快速膨胀。

方案 C：Go + Next.js 管理端 + Taro 小程序

- 优点：部署简单，性能好。
- 风险：后台业务 CRUD、权限、数据校验和事务代码会更偏手写，初期效率不如 Next.js 或 Spring Boot。
- 适合：对性能、部署体积、长期服务稳定性有明确优先级。

## 总体架构

采用 monorepo：

- `apps/admin-web`：Next.js 管理后台，React + shadcn/ui + Tailwind。
- `apps/admin-web/app/api`：第一版与后台共用 Next.js runtime，暴露小程序和后台 API。
- `apps/miniapp`：Taro + React + NutUI 微信小程序。
- `packages/db`：Prisma schema、迁移、seed 数据。
- `packages/shared`：枚举、Zod schema、类型、业务常量。
- `packages/ui`：如果后台组件沉淀明显，再抽共享 UI；第一版不强行抽象。

后台与小程序通过统一 API 通信，不让小程序直接接触数据库。

## 用户体系设计

会员用户和后台管理员不融合。

原因：

- 会员用户是业务对象，来自微信小程序，身份字段是 `openid`、手机号、昵称、地址、套餐和订单。
- 后台管理员是操作身份，负责登录后台、变更订单、调整库存、配置套餐、管理权限。
- 两者审计和权限边界不同。把它们混在 `users` 表中会让登录方式、状态、权限、数据隔离变复杂。

### 会员用户管理

后台新增“会员用户”模块，管理 `users` 业务用户：

- 按手机号、昵称、openid、状态搜索。
- 查看用户基础资料、套餐、地址、订单历史。
- 禁用或启用用户；禁用后小程序可登录但业务操作被锁定并展示原因。
- 给用户绑定套餐、冻结或解冻用户套餐。
- 查看用户套餐消耗记录和操作日志。

会员用户表仍使用 PRD 中的 `users`，必要扩展：

- `disabled_reason`：禁用原因。
- `remark`：后台备注。

### 管理员账号与权限

后台新增“账号与权限”模块，管理后台登录身份：

- 管理员账号新增、编辑、禁用、重置密码。
- 角色配置：超级管理员、运营管理员。
- 权限控制：菜单可见、操作按钮可用、数据范围。
- 操作日志：记录管理员对订单、库存、套餐、任务、用户状态的关键变更。

新增表：

- `admin_users`：后台账号。
- `admin_roles`：后台角色。
- `admin_user_roles`：账号角色关系。
- `admin_permissions`：权限点。
- `admin_role_permissions`：角色权限关系。
- `admin_operation_logs`：后台操作日志。

第一版权限可以先实现角色级权限，不做复杂自定义策略。数据范围先预留 `scope_type` 和 `scope_value`，用于后续按小区或站点隔离。

## PC 管理后台信息架构

后台第一版使用左侧导航 + 顶部工具栏 + 内容区。视觉上不照搬演示 HTML 的大圆角和 emoji 风格，改成清爽、稳定、适合高频操作的运营后台。

模块：

1. 工作台
   - 今日待发货、今日订单、总重量、库存预警、截单状态。
   - 快捷入口：批量发货、添加菜品、绑定套餐。

2. 订单管理
   - 筛选：订单号、手机号、下单时间、状态、菜品。
   - 表格：订单号、会员、套餐、重量、状态、地址快照、物流、下单时间。
   - 操作：查看详情、发货、修改物流、作废待发货订单、导出。
   - 状态流转：待发货 -> 已发货 -> 已签收；待发货 -> 已取消。

3. 会员用户
   - 搜索会员，查看资料、地址、套餐、订单。
   - 禁用、启用、编辑备注。
   - 绑定套餐入口。

4. 套餐模板
   - 新增、编辑、停用、排序。
   - 已绑定模板禁止修改总次数和单次重量上限。

5. 用户套餐
   - 给用户绑定套餐。
   - 修改已用次数、到期日、下次发货日。
   - 冻结、解冻。
   - 记录操作日志。

6. 菜品管理
   - 新增、编辑、上架、下架、库存调整、图片上传。
   - 库存为 0 自动下架。
   - 分类决定加减步长：叶菜 0.5 斤，茄果 1.0 斤。

7. 任务管理
   - 创建限时活动任务，配置生效时间、截单时间、活动标签、关联菜品。
   - 启停任务，复制任务。

8. 发货统计
   - 按日期、状态、菜品分类、小区地址筛选。
   - 汇总订单数、总重量、菜品明细。
   - 支持复制和导出。

9. 账号与权限
   - 管理员账号、角色、权限、操作日志。

10. 系统设置
   - 每日截单时间、客服电话、关于我们、隐私协议链接等基础配置。

## 小程序信息架构

小程序使用 Taro + NutUI。第一版保留底部 Tab，但结构比参考 HTML 更完整：

1. 首页/预订
   - 套餐选择卡片：展示有效套餐、剩余次数、单次重量上限、冻结状态。
   - 截单提示：未截单显示剩余时间，已截单隐藏提交按钮。
   - 菜品分区：叶菜、茄果、限时活动。
   - 重量进度：已选重量、剩余重量、超重拦截。
   - 地址卡片：默认地址回填，无地址引导新增。
   - 提交前确认：展示菜品、重量、套餐、地址。

2. 订单
   - 标签：待发货、已发货、已签收、已取消、全部。
   - 待发货可取消，取消需选择原因。
   - 已发货可复制运单号。
   - 已取消可前端删除隐藏。

3. 地址
   - 新增、编辑、删除、设为默认。
   - 单用户最多 10 条。
   - 手机号、省市区、详细地址校验。

4. 我的
   - 微信头像、昵称、手机号。
   - 我的套餐和套餐消耗记录。
   - 客服、协议、账号注销入口。
   - 账号禁用时展示禁用原因并锁定业务操作。

## 数据模型调整

沿用 PRD 核心表：

- `users`
- `package_templates`
- `user_packages`
- `addresses`
- `dishes`
- `orders`
- `order_items`
- `tasks`
- `task_dishes`
- `system_configs`

新增后台管理表：

- `admin_users`
- `admin_roles`
- `admin_user_roles`
- `admin_permissions`
- `admin_role_permissions`
- `admin_operation_logs`

建议补充字段：

- `orders.cancel_reason`
- `orders.user_visible_remark`
- `orders.internal_remark`
- `orders.deleted_by_user_at`，用于小程序已取消订单前端隐藏。
- `dishes.deleted_at`，有订单明细的菜品软删除。
- `user_packages.frozen_reason`
- `inventory_logs`，记录菜品库存变动。
- `package_operation_logs`，记录用户套餐调整。

第一版可以将 `inventory_logs` 和 `package_operation_logs` 合并进 `admin_operation_logs`，但表结构要能区分资源类型和变更前后值。

## API 设计

小程序 API：

- `POST /api/v1/auth/wx-login`
- `GET /api/v1/home`
- `POST /api/v1/orders`
- `GET /api/v1/orders`
- `POST /api/v1/orders/:id/cancel`
- `DELETE /api/v1/orders/:id/user-visible`
- `GET /api/v1/addresses`
- `POST /api/v1/addresses`
- `PUT /api/v1/addresses/:id`
- `DELETE /api/v1/addresses/:id`
- `POST /api/v1/addresses/:id/default`
- `GET /api/v1/me`
- `GET /api/v1/me/packages`

后台 API：

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PUT /api/admin/orders/:id/logistics`
- `POST /api/admin/orders/:id/void`
- `GET /api/admin/members`
- `GET /api/admin/members/:id`
- `PUT /api/admin/members/:id/status`
- `GET /api/admin/package-templates`
- `POST /api/admin/package-templates`
- `PUT /api/admin/package-templates/:id`
- `GET /api/admin/user-packages`
- `POST /api/admin/user-packages`
- `PUT /api/admin/user-packages/:id`
- `GET /api/admin/dishes`
- `POST /api/admin/dishes`
- `PUT /api/admin/dishes/:id`
- `POST /api/admin/dishes/:id/inventory`
- `GET /api/admin/tasks`
- `POST /api/admin/tasks`
- `PUT /api/admin/tasks/:id`
- `GET /api/admin/stats/shipment`
- `GET /api/admin/admin-users`
- `POST /api/admin/admin-users`
- `PUT /api/admin/admin-users/:id`
- `GET /api/admin/roles`
- `GET /api/admin/operation-logs`

所有写接口使用 Zod 校验。后台接口统一检查管理员登录态和权限点。

## 核心业务规则

下单事务：

1. 检查用户状态、截单时间、地址归属。
2. 锁定用户套餐，确认有效、未冻结、未用完、未过期。
3. 锁定菜品库存，确认上架且库存足够。
4. 校验选择步长和总重量不超过套餐上限。
5. 扣减库存，库存为 0 自动下架。
6. 用户套餐已用次数 + 1，更新最近发货日和下次发货日。
7. 创建订单和订单明细，保存地址、菜品名称、单位重量快照。

取消事务：

1. 仅待发货订单可取消。
2. 订单状态改为已取消，记录取消时间和原因。
3. 用户套餐已用次数 - 1。
4. 菜品库存返还。
5. 库存恢复后不自动上架，由运营手动处理。

后台发货：

1. 运营填写运单号后订单变为已发货。
2. 自动写入发货时间。
3. 超级管理员可修正状态，所有修正写操作日志。

## 视觉与交互方向

PC 后台：

- 风格：干净、克制、运营效率优先。
- 颜色：以绿色作为品牌强调色，背景和表格使用中性灰白，不使用大面积绿色渐变。
- 组件：shadcn/ui 的 Table、Dialog、Sheet、Tabs、Form、Select、Badge、Toast。
- 信息密度：列表页优先表格和筛选器，详情页用分区面板。
- 图标：使用 lucide-react，不使用 emoji 作为正式图标。

小程序：

- 风格：轻量、亲切、清晰。
- 首页核心是“套餐剩余 + 重量进度 + 菜品选择 + 地址 + 提交”。
- 菜品卡片要展示图片、名称、库存状态、步长和已选重量。
- 交互尽量减少跳转，提交前使用确认弹层。

## 错误处理

- 表单错误在字段附近显示。
- 业务错误用 toast 或 dialog，但库存不足、套餐不足、已截单需要明确原因。
- 后台批量操作返回成功数、失败数和失败原因。
- API 返回统一结构：`success`、`data`、`error.code`、`error.message`。

## 测试策略

单元测试：

- 重量计算、步长校验、订单状态流转、权限判断。

集成测试：

- 下单扣库存和套餐次数。
- 取消订单返还库存和套餐次数。
- 库存为 0 自动下架。
- 管理员权限拦截。

前端验证：

- 管理后台主要表单和列表操作。
- 小程序首页选择重量、超限拦截、无地址引导、截单状态。

## 第一版实施顺序

1. 创建 monorepo、Next.js 后台、Taro 小程序、Prisma 基础包。
2. 建立数据库 schema、迁移和 seed 数据。
3. 实现后台登录、管理员账号、角色和权限基础。
4. 实现订单、菜品、套餐、会员用户核心 API。
5. 实现 PC 后台核心页面。
6. 实现小程序预订链路和我的页面。
7. 补充统计、导出、操作日志和关键测试。

## 明确不做进第一版的内容

- 套餐赠送或分享管理。
- 复杂售后流程。
- 物流公司接口直连。
- 多仓、多小区复杂数据权限。
- 自动签收定时任务。
- 多租户 SaaS 化。

这些能力可以在核心闭环跑通后继续扩展。
