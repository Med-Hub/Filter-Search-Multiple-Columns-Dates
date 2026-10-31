> **Current status — 31 October 2026:** see [validated 0.6.2 build repairs](BUILD_REPAIR_0.6.2.md). Older status statements below are historical. GitHub access is configured; source is present; installed checks and engineering packaging now pass. Release licensing and real-host validation remain outstanding.

# Repository handoff

Target: https://github.com/Med-Hub/Filter-Search-Multiple-Columns-Dates

The active GitHub connection was rechecked on 15 October 2026: repository contents are empty; pull access is available and push access is false. The files were prepared locally; nothing has been uploaded or run remotely.

## Upload with your own authorised Git account

The separate `Filter_Search_0.6.2_Handoff.bundle` contains all source files, including hidden `.github` and `.gitignore`, and two local preparation commits on `main`. It is an optional alternative to extracting/uploading the source ZIP. Do not upload the bundle as a single file to the repository expecting GitHub to extract it.

In a NEW working folder, with Git installed and your GitHub account authorised:

```sh
git clone Filter_Search_0.6.2_Handoff.bundle FilterSearch
cd FilterSearch
git remote set-url origin https://github.com/Med-Hub/Filter-Search-Multiple-Columns-Dates.git
git push -u origin main
```

This uses a normal push, never `--force`. If the remote is no longer empty, stop and reconcile its changes rather than overwrite them. Do not send personal access tokens, passwords or tax records in chat or commit them. Grant the relevant GitHub app/account the needed repository permissions through GitHub settings.

The ZIP alternative contains the same clean source in `FilterSearch/`. Put its CONTENTS at the repository root. Before installation, run `node scripts/verify-source.mjs` to check the full inventory.

## First cloud run

Actions → **Filter & Search certification checks** → Run workflow:
- Mode: **sdk-test** when you need an engineering package/compiler results before licensing/security release gates are resolved; **diagnose** for checks only.
- resolve_api: **false**. The new API is already resolved in the committed inputs.

The workflow is manual, does not publish or change repository files, and retains diagnostics. A successful engineering compilation is not a clean certification run. Known security or licensing blockers leave diagnostics red. Any produced test file is clearly labelled NOT FOR APPSOURCE.

Once real dependency/security/API compatibility issues are resolved and the Service ID configured, use the normal release checks from a frozen lowercase `certification` branch. That branch has deliberately NOT been created or called ready in this handoff.
