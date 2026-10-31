# GitHub workflow and repository status

Repository: https://github.com/Med-Hub/Filter-Search-Multiple-Columns-Dates

Source is present and the Med-Hub connection has successfully updated [draft PR #1](https://github.com/Med-Hub/Filter-Search-Multiple-Columns-Dates/pull/1), on `fix/0.6.2-build-validation`. Earlier empty-repository/upload instructions are obsolete. Do not re-upload old bundles over current work.

Pull requests to main now automatically run the engineering validation workflow. [Run 41242898447](https://github.com/Med-Hub/Filter-Search-Multiple-Columns-Dates/actions/runs/41242898447) passed at commit `33bf297ef2162df8565db1471183a8884f8c849b`; check the latest run for subsequent commits.

The workflow checks the source inventory before installation, collects independent diagnostics, builds the marked engineering package, runs Chromium checks against that exact binary and verifies the package checksum before uploading it. Repository contents permission is read-only. No secrets, publication, branch merge or license assignment is part of the workflow.

Manual workflow inputs are `diagnose`, `sdk-test`, and `release`; keep `resolve_api=false` unless deliberately reviewing an API upgrade. GitHub requires a workflow with manual dispatch to exist on the default branch before it can be dispatched normally. Automatic PR checks work on the current draft without merging it.

Release mode requires a reviewed lowercase `certification` branch. Create that branch only after the package, real-host acceptance and source are ready to freeze together. It has not been created as part of this preparation.

Keep tokens and account documents out of source. Preserve both connected GitHub accounts. No integration removal or permission expansion is required by the current workflow.
