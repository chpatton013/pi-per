import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveFile, type ResolveDirs } from "../src/resolve.js";

let root: string;
let projectDir: string;
let globalDir: string;

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "pi-per-"));
	projectDir = path.join(root, "project", ".pi");
	globalDir = path.join(root, "global", "agent");
	fs.mkdirSync(projectDir, { recursive: true });
	fs.mkdirSync(globalDir, { recursive: true });
});

afterEach(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

function write(dir: string, name: string, content: string) {
	fs.writeFileSync(path.join(dir, name), content);
}

const trusted = (): ResolveDirs => ({ projectDir, globalDir, trusted: true });
const untrusted = (): ResolveDirs => ({ projectDir, globalDir, trusted: false });

describe("resolveFile", () => {
	it("returns null when the file exists in neither location", () => {
		expect(resolveFile("PER_TURN.md", trusted())).toBeNull();
	});

	it("reads from the global dir when only global exists", () => {
		write(globalDir, "PER_TURN.md", "global content");
		expect(resolveFile("PER_TURN.md", trusted())).toBe("global content");
	});

	it("project overrides global when both exist", () => {
		write(globalDir, "PER_TURN.md", "global content");
		write(projectDir, "PER_TURN.md", "project content");
		expect(resolveFile("PER_TURN.md", trusted())).toBe("project content");
	});

	it("ignores project files when the project is untrusted, falling back to global", () => {
		write(globalDir, "PER_TURN.md", "global content");
		write(projectDir, "PER_TURN.md", "project content");
		expect(resolveFile("PER_TURN.md", untrusted())).toBe("global content");
	});

	it("returns null for untrusted project with no global fallback", () => {
		write(projectDir, "PER_TURN.md", "project content");
		expect(resolveFile("PER_TURN.md", untrusted())).toBeNull();
	});

	it("trims content and treats whitespace-only files as absent", () => {
		write(globalDir, "PER_TURN.md", "  padded  \n");
		expect(resolveFile("PER_TURN.md", trusted())).toBe("padded");

		write(projectDir, "PER_TURN.md", "   \n\t ");
		// project is whitespace-only -> falls through to global
		expect(resolveFile("PER_TURN.md", trusted())).toBe("padded");
	});
});
