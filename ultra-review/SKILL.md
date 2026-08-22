---
name: ultra-review
description: Five-reviewer code review, then one decision-ready Chinese report.
disable-model-invocation: true
argument-hint: "[branch changes|uncommitted changes]"
---

# Ultra Review

Five specialist reviewers inspect the same change. Independently verify and consolidate their findings, then give the human one focused Chinese report. Review only.

## 1. Scope

Repo: the active workspace root.

Diff: `branch changes` against the repo's default base, unless the user asked for `uncommitted changes` or named a base. If they named a PR or branch, check it out first. Stash only after they confirm.

Confirm the three-dot diff is non-empty. Empty diff: stop here.

Read `CONTEXT.md` and any ADRs in the touched area when those files exist.

For the two thermo reviewers, gather `git diff <base>...HEAD` (or the uncommitted diff) and the full contents of changed files. That packet is for those two reviewers only.

Done when: absolute repo path recorded, diff kind chosen, diff non-empty, thermo packet in hand.

## 2. Launch the reviewers

Read [PANEL.md](PANEL.md). Launch all five reviewers in one turn, background.

Done when: five ids exist, one per reviewer.

## 3. Collect

Wait until every reviewer returns. Retry a failed reviewer once with the same prompt. After a second failure, name that reviewer and continue with the reports you have.

Normalize every report into observations with `reviewer`, `location` (file:line), `claim`, `evidence`, and `severity` when provided. A deepening candidate is an observation.

Done when: five reports are in hand, or every missing reviewer is named after one retry; every observation has reviewer + location + claim + evidence.

## 4. Consolidate and verify

Group observations that describe the same underlying behavior into one issue. Different files stay together when they share one root cause. Similar wording stays separate when the behaviors or fixes differ.

Inspect the relevant code and tests yourself. A reviewer count changes confidence, not truth or priority. One well-supported issue can matter; five repeated claims can still be wrong.

When reviewers disagree, resolve factual disagreements from the code where possible. Keep the competing claims together until resolved. Do not turn disagreement itself into a report section.

For each issue, record the affected behavior, evidence, locations, user or system consequence, reviewers, confidence, and smallest appropriate response. Map every source observation to exactly one issue.

Done when: every observation maps to one issue, every issue has been independently checked, and duplicate observations appear only once.

## 5. Decide

Read [DECISION.md](DECISION.md). Decide what the human should do with every issue.

Done when: every issue has one recommended response and a plain-language reason; every ticketed issue cites its ticket.

## 6. Draft

Write for the person deciding whether this change should merge. Assume they know the product but have not followed the implementation.

Start with a short conclusion: what the change does, whether it is ready to merge, and the most important reason. Then use only the non-empty sections below, in this order:

1. `合并前要改`
2. `需要你决定`
3. `可以后续做`
4. `这次不用改`

For each issue in the first three sections:

- Use a short heading that names the consequence, not an issue id, category label, or code term.
- Explain the concrete scenario, current behavior, and impact in two to five sentences.
- Give the smallest recommended action. Name an existing helper or dependency when it is the answer.
- Link `file:line` as supporting detail, not as the explanation.
- Cite the ticket id when one exists.
- Name reviewers only when disagreement, independent confirmation, or a missing reviewer materially changes confidence.

For `需要你决定`, state the options, their consequences, and your recommendation. Use this section only for a real product or architecture choice, not unresolved factual work.

For `这次不用改`, use one concise bullet per rejected or already-covered issue. State why no change is useful. Combine duplicate observations into the same bullet.

Use short Chinese sentences and the ubiquitous language from `CONTEXT.md`. Explain an unavoidable technical term the first time it appears. Do not expose internal review machinery such as reviewer categories, decision ladders, or shorthand codes.

Prefer a short paragraph plus `建议` and `位置` lines. Do not compress an issue into a ledger row.

Example shape:

```markdown
## 合并前要改

### 重试失败后会重复记账

任务已成功写入后，如果响应在网络中丢失，调用方会重试。当前代码会再次写入同一笔记录，导致结果翻倍。这个问题影响所有开启自动重试的调用方。

建议：复用现有的幂等键检查，在写入前识别同一次请求。

位置：`path/to/file.py:42`
```

End with one explicit recommendation: `可以合并`, `修改后合并`, or `先确认上述选择`.

Done when: the conclusion is understandable without reading the diff, every consolidated issue appears once, and the reader can act without decoding review terminology.
