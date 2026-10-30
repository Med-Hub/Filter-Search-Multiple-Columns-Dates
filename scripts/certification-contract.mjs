/** Build-time validation only. Does not grant Microsoft certification or runtime access. */
const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
export const equivalent = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
function version(text) {
    const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(String(text));
    return match ? { parts: match.slice(1, 4).map(Number), prerelease: !!match[4] } : null;
}
function compareParts(a, b) { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; return 0; }
export function knownDependencyFindings(lock) {
    const findings = [];
    for (const [location, entry] of Object.entries(lock?.packages || {})) {
        const name = /(?:^|\/)node_modules\/(braces|uuid)$/.exec(location)?.[1];
        if (!name) continue;
        const parsed = version(entry?.version);
        if (!parsed) { findings.push({ package: name, version: entry?.version ?? null, location, advisory: null, reason: 'Cannot safely assess this dependency version.' }); continue; }
        const [major, minor, patch] = parsed.parts;
        const affected = name === 'braces'
            ? compareParts(parsed.parts, [3, 0, 3]) <= 0
            : compareParts(parsed.parts, [11, 1, 1]) < 0 ||
              ((major === 11 && minor === 1 && patch === 1) && parsed.prerelease) ||
              ((major === 12 || major === 13) && minor === 0 && (patch === 0 || (patch === 1 && parsed.prerelease)));
        if (affected) findings.push({ package: name, version: entry.version, location,
            advisory: name === 'braces' ? 'GHSA-vfj7-8cjw-p6xm' : 'GHSA-w5hq-g745-h8pq',
            reason: name === 'braces' ? 'Affected range <=3.0.3; no patched release in the advisory reviewed on 2026-10-14.' : 'Version falls within a reviewed affected range.' });
    }
    return findings;
}
export function inspectCertificationInputs(pkg, visual, lock, targets) {
    const blockers = [];
    if (visual?.apiVersion !== targets?.apiVersion || pkg?.dependencies?.['powerbi-visuals-api'] !== targets?.apiVersion)
        blockers.push('The reviewed API migration to ' + targets?.apiVersion + ' is not complete.');
    if (targets?.toolsVersion && pkg?.devDependencies?.['powerbi-visuals-tools'] !== targets.toolsVersion)
        blockers.push('The SDK tools version differs from the reviewed target.');
    if (!lock?.packages?.['']) blockers.push('Missing package-lock root.');
    if (lock?.packages?.['']?.version !== pkg?.version) blockers.push('Root version in package-lock does not match package.json.');
    for (const group of ['dependencies', 'devDependencies']) {
        if (!equivalent(lock?.packages?.['']?.[group] || {}, pkg?.[group] || {})) blockers.push('Root ' + group + ' in package-lock does not match package.json.');
        for (const [name, requested] of Object.entries(pkg?.[group] || {})) {
            const entry = lock?.packages?.['node_modules/' + name];
            if (!entry?.version || !entry.integrity) blockers.push('Missing version/integrity in lockfile for ' + name + '.');
            else if (version(requested) && entry.version !== requested) blockers.push('Exact dependency/lock mismatch: ' + name + '.');
        }
    }
    for (const name of ['typescript', 'eslint', 'eslint-plugin-powerbi-visuals']) {
        if (!pkg?.devDependencies?.[name] && !pkg?.dependencies?.[name]) blockers.push('Missing required explicit dependency: ' + name + '.');
    }
    if (!pkg?.scripts?.eslint) blockers.push('Missing required eslint script.');
    const dependencies = knownDependencyFindings(lock);
    for (const item of dependencies) blockers.push(item.location + '@' + item.version + ': ' + (item.advisory || item.reason));
    return { kind: 'Offline precheck; NOT a live audit, install, build or certification', blockers, dependencies, readyForReleasePipeline: blockers.length === 0 };
}
export function auditAssessment(exitCode, stdout) {
    let report;
    try { report = JSON.parse(stdout); } catch { return { passed: false, reason: 'npm audit did not return parseable JSON; no clean result.', counts: null }; }
    if (report.error) return { passed: false, reason: 'npm audit endpoint or command error; no clean result.', counts: null };
    const counts = report.metadata?.vulnerabilities;
    if (!counts || ['moderate', 'high', 'critical'].some(key => !Number.isSafeInteger(counts[key]) || counts[key] < 0))
        return { passed: false, reason: 'Missing or malformed vulnerability counts; no clean result.', counts: counts ?? null };
    const passed = exitCode === 0 && counts.moderate === 0 && counts.high === 0 && counts.critical === 0;
    return { passed, reason: passed ? 'Full audit reports no moderate/high/critical findings.' : 'Full audit failed or found moderate/high/critical findings.', counts };
}
export function releaseReady(steps, required) { return required.every(name => steps.find(step => step.name === name)?.status === 'passed'); }
