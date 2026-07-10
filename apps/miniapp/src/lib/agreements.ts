export function buildAgreementWebviewUrl(url: string) {
  return `/pages/webview/index?url=${encodeURIComponent(url)}`;
}

export function buildAgreementContentUrl(type: "privacy" | "user") {
  return `/pages/agreement/index?type=${type}`;
}

export function getAgreementEntry(
  label: string,
  url?: string | null,
  content?: string | null,
  type: "privacy" | "user" = "user",
) {
  if (content?.trim()) {
    return {
      disabled: false,
      label,
      toastTitle: null,
      url: buildAgreementContentUrl(type),
    };
  }

  const normalized = url?.trim();
  if (!normalized) {
    return {
      disabled: true,
      label,
      toastTitle: `暂未配置${label}`,
      url: null,
    };
  }

  return {
    disabled: false,
    label,
    toastTitle: null,
    url: buildAgreementWebviewUrl(normalized),
  };
}
