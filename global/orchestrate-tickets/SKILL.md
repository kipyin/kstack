---
name: orchestrate-tickets
description: >-
  Orchestrate a post-/to-tickets effort: dispatch fresh Explore (optional) and
  Implement subagents per frontier ticket, insert strong integration
  code-reviews at DAG merge points and expand-contract milestones, and close
  with a full-effort review. Use when the user invokes /orchestrate-tickets or
  wants multi-agent execution of an already ticketed Matt-flow effort.
disable-model-invocation: true
---

# Orchestrate Tickets

You are the **orchestrator** for an effort that already completed `/to-tickets`.
Dispatch and gates only — do not explore, implement, test, or review yourself.

Per ticket, follow the `/implement` contract via a **fresh** subagent (clean
context). That subagent owns TDD and its own ticket-scoped `/code-review`
before commit. You add **integration reviews** at the triggers below; those are
effort-scoped and use a strong model.

## Preconditions

- Tickets already exist (local `.scratch/<feature>/issues/` or the configured tracker).
- You know the effort / feature slug / parent issue, and where the parent spec lives (if any).
- If tracker setup is missing, tell the user to run `/setup-matt-pocock-skills`.

## Hard stop gates

Stop and ask the user before continuing when:

1. Any step would touch a **production database** (read or write) or run a command that could mutate production data.
2. A **business / product decision** is required (behaviour not fixed by the ticket, acceptance criteria, ADRs, or prior user answers).
3. A subagent reports a blocker it cannot resolve from the ticket + handoff packet.
4. An **integration review** returns `FAIL` — present findings; wait for the user to choose fix tickets vs a scoped re-Implement.

After a stop, wait for an explicit answer; copy that answer into later handoff packets verbatim.

## Checklist

Keep this updated in the conversation:

```
Effort:
Parent spec:
Last integration review tip: (SHA or "effort start")
Frontier:
In flight:
Done:
Integration reviews run:
Stopped: (waiting on user?)
```

## Main loop

1. **Select** the next frontier ticket (all blockers done; prefer dependency order). Default: one ticket pipeline at a time. Parallelize only independent frontier tickets when the user asks.
2. **Explore** (optional but default on) — spawn a fresh read-only subagent. Skip only when the user says the ticket is already scoped.
3. If Explore returns `STOP` items → hard stop. Else continue.
4. **Implement** — spawn a fresh subagent with the ticket + Explore brief. It must read and follow `~/.agents/skills/implement/SKILL.md` end to end (drives `/tdd`, then ticket-scoped `/code-review`, then commit).
5. Mark the ticket done in the tracker / local status; update the checklist.
6. **Integration review?** — if a trigger below fires, spawn it before picking the next ticket.
7. Repeat until every ticket is done, then run the **mandatory final** integration review (even if one just ran, unless its fixed point was already effort-start…HEAD and it `PASS`ed with no new commits since).

## Integration review triggers (scheme A)

These are **effort-scoped** reviews (not a substitute for per-ticket `/code-review` inside Implement).

Fire a strong integration review when **any** of:

1. **Merge point** — the ticket just completed unblocks **≥2** not-yet-done tickets.
2. **Expand–contract milestones** — after **expand** completes; after **each migrate batch** completes; **before contract** starts.
3. **Flagged risk** — Explore or Implement returned `REVIEW_SOON` (cross-cutting risk).
4. **Final close-out** — all tickets Done; review `effort-start...HEAD` against the parent spec before declaring the effort complete.

### Integration review contract

**Model:** `cursor-grok-4.5-high-fast`

**Does:** Read and follow `~/.agents/skills/code-review/SKILL.md`.

**Fixed point:**

- Mid-effort: `Last integration review tip` (or effort start if none yet) … `HEAD`
- Final: effort start … `HEAD` (full effort)

**Spec source:** parent spec / `/to-spec` output for the effort — not a single ticket.

**Completion criterion:** `PASS` or `FAIL` with Standards + Spec reports; on `PASS`, set `Last integration review tip` to current `HEAD`.

On `FAIL`: hard stop (do not keep implementing further frontier tickets).

## Subagent contracts

Each spawn is a **new** agent with **no** parent conversation. Prompts must be self-contained. Always include:

- Exact ticket title/id and full body (What to build, Blocked by, acceptance criteria), or for integration review: parent spec path/contents + fixed point SHA
- Repo path; branch / feature slug the user stated
- This phase's job, inputs, and completion criterion
- Stop gates (prod DB, business decisions)
- Which skill file(s) to read before acting

### Explore (read-only)

**Model:** `composer-2.5-fast`

**Does:** Map the codebase to the ticket; name likely seams; list risks. Does not edit or commit.

**Completion criterion:** A short brief with:

- Relevant areas/files
- Recommended TDD seam / approach in ≤10 lines
- Risks / unknowns
- `REVIEW_SOON` or `NO_REVIEW_SOON`
- `STOP` items for the user, or `NO_STOP`

### Implement

**Model:** easy work → `composer-2.5-fast`; hard impl / TDD-heavy → `cursor-grok-4.5-high-fast`. If unsure, use the stronger model.

**Does:** Full `~/.agents/skills/implement/SKILL.md` for **this ticket only** — `/tdd` at agreed seams, ticket-scoped `/code-review`, commit on the current branch.

**Completion criterion:** Returns:

- What landed (behaviour)
- Commit SHA(s)
- Tests / typechecks run and results
- `REVIEW_SOON` or `NO_REVIEW_SOON`
- `STOP` items, or `NO_STOP`

## Model routing

| Work | Model slug |
|------|------------|
| Explore; easy implementation; easy tests | `composer-2.5-fast` |
| Hard implementation; TDD design; integration review | `cursor-grok-4.5-high-fast` |

## Orchestrator behaviour

- Prefer spawning over doing. If you catch yourself editing code, stop and spawn.
- Put needed facts into handoff packets; never assume a subagent saw prior turns.
- After each phase, summarize to the user in 2–5 lines, then continue or stop.
- When the effort completes (all tickets Done + final integration review `PASS`), list ticket → SHA and the integration reviews run (tip SHAs).
