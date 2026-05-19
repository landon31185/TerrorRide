# Terror Ride — Project-Specific Claude Instructions

## Before Starting Any Session

Run this once per session to ensure you're on the right branch:

```bash
git fetch origin && \
git branch -a && \
echo "✅ Run: git checkout claude/finish-pages-design-SJzou" && \
echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"
```

## Key Context

- **Live site:** terror-ride.vercel.app (deployed from `claude/finish-pages-design-SJzou` branch)
- **Local master:** old skeleton (322 lines CSS, not deployed)
- **Real codebase:** on `origin/claude/finish-pages-design-SJzou` (2565 lines CSS, all pages)
- **Workflow:** Feature branch → push → PR → merge to master → Vercel auto-deploys

## CSS Work Pattern

When working on CSS (motion, layout, etc):

1. **Audit first** — use css-motion or css-steward skill
2. **Plan changes** — create plan with exact file locations, durations, values
3. **Edit CSS** — batch all related edits together
4. **Verify** — `git diff` to check all changes
5. **Commit** — descriptive message with what + why
6. **Push** — to feature branch
7. **Create PR** — same session while context is fresh

## Skills Available

- **css-motion** — animation timing, performance, easing, View Transitions
- **css-steward** — CSS architecture, specificity, accessibility, anti-patterns
- Use both for major CSS work (motion handles timing, steward validates structure)

## Git Workflow

```bash
# Branch is always: claude/finish-pages-design-SJzou
# After push, check Vercel deployment (deploys automatically)
# When ready: create PR with gh pr create
# Template: -title "..." -body "## Summary\n- Change 1\n- Change 2"
```

## Multi-Session Coordination

When running parallel Claude sessions on the same branch:

### Role Assignment
- **Coordinator session:** Owns git operations — `git pull`, conflict resolution, PR creation, merge to master
- **Feature sessions:** Implementation only — edit files, commit locally, push to branch
- **Benefit:** Eliminates rebase conflicts; one session handles incoming changes, others stay focused

### Before Starting (Feature Session)
```bash
git fetch origin
git status  # confirm branch is up to date with remote
# If behind, ask coordinator to pull + push first
```

### If Remote Changes While You're Working
- **Do NOT** `git pull --rebase` yourself in a feature session
- **Instead:** Coordinator pulls, resolves conflicts, pushes to remote
- Feature session pulls after coordinator signals "remote is clean"
- Reason: Merge conflict resolution (especially in CSS files) is easier in one session with full context

### File Segmentation (Optional, for Large Files)
When multiple sessions edit the same file (e.g., `styles.css`):
- Pre-define sections: "Lines 1–150: tokens/typography", "Lines 500–1200: components"
- Each session owns its section
- Reduces conflict surface area significantly
- Document in this file which session owns which section

### Last Session to Touch the Feature Branch
That session creates the PR (not coordinator). Reason: full context on all changes is fresh in memory.

---

## Last Known State

- **Last session:** 2026-05-18 (typography fixes: responsive scaling, baseline rhythm, tokens. PR #91 merged.)
- **Typography tokens:** Added to :root (--font-size-*, --line-height-*)
- **Body baseline:** 16px font-size, 1.6 line-height (WCAG compliant)
- **H1/H2/H3:** Converted to fluid clamp() formulas for responsive scaling
- **9px text:** Bumped to 11px (UI accessibility minimum)
- **Motion tokens (prev):** --dur-*, --ease-* in :root
- **Pulse animations:** Switched from box-shadow to transform:scale + opacity
- **View Transitions:** Synced durations (280ms/280ms)

## Next Time

When you start Terror Ride work:
1. Check this file first (you're reading it now ✓)
2. Run the git setup command above
3. Check if you need css-motion or css-steward
4. Reference the plan/edit/commit pattern
