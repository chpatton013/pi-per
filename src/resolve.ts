/**
 * Per-file config resolution for pi-per.
 *
 * For each filename, a project-local copy overrides the global copy — exactly
 * like Pi's own `SYSTEM.md` / `APPEND_SYSTEM.md`. Uses the standard pi config
 * locations so pi-per behaves like every other extension:
 *   - project: `<cwd>/<CONFIG_DIR_NAME>/<name>`  (e.g. `.pi/PER_TURN.md`)
 *   - global:  `<agentDir>/<name>`               (e.g. `~/.pi/agent/PER_TURN.md`)
 */
import * as fs from "node:fs";
import * as path from "node:path";

export interface ResolveDirs {
	/** Absolute path to the project config dir, e.g. `<cwd>/.pi`. */
	projectDir: string;
	/** Absolute path to the global agent dir, e.g. `~/.pi/agent`. */
	globalDir: string;
	/** Whether the project is trusted; when false, project files are ignored. */
	trusted: boolean;
}

function readFileOrNull(filePath: string): string | null {
	try {
		if (!fs.existsSync(filePath)) {
			return null;
		}
		const content = fs.readFileSync(filePath, "utf8").trim();
		return content.length > 0 ? content : null;
	} catch {
		return null;
	}
}

/**
 * Resolve a single config file: the trusted project copy wins, otherwise fall
 * back to the global copy. Returns trimmed contents, or null if absent/empty.
 */
export function resolveFile(name: string, dirs: ResolveDirs): string | null {
	if (dirs.trusted) {
		const projectHit = readFileOrNull(path.join(dirs.projectDir, name));
		if (projectHit !== null) {
			return projectHit;
		}
	}
	return readFileOrNull(path.join(dirs.globalDir, name));
}
