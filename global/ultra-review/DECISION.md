# Decision

Turn each verified issue into a recommendation the human can act on. Load the `ponytail` skill and apply its decide sequence silently. The report names the response, not the sequence or its internal labels.

## Existing work

List open and planned tickets using `docs/agents/issue-tracker.md` when it exists. Closed tickets are not future work. A ticket matches when it requests the same behavior or change. Cite matching ticket ids, but verify the issue independently; a ticket does not prove a review claim.

## Response

Put every consolidated issue into exactly one response:

- **Fix before merge**: The change introduces or preserves a verified correctness, security, data-loss, trust-boundary, or required-behavior problem.
- **Needs human decision**: The evidence is sound, but the right outcome depends on a product or architecture tradeoff that the code and written requirements do not settle. Give concrete options and recommend one.
- **Follow up**: The improvement has a concrete benefit, but this change remains safe and correct without it. Cite an existing ticket or recommend a tightly scoped follow-up.
- **No change**: The claim is incorrect, speculative, intentional, already handled, or not valuable enough to justify a change.

Reviewer agreement is supporting evidence only. Set the response from verified impact, not vote count.

Resolve factual reviewer conflicts by tracing the code and tests. If evidence remains incomplete, state the exact verification needed. Reserve **Needs human decision** for genuine choices; missing evidence is not a product decision.

For **Fix before merge** and **Follow up**, recommend the smallest correct implementation:

1. Name the existing repository helper or pattern when it already solves the problem.
2. Otherwise name the standard library, platform feature, or installed dependency that solves it.
3. Otherwise reduce the proposed change to the minimum correct fix.
4. Only then recommend new code.

Security, data-loss, and trust-boundary claims may become **No change** only when inspection disproves them or shows the boundary is already protected. Lack of a ticket is not a reason to dismiss them.

Done when: every issue has one response, one plain-language reason, supporting evidence, and the smallest recommended action when action is useful.
