> **Update 15 October 2026:** the source now has a scoped `sockjs@0.3.24 -> uuid@11.1.1` candidate with npm-resolved integrity metadata. Installed compatibility is still unverified. The unresolved escalation is primarily `braces@3.0.3`; do not report that UUID 8.3.2 remains in the current lock. See [TOOLCHAIN_0.6.2.md](TOOLCHAIN_0.6.2.md).

# SDK dependency blocker — maintainer/Microsoft draft

**Draft only; not sent or posted.** Reviewed 14 October 2026 against the existing lock and public advisories. No successful live npm audit was possible here.

Suggested title: `Certification build blocked by braces and uuid in powerbi-visuals-tools development-server dependency chain`

We are preparing a TypeScript/React Power BI custom visual for optional certification. Our current locked tool is powerbi-visuals-tools 7.2.1. The dependency tree contains braces 3.0.3 and uuid 8.3.2 through the development-server chain. The visual itself requests no external privileges and does not make these server calls in the browser, but the certification requirements call for a full npm audit without moderate/high findings.

Paths observed in the current lock:

```text
powerbi-visuals-tools -> webpack-dev-server -> chokidar -> braces
powerbi-visuals-tools -> webpack-dev-server -> http-proxy-middleware -> micromatch -> braces
powerbi-visuals-tools -> webpack-dev-server -> sockjs -> uuid
```

Advisories reviewed:

- GHSA-vfj7-8cjw-p6xm: braces <=3.0.3, high, no patched version listed on review date.
- GHSA-w5hq-g745-h8pq: uuid <11.1.1, and separate 12.0.0/13.0.0 affected ranges, moderate. Patched releases are listed but a major override must be compatibility-tested against consumers.

Is there a supported tooling release or reviewed dependency-chain patch that preserves packaging/development-server compatibility and satisfies the full audit? We are not suppressing the advisory, excluding development dependencies, renaming packages, or accepting a suggested downgrade to an obsolete SDK solely to obtain a clean report.

Before sending, append the newly captured full `npm audit --include=dev --json` output and `npm explain braces` / `npm explain uuid`, the exact package-lock hash, operating system, Node/npm versions and SDK command output from the connected run. If a newer upstream release resolves the chain, verify it through npm, inspect the diff, run build/typecheck/lint/host tests, and update this draft rather than repeating stale findings.

No ordinary version-only upgrade is being claimed as a braces fix. Any custom source patch must preserve provenance, have regression/security tests, be reviewable, and be disclosed; it may still require explicit reviewer acceptance and does not automatically make npm's advisory disappear.

Sources:
https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
https://github.com/advisories/GHSA-w5hq-g745-h8pq
https://learn.microsoft.com/en-us/power-bi/developer/visuals/power-bi-custom-visuals-certified
