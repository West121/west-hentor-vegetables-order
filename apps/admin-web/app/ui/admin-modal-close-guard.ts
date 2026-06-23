export type AdminModalCloseGuardInput = {
  hasUnsavedChanges: boolean;
};

export function canCloseAdminModal(_input: AdminModalCloseGuardInput) {
  return true;
}
