# matt-skills

Private extras for Kip Yin.

Root extras are **global** (Lightmind and Lighthouse both install them via `install.sh`):

- `show-me`
- `talk-normal`
- `ultra-review`
- `humanizer-zh`
- `explain-diff-html`

`lighthouse/` holds **Lighthouse-only** project skills. Install those with `install-lighthouse.sh` (do not add them to the default `EXTRAS` list in `install.sh`).

Official Matt Pocock skills are **not** stored here. They are installed at runtime with:

```
npx skills@latest add mattpocock/skills
```

That command installs the **25-skill Mattpocock Skills group**, not the General group.

`install.sh` does two things:

1. Installs those 25 official skills globally for Cursor (`npx … --global --agent cursor --yes --copy`, one `--skill` flag per name).
2. Copies the five global extras from this repo into `~/.cursor/skills`.

**Do not make this repo public.**
