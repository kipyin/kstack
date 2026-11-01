---
name: instabox-snapshots
description: Use when the user wants to save an instabox box's state and load it later — "save a snapshot", "checkpoint this box", "restore/load from a snapshot", "start a new box from my setup", "clone this box". Covers instabox snapshot save/ls/files/rm, create --snapshot and fork.
metadata:
  installed-by: instabox
---

# instabox snapshots: save and load

A snapshot is a saved copy of a box's disks (root disk and `/data`), private to the account. Load it by creating a new box from it. Snapshots hold disks only: running processes and memory are not saved (use `instabox suspend` for that).

## Save

```sh
instabox snapshot save work --name work-ready --description "deps installed, repo cloned"
```

- A running box is saved live, without stopping it: the snapshot is `pending` in `instabox snapshot ls` until its disks finish uploading (`--no-wait` returns at once).
- Do not stop the box first: `stop` ends every process in it. A live snapshot is like a clean power cut: what is on disk is kept, what programs hold only in memory is not. Only if the server answers that this box must be stopped, or if a program must write its data to disk first (a database mid-write), run `instabox stop work`, save, then `instabox start work`.
- `--root-only` saves just the root disk (smaller; `/data` is not included).
- A disk snapshot includes credential files written by applications, tool sign-ins, and historical Vault files; a suspend snapshot can also retain credentials in process memory. Org Secrets reach the box only as placeholders, so a snapshot holds none of their values, but anything an app or a person wrote to disk is kept. Do not describe snapshots as credential-free. Review copied credentials and rotate upstream when required before sharing or retaining them.
- Pick names that say what is inside (`node20-playwright`, `api-db-seeded`); names must be unique among your snapshots.

## Load

```sh
instabox snapshot ls                                    # your snapshots: id, name, root/data size, source
instabox create --name work2 --snapshot work-ready
instabox exec work2 -- ls /data/home                    # same root disk and /data as when saved
```

`--snapshot` takes a snapshot name or its `sn_...` id.

## Look inside without starting anything

```sh
instabox snapshot files work-ready /etc                 # list a directory of the root disk
instabox snapshot files work-ready /etc/os-release      # print a text file
```

This reads the snapshot's root disk only; `/data` (and HOME) are not browsable here. To check files under `/data`, load the snapshot into a box and use `instabox exec`.

## Copy a box

`instabox fork` does it in one command: it saves a snapshot of the box, creates the new box (or `--count` up to 5, named `NAME-1` to `NAME-N`) from it with the same template and size, waits until it runs, then deletes the snapshot (also on error or Ctrl-C) unless `--keep-snapshot`. It is the same snapshot save + create, so it takes about as long; the source box is not changed.

```sh
instabox fork work --name work2
instabox fork work --name try --count 3 --json         # try-1, try-2, try-3
```

The same by hand, when you want the snapshot's name or the copy's create flags (`--secrets`, `--no-vault`, `--auto-suspend`):

```sh
instabox snapshot save work --name work-copy
instabox create --name work2 --snapshot work-copy
instabox snapshot rm --yes work-copy                    # optional; work2 is not affected
```

The copy gets a new sandbox identity and the Secret selection in its creation request. Without `--secrets` it keeps the existing Vault behavior and does not enroll in org Secrets; it does not inherit the source's selection. To give it neither store's credentials, use:

```sh
instabox create --name work2 --snapshot work-copy --no-vault --secrets none
```

To give the copy API credentials, name them with `--secrets NAME,NAME`. Placeholders copied from the source box do not work for the new one. New selections do not erase credentials that apps or people already wrote into files on the copied disks; review those before sharing the snapshot or the box.

## Clean up

```sh
instabox snapshot rm --yes work-ready
```

Snapshots count toward the account's snapshot and storage limits (`instabox usage`). Delete ones you no longer need.

## Typical agent loop

1. `instabox create --name job --snapshot <base>` (it pauses by itself after 30 idle minutes)
2. Work with `instabox exec job -- ...`
3. When the setup is worth keeping: `instabox snapshot save job --name <base>-v2` (no need to stop it)
4. `instabox rm --yes job` when done.
