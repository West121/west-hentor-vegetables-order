import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("shipment stats panel usage", () => {
  it("defaults shipment statistics to pending delivery and has no address keyword filter", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/shipment-stats-panel.tsx"),
      "utf8",
    );

    expect(source).toContain(
      'const DEFAULT_SHIPMENT_STATUS: OrderStatus = "PENDING_SHIPMENT"',
    );
    expect(source).toContain(
      'const [status, setStatus] = useState<"" | OrderStatus>(DEFAULT_SHIPMENT_STATUS)',
    );
    expect(source).toContain("status: DEFAULT_SHIPMENT_STATUS");
    expect(source).not.toContain("addressKeyword");
    expect(source).not.toContain("地址关键词");
  });
});
