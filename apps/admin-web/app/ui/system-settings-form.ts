export type SystemSettingsFormState = {
  aboutText: string;
  cutoffTime: string;
  customerServiceTel: string;
  deliveryCities: string;
  deliveryProvinces: string;
  loginImageUrl: string;
  loginSubtitle: string;
  loginTitle: string;
  loginWelcome: string;
  privacyPolicyUrl: string;
  userAgreementUrl: string;
};

function parseRangeValues(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
}

export function buildSystemSettingsPayload(
  storeId: string,
  form: SystemSettingsFormState,
) {
  return {
    aboutText: form.aboutText.trim(),
    cutoffTime: form.cutoffTime.trim(),
    customerServiceTel: form.customerServiceTel.trim(),
    deliveryCities: parseRangeValues(form.deliveryCities),
    deliveryProvinces: parseRangeValues(form.deliveryProvinces),
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
