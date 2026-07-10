export type AdminUserMenuItemKey =
  | "profile"
  | "password"
  | "role-switch"
  | "layout-settings"
  | "operation-logs"
  | "logout";

export type AdminUserMenuItem = {
  disabled?: boolean;
  helper?: string;
  key: AdminUserMenuItemKey;
  label: string;
};

export function buildAdminUserMenuItems({
  canOpenOperationLogs,
}: {
  canOpenOperationLogs: boolean;
}): AdminUserMenuItem[] {
  return [
    {
      disabled: false,
      helper: "查看当前账号资料",
      key: "profile",
      label: "个人资料",
    },
    {
      disabled: false,
      helper: "修改当前登录密码",
      key: "password",
      label: "修改密码",
    },
    {
      disabled: false,
      helper: "查看当前角色范围",
      key: "role-switch",
      label: "切换角色",
    },
    {
      disabled: false,
      helper: "调整后台布局",
      key: "layout-settings",
      label: "布局设置",
    },
    {
      disabled: !canOpenOperationLogs,
      helper: canOpenOperationLogs ? "查看操作记录" : "需系统管理权限",
      key: "operation-logs",
      label: "操作日志",
    },
    {
      key: "logout",
      label: "退出登录",
    },
  ];
}
