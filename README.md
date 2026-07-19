# pi-per

Pi Agent extension that injects per-turn and per-run messages into the context.
Reminds low-param models of important context by sticking it right at the end.

## How it works

Low-parameter models tend to lose track of instructions that sit far from where
they generate their next token. `pi-per` counteracts this by re-injecting your
reminder text at the **very end** of the context — the position closest to the
model's response.

Injection happens through Pi's ephemeral `context` hook, so the reminders are
**not** written to session history: they are added fresh to each model request
and always stay at the end of the context.

- **Per-turn** messages are re-injected on **every** model turn.
- **Per-run** messages are injected once, on the **first** model turn of each run
  (i.e. per user submission).

On the first turn of a run the order is: `…conversation`, per-run block, per-turn
block — so the per-turn reminder is always the most recent thing the model sees.

## Configuration

Looks in `.pi/` (project) and `~/.pi/agent/` (global) for these files:

| Fragment | Base file      | Append file           |
| -------- | -------------- | --------------------- |
| per-turn | `PER_TURN.md`  | `APPEND_PER_TURN.md`  |
| per-run  | `PER_RUN.md`   | `APPEND_PER_RUN.md`   |

For each fragment, the base file and append file are concatenated (base first).

Just like Pi's `SYSTEM.md` and `APPEND_SYSTEM.md`, resolution is **per file**:
a copy found in the project's `.pi/` overrides the same-named file in
`~/.pi/agent/`. Project files are only read when the project is trusted; missing
or empty files are skipped, and with no config at all the extension is a silent
no-op.

The project directory follows Pi's standard config dir (`CONFIG_DIR_NAME`), and
the global directory is Pi's agent dir (`getAgentDir()`), so pi-per uses the same
locations as every other pi extension.

## Install

```sh
pi install git:github.com/<owner>/pi-per   # or a local path / npm source
```

Or drop it in as a local extension for a quick try:

```sh
pi -e ./extensions/index.ts
```

## Development

```sh
npm install
npm test          # vitest
npm run typecheck # tsc --noEmit
```
