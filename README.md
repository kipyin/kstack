# skills

Private Cursor skills for Kip Yin.

Official Matt Pocock skills are **not** stored here. They are installed at runtime with:

```
npx skills@latest add mattpocock/skills
```

That command installs the **25-skill Mattpocock Skills group**, not the General group.

## Layout

```
global/          # extras installed on every project
  show-me/
  talk-normal/
  ultra-review/
  humanizer-zh/
  explain-diff-html/
lighthouse/      # Lighthouse-only project skills
lightmind/       # Lightmind-only project skills (none yet)
install.sh
```

## Install

Clone this private repo (for example to `/tmp/skills`), then run `install.sh`.

`install.sh` always:

1. Installs those 25 official skills globally for Cursor (`npx … --global --agent cursor --yes --copy`, one `--skill` flag per name).
2. Copies every skill directory under `global/` into `~/.cursor/skills`.

Pass a project name to also copy that project's skill directories:

```
# Matt 25 + global extras only
bash /tmp/skills/install.sh
bash /tmp/skills/install.sh global

# Lighthouse (Clara): also copy lighthouse/*
bash /tmp/skills/install.sh lighthouse

# Lightmind: also copy lightmind/*
bash /tmp/skills/install.sh lightmind
```

Unknown project names fail. Do not add Lighthouse or Lightmind skills to `global/`.

**Do not make this repo public.**
