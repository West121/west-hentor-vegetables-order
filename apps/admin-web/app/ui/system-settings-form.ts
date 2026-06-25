export type SystemSettingsFormState = {
  aboutText: string;
  customerServiceTel: string;
  deliveryCities: string[];
  deliveryProvinces: string[];
  homeDishColumns: number;
  loginImageUrl: string;
  loginSubtitle: string;
  loginTitle: string;
  loginWelcome: string;
  privacyPolicyUrl: string;
  userAgreementUrl: string;
};

function normalizeRangeValues(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
}

function normalizeHomeDishColumns(value: number) {
  return value === 2 || value === 3 || value === 4 ? value : 3;
}

export function buildSystemSettingsPayload(
  storeId: string,
  form: SystemSettingsFormState,
) {
  return {
    aboutText: form.aboutText.trim(),
    customerServiceTel: form.customerServiceTel.trim(),
    deliveryCities: normalizeRangeValues(form.deliveryCities),
    deliveryProvinces: normalizeRangeValues(form.deliveryProvinces),
    homeDishColumns: normalizeHomeDishColumns(form.homeDishColumns),
    loginImageUrl: form.loginImageUrl.trim(),
    loginSubtitle: form.loginSubtitle.trim(),
    loginTitle: form.loginTitle.trim(),
    loginWelcome: form.loginWelcome.trim(),
    privacyPolicyUrl: form.privacyPolicyUrl.trim(),
    storeId,
    userAgreementUrl: form.userAgreementUrl.trim(),
  };
}

export function canSubmitSystemSettings(input: {
  saving: boolean;
  storeId: string | null;
}) {
  return Boolean(input.storeId) && !input.saving;
}
