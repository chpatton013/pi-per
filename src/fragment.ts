/**
 * Pure, side-effect-free helpers for assembling the reminder fragments that
 * pi-per injects into the context. Kept free of `fs`/paths so they can be unit
 * tested in isolation.
 */

/**
 * The four config filenames pi-per looks for. `PER_*` is the base content and
 * `APPEND_PER_*` is concatenated after it, mirroring Pi's `SYSTEM.md` /
 * `APPEND_SYSTEM.md` convention.
 */
export const TURN_FILES = ["PER_TURN.md", "APPEND_PER_TURN.md"] as const;
export const RUN_FILES = ["PER_RUN.md", "APPEND_PER_RUN.md"] as const;

/**
 * Join a base fragment and its append fragment. Empty/whitespace-only parts are
 * dropped; the result is trimmed. Returns "" when nothing is present.
 */
export function combine(base: string | null, append: string | null): string {
	return [base, append]
		.map((part) => (part ?? "").trim())
		.filter((part) => part.length > 0)
		.join("\n\n");
}

/**
 * Wrap combined content in a labelled block so the model sees a clearly
 * delimited reminder. Returns "" when there is nothing to wrap.
 */
export function wrap(tag: string, content: string): string {
	const trimmed = content.trim();
	if (trimmed.length === 0) {
		return "";
	}
	return `<${tag}>\n${trimmed}\n</${tag}>`;
}

export function buildTurnFragment(base: string | null, append: string | null): string {
	return wrap("pi-per-turn", combine(base, append));
}

export function buildRunFragment(base: string | null, append: string | null): string {
	return wrap("pi-per-run", combine(base, append));
}
