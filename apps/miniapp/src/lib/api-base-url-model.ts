export type MiniProgramEnvironment = "develop" | "trial" | "release" | string;

export function resolveApiBaseUrl(
  envVersion: MiniProgramEnvironment | undefined,
  testApiBaseUrl = "https://mmprd.hentor.com:8203",
  prodApiBaseUrl = "https://mmprd.hentor.com:8103",
) {
  return envVersion === "release" ? prodApiBaseUrl : testApiBaseUrl;
}
