import { describe, it, expect } from "vitest";
import { indexMentionsInText } from "../src/indexer/mention-index";

describe("indexMentionsInText", () => {
  it("indexes mentions with line and column positions", () => {
    const text = "first line\nhad lunch with @phuongtq\nthird line";
    const result = indexMentionsInText(text);
    expect(result).toHaveLength(1);
    expect(result[0].handle).toBe("phuongtq");
    expect(result[0].line).toBe(1);
    expect(result[0].contextLine).toBe("had lunch with @phuongtq");
  });

  it("indexes multiple mentions across lines", () => {
    const text = "met @chinhdt\nlater saw @minhnv";
    const result = indexMentionsInText(text);
    expect(result).toHaveLength(2);
    expect(result[0].handle).toBe("chinhdt");
    expect(result[0].line).toBe(0);
    expect(result[1].handle).toBe("minhnv");
    expect(result[1].line).toBe(1);
  });

  it("returns empty for no mentions", () => {
    const result = indexMentionsInText("nothing here");
    expect(result).toEqual([]);
  });
});
