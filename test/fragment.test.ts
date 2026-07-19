import { describe, expect, it } from "vitest";
import { buildRunFragment, buildTurnFragment, combine, wrap } from "../src/fragment.js";

describe("combine", () => {
	it("joins base and append with a blank line", () => {
		expect(combine("base", "append")).toBe("base\n\nappend");
	});

	it("drops missing parts", () => {
		expect(combine("base", null)).toBe("base");
		expect(combine(null, "append")).toBe("append");
	});

	it("returns empty string when both are absent or blank", () => {
		expect(combine(null, null)).toBe("");
		expect(combine("   ", "\n\t")).toBe("");
	});

	it("trims surrounding whitespace", () => {
		expect(combine("  base  ", "  append  ")).toBe("base\n\nappend");
	});
});

describe("wrap", () => {
	it("wraps non-empty content in the given tag", () => {
		expect(wrap("x", "hi")).toBe("<x>\nhi\n</x>");
	});

	it("returns empty string for blank content (no empty tags)", () => {
		expect(wrap("x", "")).toBe("");
		expect(wrap("x", "   ")).toBe("");
	});
});

describe("buildTurnFragment / buildRunFragment", () => {
	it("labels each fragment distinctly", () => {
		expect(buildTurnFragment("t", null)).toBe("<pi-per-turn>\nt\n</pi-per-turn>");
		expect(buildRunFragment("r", null)).toBe("<pi-per-run>\nr\n</pi-per-run>");
	});

	it("is empty when there is no content", () => {
		expect(buildTurnFragment(null, null)).toBe("");
		expect(buildRunFragment(null, null)).toBe("");
	});

	it("includes both base and append", () => {
		expect(buildTurnFragment("base", "append")).toBe("<pi-per-turn>\nbase\n\nappend\n</pi-per-turn>");
	});
});
