/* Build-time-only AST checks/transform. Never bundled into the visual.
 * This is an additional static guard, NOT Microsoft's certification decision.
 * Raw HTML setters in vendor libraries are replaced with explicit exceptions;
 * we do not rename/obfuscate a dangerous call or claim to sanitise arbitrary HTML.
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
let ts;
try { ts = require('typescript'); }
catch { ts = require(path.join(cp.execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'typescript')); }

function propertyName(node) {
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteralLike(node.argumentExpression)) return node.argumentExpression.text;
    return undefined;
}
function isRawHtml(node) { return ['innerHTML', 'outerHTML'].includes(propertyName(node)); }
function parsed(code, file) {
    const kind = /\.tsx$/.test(file) ? ts.ScriptKind.TSX : /\.ts$/.test(file) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    const tree = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, kind);
    if (tree.parseDiagnostics.length) throw new Error(`Cannot parse ${file}: ${tree.parseDiagnostics[0].messageText}`);
    return tree;
}
function scan(code, file = 'bundle.js', { application = false } = {}) {
    const tree = parsed(code, file), findings = [];
    const add = (node, rule) => findings.push({ file, line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1, rule });
    function visit(n) {
        if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && isRawHtml(n.left)) add(n, 'raw-html-assignment');
        if (application && ts.isJsxAttribute(n) && n.name.getText(tree) === 'dangerouslySetInnerHTML') add(n, 'raw-html-jsx');
        if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
            const callee = n.expression;
            const name = ts.isIdentifier(callee) ? callee.text : propertyName(callee);
            if (['fetch','XMLHttpRequest','WebSocket','EventSource','eval','Function','execScript','sendBeacon','importScripts'].includes(name)) add(n, 'external-or-dynamic-execution');
            if (['write','writeln'].includes(name) && ts.isPropertyAccessExpression(callee) && callee.expression.getText(tree) === 'document') add(n, 'document-write');
            if (name === 'insertAdjacentHTML') add(n, 'raw-html-insertion');
            if (['setTimeout','setInterval','setImmediate','requestAnimationFrame'].includes(name) && n.arguments?.[0] && (ts.isStringLiteralLike(n.arguments[0]) || ts.isTemplateExpression(n.arguments[0]) || ts.isBinaryExpression(n.arguments[0]))) add(n, 'string-callback');
        }
        ts.forEachChild(n, visit);
    }
    visit(tree);
    return findings;
}
function hardenVendorHtml(code, file = 'bundle.js') {
    const tree = parsed(code, file), edits = [];
    function visit(n) {
        if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && isRawHtml(n.left)) {
            edits.push({ start: n.getStart(tree), end: n.getEnd(), line: tree.getLineAndCharacterOfPosition(n.getStart(tree)).line + 1, property: propertyName(n.left) });
            return; // The entire assignment is replaced, including its RHS.
        }
        ts.forEachChild(n, visit);
    }
    visit(tree);
    for (const e of [...edits].sort((a,b) => b.start - a.start)) {
        code = code.slice(0,e.start) + '(()=>{throw new Error("Filter & Search does not support raw HTML rendering.");})()' + code.slice(e.end);
    }
    // Parse again; never emit a syntactically invalid payload.
    parsed(code, file);
    const residual = scan(code, file);
    if (residual.length) throw new Error(`Forbidden calls remain in ${file}: ${JSON.stringify(residual)}`);
    return { code, edits, residual };
}
function scanApplication(root) {
    const findings = [];
    function walk(dir) {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory()) walk(p);
            else if (/\.(tsx?|jsx?)$/.test(ent.name)) findings.push(...scan(fs.readFileSync(p,'utf8'), path.relative(root,p), {application:true}));
        }
    }
    walk(path.join(root,'src'));
    return findings;
}
module.exports = { scan, scanApplication, hardenVendorHtml };
if (require.main === module) {
    const root = path.resolve(__dirname, '..'), findings = scanApplication(root);
    console.log(JSON.stringify({ check: 'Application AST security scan (not ESLint or certification)', findings }, null, 2));
    if (findings.length) process.exitCode = 1;
}
