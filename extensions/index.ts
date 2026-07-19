/**
 * pi-per — inject per-turn and per-run reminder messages at the end of the
 * context, keeping important instructions right where the model responds.
 *
 * Config files (project `.pi/` overrides global `~/.pi/agent/`, per file):
 *   - PER_TURN.md   + APPEND_PER_TURN.md  → re-injected on EVERY model turn
 *   - PER_RUN.md    + APPEND_PER_RUN.md   → injected on the first turn of a run
 *
 * Injection happens in the ephemeral `context` hook, so nothing is written to
 * session history and the reminders always sit at the very end of the context.
 */
import * as path from "node:path";
import { CONFIG_DIR_NAME, getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildRunFragment, buildTurnFragment, RUN_FILES, TURN_FILES } from "../src/fragment.js";
import { resolveFile, type ResolveDirs } from "../src/resolve.js";

export default function piPer(pi: ExtensionAPI) {
	let turnFragment = "";
	let runFragment = "";
	// True after a user prompt starts, until the run fragment is injected on the
	// first model turn of that run.
	let runPending = false;

	function rebuild(cwd: string, trusted: boolean): { turnCount: number; runCount: number } {
		const dirs: ResolveDirs = {
			projectDir: path.join(cwd, CONFIG_DIR_NAME),
			globalDir: getAgentDir(),
			trusted,
		};

		const turnBase = resolveFile(TURN_FILES[0], dirs);
		const turnAppend = resolveFile(TURN_FILES[1], dirs);
		const runBase = resolveFile(RUN_FILES[0], dirs);
		const runAppend = resolveFile(RUN_FILES[1], dirs);

		turnFragment = buildTurnFragment(turnBase, turnAppend);
		runFragment = buildRunFragment(runBase, runAppend);

		return {
			turnCount: [turnBase, turnAppend].filter((v) => v !== null).length,
			runCount: [runBase, runAppend].filter((v) => v !== null).length,
		};
	}

	// Notify on startup so the user knows pi-per picked up their config.
	pi.on("session_start", (_event, ctx) => {
		const { turnCount, runCount } = rebuild(ctx.cwd, ctx.isProjectTrusted());
		const total = turnCount + runCount;
		if (total > 0) {
			ctx.ui.notify(
				`pi-per: loaded ${total} file(s) (${turnCount} per-turn, ${runCount} per-run)`,
				"info",
			);
		}
	});

	// Re-resolve fresh each run so edits to the config files take effect without
	// restarting, and flag that the run fragment is due on the next model turn.
	pi.on("before_agent_start", (_event, ctx) => {
		rebuild(ctx.cwd, ctx.isProjectTrusted());
		runPending = true;
	});

	// Append the fragments to the (deep-copied, ephemeral) message list on every
	// model request. Per-run goes before per-turn so per-turn stays last.
	pi.on("context", (event) => {
		const parts: string[] = [];
		if (runPending && runFragment.length > 0) {
			parts.push(runFragment);
		}
		if (turnFragment.length > 0) {
			parts.push(turnFragment);
		}
		runPending = false;

		if (parts.length === 0) {
			return;
		}

		event.messages.push({
			role: "user",
			content: parts.join("\n\n"),
			timestamp: Date.now(),
		});
		return { messages: event.messages };
	});
}
