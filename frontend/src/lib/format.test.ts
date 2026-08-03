import { describe, it, expect } from "vitest";
import { formatPrice, formatDate } from "./format";

describe("formatPrice", () => {
  it("formats a whole number as EUR with German thousands separators", () => {
    expect(formatPrice(1200)).toMatch(/^1\.200,00\s€$/);
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toMatch(/^0,00\s€$/);
  });

  it("formats a decimal price", () => {
    expect(formatPrice(19.9)).toMatch(/^19,90\s€$/);
  });

  it("shows a placeholder for null", () => {
    expect(formatPrice(null)).toBe("Price on request");
  });
});

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    expect(formatDate("2026-07-16T10:00:00.000Z")).toBe("16 July 2026");
  });

  it("returns an empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns an empty string for an unparseable date", () => {
    expect(formatDate("not-a-date")).toBe("");
  });
});
