# Update Skill

Sync your Super Sandbox fork with the upstream template to get the latest improvements.

## Usage

```
User: "Check for Super Sandbox updates"
Agent: [reads this skill, checks upstream, shows diff]
```

## What It Does

1. **Check** - Fetches upstream and compares versions
2. **Show** - Displays what changed (new skills, bug fixes, etc.)
3. **Apply** - Merges updates while preserving your content

## Protected Content

The update skill preserves:

- `projects/*` - Your projects
- `*.local.*` - Local config files
- Custom sections in `AGENTS.md` marked with `<!-- CUSTOM -->`
- Environment files (`.env*`)

## Scripts

```bash
# Check for updates
./skills/update/scripts/check.sh

# Apply updates
./skills/update/scripts/apply.sh
```

## How It Works

```bash
# 1. Add upstream remote (one time)
git remote add upstream https://github.com/marofyi/cloud-agent-kit.git

# 2. Fetch upstream
git fetch upstream main

# 3. Compare
git diff HEAD...upstream/main --stat

# 4. Merge (preserving local content)
git merge upstream/main --no-commit
# Resolve any conflicts in protected files by keeping local version
git checkout --ours projects/
git add .
git commit -m "chore: sync with upstream super-sandbox"
```

## When to Update

- New skills are available
- Bug fixes in packages
- Improved documentation
- Security updates

## Conflict Resolution

If conflicts occur:

1. **projects/** - Always keep your version
2. **AGENTS.md** - Merge manually, keep custom sections
3. **skills/** - Usually take upstream version

## Version Tracking

Check `CHANGELOG.md` in upstream for release notes before updating.
