import { describe, it, expect } from "vitest";
import { parsePersonFile } from "../src/indexer/person-registry";

describe("parsePersonFile", () => {
  it("extracts display name from heading", () => {
    const content = "# Phuong Tran\n\n## info\n- developer\n\n## lines\n";
    const result = parsePersonFile("phuongtq", content);
    expect(result.handle).toBe("phuongtq");
    expect(result.displayName).toBe("Phuong Tran");
  });

  it("extracts info lines", () => {
    const content = "# Phuong\n\n## info\n- developer at XYZ\n- Hanoi\n\n## lines\n- 2026-01-01: met at party\n";
    const result = parsePersonFile("phuongtq", content);
    expect(result.info).toEqual(["developer at XYZ", "Hanoi"]);
  });

  it("uses handle as display name when no heading", () => {
    const content = "## info\n- some info\n";
    const result = parsePersonFile("phuongtq", content);
    expect(result.displayName).toBe("phuongtq");
  });

  it("handles empty file", () => {
    const result = parsePersonFile("phuongtq", "");
    expect(result.handle).toBe("phuongtq");
    expect(result.displayName).toBe("phuongtq");
    expect(result.info).toEqual([]);
  });

  it("extracts heading with parenthetical handle", () => {
    const content = "# Minh (minhnt)\n\n## info\n- CTO\n";
    const result = parsePersonFile("minhnt", content);
    expect(result.displayName).toBe("Minh (minhnt)");
    expect(result.info).toEqual(["CTO"]);
  });
});
