# Command output

Command output here is condensed to save tokens, keeping every signal and
dropping costly noise. Treat it as the complete result: run commands
normally, and batch related commands into one call to avoid extra turns.
Truncated results state their recovery path in their own output. Re-run a
command as `rtk bypass <cmd>` only when its result is unusable: empty when
output was clearly expected, contradicting its exit code, or garbled.

# Tests

Run all tests on instabox.

# Issues and pull requests

When submitting an issue or pull request, use `/ste` and write the title and
body in Chinese. Use `/pr-writing` for pull request descriptions.
