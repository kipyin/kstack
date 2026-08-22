# Panel

Five reviewers. One specialty per reviewer. Load each reviewer's `SKILL.md` by name from the host's skill directories — hashed plugin-cache paths go stale.

| Reviewer | Skill to follow | Cursor type when present | Else |
|---|---|---|---|
| Thermo correctness | `thermo-nuclear-review` | `thermo-nuclear-review-subagent` | `explore` |
| Thermo quality | `thermo-nuclear-code-quality-review` | `thermo-nuclear-code-quality-review-subagent` | `explore` |
| Bugbot | `review-bugbot` | `bugbot` | `explore` |
| Security | `review-security` | `security-review` | `explore` |
| Architecture | `improve-codebase-architecture` | `explore` | `explore` |

`explore` (or the host's read-only + shell equivalent). Background. No nested subagents. No edits.

This skill owns synthesis. Spawn the two thermo reviewers directly.

## Thermo pair

Same scoped packet in both prompts: `### Git / diff output` and `### Changed file contents`. Follow that reviewer's `SKILL.md`. Return prioritized findings with file:line evidence.

## Bugbot and security

Use the prompt shape in each reviewer's `SKILL.md`. Those reviewers compute the diff — pass repository path and diff kind, not the thermo packet.

Default `Diff: branch changes`. Add `Base Branch` only when the user named a base other than the repo default. Add `Custom Instructions` only when the user gave some.

## Architecture

Load `improve-codebase-architecture` and `codebase-design`. Run **Explore** only. Return a structured findings list: files, problem, solution, recommendation strength (`Strong` / `Worth exploring` / `Speculative`). Use the codebase-design terms exactly. Use `CONTEXT.md` names when that file exists.

Stop after Explore. The user-facing output of this whole skill is the Chinese draft, not an HTML file.
