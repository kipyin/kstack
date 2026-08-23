---
name: ponytail
description: >
  ponytail: lazy-senior decide ladder, YAGNI/reuse before new code, root-cause
  fixes, short diffs, `ponytail:` comments, large behavior-preserving ports.
  Load when another skill says "Load the ponytail skill".
---

# Ponytail

Lazy senior: the smallest correct thing, after you understand the problem.

Projects may also restate Ponytail in `AGENTS.md`.
This file is the shared source.

## Design principles

Write the plan as the **final version**.
Real file names, real functions, real acceptance.
A sketch you mean to replace later is not a plan.

Use **specific names**.
`parseReportTime`, the test command, the ticket id.
Not helper, utils, or "the loader".

## Decide

Read the task and the code it touches.
Trace the real flow end to end.
Then climb.
Two rungs both work: take the higher one.

1. **Need?** Speculative need: skip it, say so in one line. (YAGNI)
2. **Here already?** A helper, type, or pattern in this repo: reuse it.
3. **Stdlib?** Use it.
4. **Native platform?** DB constraint, OS API, language feature, CSS: use it.
5. **Installed dependency?** Use it. A few lines beat a new package.
6. **One line?** One line.
7. **Minimum.** Only then: the smallest new code that works.

**Done when:** the problem is understood, and you stopped at the first rung that holds.

A bug report names a **symptom**.
The lazy fix is the **root-cause** fix.
Grep every caller of the function you touch.
Encode the invariant earlier (type, schema, single validation gate) if the same class recurs.
Prefer earlier failure.
One guard in the shared place is a smaller diff than a guard in every caller.

Think **greenfield**: the shape that makes this defect impossible, then the smallest move toward it.

## Correctness

Trust-critical and domain-math shortcuts are bugs.
A skipped segment, a silent dedupe, a scale that only holds on the happy path: treat each as a defect, not a simplification.
Green tests do not prove the meaning is right.
New or changed calc needs a hand-checkable micro-example with a concrete number.

Keep input validation at trust boundaries, error handling that prevents data loss, and security.
Those are the work, not fat to trim.

Non-trivial logic (a branch, a loop, a parser, money or auth) leaves **one runnable check** behind: the smallest thing that fails if the logic breaks.
Trivial one-liners need no test.

## Diff discipline

Shortest working diff, after the ladder, in the right place.
The smallest edit in the wrong place is a second bug.

Fewest files.
Deletion over addition.
No unrequested abstraction, factory, interface, or config-for-later.

Mark a deliberate simplification that cuts a real corner with a known ceiling using a `ponytail:` comment.
Name the ceiling and the upgrade path.
`# ponytail: global lock; per-account locks if throughput matters`

## Large changes

A large **behavior-preserving port** is a move, not a rewrite.
Trace the old flow, map each output, then move.
Verify old and new on the same inputs.

Keep structure change and behavior change apart.
A meaning or contract change gets its own decide pass.
While-I'm-here cleanups wait.

## Writing

Comma, colon, or a rewrite: never an em dash.
Long docs: one sentence per line.

Commit and PR text end at the why.
No `Co-Authored-By:` and no Generated-with footer.

Follow the project ZH style guide if present.
