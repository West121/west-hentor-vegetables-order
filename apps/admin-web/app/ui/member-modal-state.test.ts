import { describe, expect, it } from "vitest";

import {
  buildMemberFormState,
  hasUnsavedMemberModalChanges,
} from "./member-modal-state";

const member = {
  bindingStatus: "ACTIVE",
  disabledReason: null,
  remark: "老备注",
} as const;

describe("member modal dirty state", () => {
  it("does not mark an unchanged member form as dirty", () => {
    expect(
      hasUnsavedMemberModalChanges({
        current: buildMemberFormState(member),
        initial: buildMemberFormState(member),
      }),
    ).toBe(false);
  });

  it("marks remark, status and disabled reason changes as dirty", () => {
    const initial = buildMemberFormState(member);

    expect(
      hasUnsavedMemberModalChanges({
        current: { ...initial, remark: "新备注" },
        initial,
      }),
    ).toBe(true);
    expect(
      hasUnsavedMemberModalChanges({
        current: { ...initial, status: "DISABLED" },
        initial,
      }),
    ).toBe(true);
    expect(
      hasUnsavedMemberModalChanges({
        current: { ...initial, disabledReason: "暂停配送" },
        initial,
      }),
    ).toBe(true);
  });
});
