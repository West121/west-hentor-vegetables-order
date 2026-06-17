export type AdminNavIcon =
  | "boxes"
  | "building"
  | "clipboard"
  | "dashboard"
  | "file-clock"
  | "package"
  | "settings"
  | "shield"
  | "store"
  | "truck"
  | "user"
  | "users";

export type AdminNavItem = {
  active?: boolean;
  icon: AdminNavIcon;
  label: string;
};

export type AdminNavGroup = {
  collapsible?: boolean;
  items: AdminNavItem[];
  label: string;
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "工作台",
    items: [{ icon: "dashboard", label: "运营总览", active: true }],
  },
  {
    label: "订单管理",
    items: [
      { icon: "clipboard", label: "订单列表", active: true },
      { icon: "truck", label: "发货统计" },
    ],
  },
  {
    label: "会员管理",
    items: [
      { icon: "users", label: "会员用户" },
      { icon: "shield", label: "用户套餐" },
    ],
  },
  {
    label: "套餐管理",
    items: [
      { icon: "package", label: "套餐模板" },
      { icon: "boxes", label: "菜品管理" },
    ],
  },
  {
    label: "门店管理",
    items: [
      { icon: "store", label: "加盟门店" },
      { icon: "building", label: "加盟商" },
    ],
  },
  {
    label: "任务管理",
    items: [{ icon: "file-clock", label: "任务配置" }],
  },
  {
    label: "系统管理",
    collapsible: true,
    items: [
      { icon: "user", label: "后台用户" },
      { icon: "file-clock", label: "操作日志" },
      { icon: "settings", label: "系统设置" },
    ],
  },
];
