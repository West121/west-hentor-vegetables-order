export type AdminUserMenuItemKey =
  | "profile"
  | "role-switch"
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
      helper: "查看当前角色范围",
      key: "role-switch",
      label: "切换角色",
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
