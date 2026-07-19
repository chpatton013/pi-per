import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import piPer from "../extensions/index.js";

/**
 * End-to-end drive of the extension's real hook wiring with a mock Pi API.
 * Confirms the `context` hook appends the right fragments, in the right order,
 * at the very end of the message list, with correct per-turn vs per-run timing.
 */

type Handler = (event: any, ctx: any) => any;

function makePi() {
	const handlers = new Map<string, Handler>();
	const pi = {
		on(event: string, handler: Handler) {
			handlers.set(event, handler);
		},
	};
	return { pi, handlers };
}

let cwd: string;
let projectDir: string;

function makeCtx() {
	return {
		cwd,
		isProjectTrusted: () => true,
		ui: { notify: () => {} },
	};
}

beforeEach(() => {
	cwd = fs.mkdtempSync(path.join(os.tmpdir(), "pi-per-ext-"));
	projectDir = path.join(cwd, ".pi");
	fs.mkdirSync(projectDir, { recursive: true });
});

afterEach(() => {
	fs.rmSync(cwd, { recursive: true, force: true });
});

function lastContent(messages: any[]): string {
	return messages[messages.length - 1].content as string;
}

describe("pi-per extension", () => {
	it("injects per-run then per-turn on the first turn, per-turn only afterwards", async () => {
		fs.writeFileSync(path.join(projectDir, "PER_TURN.md"), "TURN_MARKER");
		fs.writeFileSync(path.join(projectDir, "PER_RUN.md"), "RUN_MARKER");

		const { pi, handlers } = makePi();
		piPer(pi as any);
		const ctx = makeCtx();

		await handlers.get("session_start")!({ type: "session_start", reason: "new" }, ctx);
		await handlers.get("before_agent_start")!({ type: "before_agent_start" }, ctx);

		// First model turn of the run.
		const turn1 = { type: "context", messages: [{ role: "user", content: "hello", timestamp: 1 }] };
		const res1 = await handlers.get("context")!(turn1, ctx);
		const appended1 = lastContent(res1.messages);
		expect(res1.messages).toHaveLength(2); // original + injected
		expect(appended1).toContain("<pi-per-run>");
		expect(appended1).toContain("RUN_MARKER");
		expect(appended1).toContain("<pi-per-turn>");
		expect(appended1).toContain("TURN_MARKER");
		// per-run must come before per-turn (per-turn stays most recent)
		expect(appended1.indexOf("RUN_MARKER")).toBeLessThan(appended1.indexOf("TURN_MARKER"));

		// Second turn within the same run: per-turn only, no per-run.
		const turn2 = { type: "context", messages: [{ role: "user", content: "hello", timestamp: 1 }] };
		const res2 = await handlers.get("context")!(turn2, ctx);
		const appended2 = lastContent(res2.messages);
		expect(appended2).toContain("TURN_MARKER");
		expect(appended2).not.toContain("RUN_MARKER");
	});

	it("re-injects per-run on the next run (after before_agent_start fires again)", async () => {
		fs.writeFileSync(path.join(projectDir, "PER_RUN.md"), "RUN_MARKER");

		const { pi, handlers } = makePi();
		piPer(pi as any);
		const ctx = makeCtx();

		await handlers.get("session_start")!({ type: "session_start", reason: "new" }, ctx);
		await handlers.get("before_agent_start")!({ type: "before_agent_start" }, ctx);
		await handlers.get("context")!({ type: "context", messages: [] }, ctx); // consumes run

		// New run.
		await handlers.get("before_agent_start")!({ type: "before_agent_start" }, ctx);
		const res = await handlers.get("context")!({ type: "context", messages: [] }, ctx);
		expect(lastContent(res.messages)).toContain("RUN_MARKER");
	});

	it("is a silent no-op when no config files exist", async () => {
		const { pi, handlers } = makePi();
		piPer(pi as any);
		const ctx = makeCtx();

		await handlers.get("session_start")!({ type: "session_start", reason: "new" }, ctx);
		await handlers.get("before_agent_start")!({ type: "before_agent_start" }, ctx);
		const messages = [{ role: "user", content: "hello", timestamp: 1 }];
		const res = await handlers.get("context")!({ type: "context", messages }, ctx);
		expect(res).toBeUndefined();
		expect(messages).toHaveLength(1); // untouched
	});

	it("picks up edits to config between runs", async () => {
		const runFile = path.join(projectDir, "PER_TURN.md");
		fs.writeFileSync(runFile, "FIRST");

		const { pi, handlers } = makePi();
		piPer(pi as any);
		const ctx = makeCtx();

		await handlers.get("before_agent_start")!({ type: "before_agent_start" }, ctx);
		const res1 = await handlers.get("context")!({ type: "context", messages: [] }, ctx);
		expect(lastContent(res1.messages)).toContain("FIRST");

		fs.writeFileSync(runFile, "SECOND");
		await handlers.get("before_agent_start")!({ type: "before_agent_start" }, ctx);
		const res2 = await handlers.get("context")!({ type: "context", messages: [] }, ctx);
		expect(lastContent(res2.messages)).toContain("SECOND");
		expect(lastContent(res2.messages)).not.toContain("FIRST");
	});
});
