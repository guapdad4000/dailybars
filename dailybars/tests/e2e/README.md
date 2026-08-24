# Visual regression snapshots

The `visual-regression.spec.js` suite captures the stable editorial surfaces at
both configured Playwright sizes:

- `desktop`: Desktop Chrome (1280 × 720)
- `mobile`: Pixel 5 (393 × 851)

It covers sign-in (including focus), feed, archive, favorites, crates, the
Scratch Lab premium gate, Syndicate, plus offline, loading, and the premium
prompt states. Supabase requests are mocked, so snapshots are repeatable and
do not depend on account or community data.

## Run locally

From `dailybars/`:

```bash
npm run test:e2e -- visual-regression.spec.js
```

To intentionally accept a reviewed visual change:

```bash
npx playwright test visual-regression.spec.js --update-snapshots
```

## Review threshold

Every screenshot assertion allows at most **1% changed pixels** (`maxDiffPixelRatio:
0.01`). A failed assertion is a release blocker until the image diff is
reviewed. Review the HTML report and `test-results/` diff artifacts, then update
baselines only when the change is intentional:

```bash
npx playwright show-report
```

Baselines are stored under `tests/e2e/visual-regression.spec.js-snapshots/` and
should be committed with the code change that explains them. The suite disables
animations and waits for fonts to load to avoid timing noise.