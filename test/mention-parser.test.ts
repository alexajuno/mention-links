import { describe, it, expect } from "vitest";
import { parseMentions } from "../src/utils/mention-parser";

describe("parseMentions", () => {
  it("extracts a single @mention", () => {
    const result = parseMentions("had lunch with @phuongtq today");
    expect(result).toEqual([
      { handle: "phuongtq", start: 15, end: 24 },
    ]);
  });

  it("extracts multiple @mentions", () => {
    const result = parseMentions("met @chinhdt and @minhnv at work");
    expect(result).toEqual([
      { handle: "chinhdt", start: 4, end: 12 },
      { handle: "minhnv", start: 17, end: 24 },
    ]);
  });

  it("handles dots and hyphens in handles", () => {
    const result = parseMentions("texted @mai.anh and @tuan-anh");
    expect(result).toEqual([
      { handle: "mai.anh", start: 7, end: 15 },
      { handle: "tuan-anh", start: 20, end: 29 },
    ]);
  });

  it("ignores email addresses", () => {
    const result = parseMentions("email user@domain.com please");
    expect(result).toEqual([]);
  });

  it("matches @mention at start of line", () => {
    const result = parseMentions("@phuongtq was there");
    expect(result).toEqual([
      { handle: "phuongtq", start: 0, end: 9 },
    ]);
  });

  it("returns empty array for no mentions", () => {
    const result = parseMentions("a normal line with no mentions");
    expect(result).toEqual([]);
  });

  it("ignores @mention inside inline code", () => {
    const result = parseMentions("`@notamention` but @real is");
    expect(result).toEqual([
      { handle: "real", start: 19, end: 24 },
    ]);
  });
});
