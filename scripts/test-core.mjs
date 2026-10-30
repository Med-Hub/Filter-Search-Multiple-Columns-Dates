import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const local = path.join(root, 'node_modules/typescript/bin/tsc');
function run(command, args) {
    const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
    if (result.error) { console.error(result.error.message); process.exit(1); }
    if (result.status !== 0) process.exit(result.status || 1);
}
rmSync(path.join(root, '.core-build'), { recursive: true, force: true });
if (existsSync(local)) run(process.execPath, [local, '-p', 'tsconfig.core.json']);
else run(process.platform === 'win32' ? 'tsc.cmd' : 'tsc', ['-p', 'tsconfig.core.json']);
const tests = readdirSync(path.join(root, 'tests')).filter(p => p.endsWith('.test.cjs')).map(p => path.join(root, 'tests', p));
run(process.execPath, ['--test', ...tests]);
