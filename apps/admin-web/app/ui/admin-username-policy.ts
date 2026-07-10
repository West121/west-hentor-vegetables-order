export const ADMIN_USERNAME_WHITESPACE_ERROR =
  "当前账号存在空格，请重新填写";

export function validateNewAdminUsername(value: string) {
  if (!value.trim()) {
    return "请输入登录账号";
  }

  return /\s/u.test(value) ? ADMIN_USERNAME_WHITESPACE_ERROR : null;
}
