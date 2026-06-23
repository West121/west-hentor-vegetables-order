type DirtyFormValue = unknown;

type DirtyFormRecord = Record<string, DirtyFormValue>;

function normalizeValue(value: DirtyFormValue) {
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === "string") ? [...value].sort() : value;
  }

  return value ?? "";
}

export function hasAdminFormChanges({
  current,
  initial,
}: {
  current: DirtyFormRecord;
  initial: DirtyFormRecord;
}) {
  const keys = new Set([...Object.keys(current), ...Object.keys(initial)]);

  for (const key of keys) {
    if (
      JSON.stringify(normalizeValue(current[key])) !==
      JSON.stringify(normalizeValue(initial[key]))
    ) {
      return true;
    }
  }

  return false;
}
