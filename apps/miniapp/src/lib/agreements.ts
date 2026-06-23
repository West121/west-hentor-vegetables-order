export function buildAgreementWebviewUrl(url: string) {
  return `/pages/webview/index?url=${encodeURIComponent(url)}`;
}

export function getAgreementEntry(label: string, url?: string | null) {
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
