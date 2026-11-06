---
name: use-instabox
description: Use when the user explicitly asks to use instabox for the current task, such as developing, testing, or running a command there. Routes to the task-specific instabox skill.
---

# Use instabox

Route the request to the existing skill that owns the operation. Read that skill before running instabox commands.

| Requested operation | Read |
| --- | --- |
| Move a local repository and its agent history | `instabox-move-repo` |
| Save or load machine state, or copy a machine | `instabox-snapshots` |
| Put local tokens or ordinary configuration on a machine | `instabox-basic-setup` |
| Create, connect to, inspect, run commands in, or clean up a machine | `instabox` |

Keep the user's requested scope. A request to inspect or document instabox does not authorize machine changes.

## Run a task

For each step, follow the selected skill and the current CLI help. The official skills own command syntax and limits.

1. **Choose the starting state.** Check existing boxes and reusable snapshots with the `instabox` and `instabox-snapshots` skills. Continue a named existing box when it holds the requested work. Otherwise, start from the reviewed base environment or a snapshot that already has the needed dependencies. Do not assume a snapshot includes running processes, memory, or credentials.

   **Done when:** the target box and its starting state are identified from current state, not an assumed name.

2. **Verify the environment.** Follow `instabox-basic-setup` for tokens and ordinary configuration. Review its plan before copying anything. Use the project's manifests, lockfiles, and CI to identify dependency checks. After creation, snapshot loading, or resume, run the checks needed by the task. A restored disk alone does not prove that dependencies or services work.

   **Done when:** required dependencies and services have current evidence, or each unresolved requirement is reported.

3. **Transfer only the needed code.** For a full repository migration, follow `instabox-move-repo`, including its plan and verification. For an existing box, use the file-transfer operations in `instabox` for the files or directories the task needs. Confirm the destination and transferred content before building. Treat local and remote copies as separate until a transfer has completed.

   **Done when:** the intended source state is present in the box and checked against the local state, or discrepancies are reported.

4. **Run and observe the task.** Use `instabox` for foreground execution and its background-job interface for work that outlasts the foreground command limit. Set the command timeout to the expected duration within the documented limit. Save output for later inspection. Check command results and background-job status; distinguish a client timeout, a stopped command, and a completed command.

   **Done when:** the task has a recorded outcome and evidence, rather than only a successful command launch.

5. **Inspect failure before retrying.** Follow `instabox` to inspect the box, job status, and relevant logs. Determine whether work stopped, is still running, or has unknown side effects. Fix the identified cause first. Retry only after checking the operation is safe to repeat and will not duplicate external writes or conflict with a running job. A retry is another attempt, not evidence of success.

   **Done when:** the retry has a known starting state and an explicit success check, or remains unattempted with the reason reported.

6. **Isolate and close the work.** Use separate boxes, snapshots, or forks as described by the official skills when work must not affect another task. Select only the intended credentials. Review snapshot contents before retaining or sharing them; saved files can contain credentials. Stop, pause, retain, or delete resources according to the user's scope and the `instabox` lifecycle guidance. Keep snapshots needed for later work and remove only resources identified as disposable.

   **Done when:** retained resources and their purpose are named, disposable resources are handled as authorized, and remaining risks or unfinished work are reported.

Report the commands actually run, exit status where available, validation evidence, and unresolved failures. Describe unverified capabilities as unverified.

When no machine change is requested, finish after reading the selected skill and any needed local help or official documentation. Otherwise, complete the selected skill's workflow and report its actual results.

Official reference: https://instabox.sh/docs
