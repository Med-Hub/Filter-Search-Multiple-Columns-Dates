/** Collect every available independent check, even when another check fails.
 * No npm fixes/overrides, no fake Service ID, no repository writes or publication.
 * The --offline path deliberately exits nonzero: it CANNOT establish readiness.
 */
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {auditAssessment, releaseReady} from './certification-contract.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2),allowed=new Set(['--offline','--install','--package']);
if(args.some(x=>!allowed.has(x))||new Set(args).size!==args.length||args.includes('--offline')&&(args.includes('--install')||args.includes('--package')))
    throw Error('Usage: node scripts/collect-certification.mjs [--offline | --install] [--package]');
const offline=args.includes('--offline'),build=args.includes('--package');
const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid;
const out=path.join(root,'build-logs','certification',stamp);mkdirSync(out,{recursive:true});
const digest=p=>createHash('sha256').update(readFileSync(path.join(root,p))).digest('hex');
const report={preparationRevision:3,productVersion:JSON.parse(readFileSync(path.join(root,'package.json'),'utf8')).version,
    startedAt:new Date().toISOString(),finishedAt:null,node:process.versions.node,offline,
    sourceCommit:null,sourceTreeClean:null,steps:[],packageProduced:false,certificationReady:false,
    desktopTested:false,serviceTested:false,liveLicensingTested:false,fullAuditPassed:false,buildReady:false,
    inputHashes:Object.fromEntries(['package.json','package-lock.json','pbiviz.json','config/licensing.json'].map(p=>[p,digest(p)]))};
const save=()=>writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
const npm=process.platform==='win32'?'npm.cmd':'npm';
const childEnv={...process.env,npm_config_fetch_retries:'0',npm_config_fetch_timeout:'15000',npm_config_fund:'false'};
const required=['locked-install','installed-toolchain','metadata','offline-precheck','licensing','lint','typecheck','core-tests','source-security','full-audit'];
let counter=0;
function skip(name,reason) { report.steps.push({name,status:'skipped',reason});save(); }
function run(name,command,commandArgs,timeout=120000) {
    const index=String(++counter).padStart(2,'0'),log=index+'-'+name+'.log';
    const step={name,status:'running',command:[command,...commandArgs],log};report.steps.push(step);save();
    console.log('> '+name);
    const result=spawnSync(command,commandArgs,{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024,timeout,
        env:childEnv,shell:process.platform==='win32'&&command===npm,windowsHide:true});
    writeFileSync(path.join(out,log),(result.stdout||'')+(result.stderr||'')+(result.error?'\n'+result.error.message:''));
    step.exitCode=result.status;step.signal=result.signal;step.status=result.status===0&&!result.error?'passed':'failed';
    if(result.error)step.error=result.error.message;
    console.log('  '+step.status+' ('+log+')');save();return {step,...result};
}
try {
    const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
    if(commit.status===0) {
        report.sourceCommit=commit.stdout.trim();
        const clean=spawnSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'});
        report.sourceTreeClean=clean.status===0&&!clean.stdout.trim();
    }
    if(args.includes('--install'))run('locked-install',npm,['ci','--include=dev','--no-audit','--no-fund'],360000);
    else skip('locked-install',offline?'Offline collection: fresh npm ci not attempted.':'Use --install to prove a fresh locked installation.');
    if(existsSync(path.join(root,'node_modules')))run('installed-toolchain',process.execPath,['scripts/check-installed-toolchain.mjs']);
    else skip('installed-toolchain','Real dependency packages have not been installed.');
    run('metadata',process.execPath,['scripts/check-metadata.mjs']);
    run('offline-precheck',process.execPath,['scripts/check-certification.mjs']);
    run('licensing',process.execPath,['scripts/check-licensing.mjs']);
    const local=p=>existsSync(path.join(root,'node_modules',p));
    if(local('eslint/bin/eslint.js'))run('lint',npm,['run','eslint']);else skip('lint','Locked ESLint dependencies not installed.');
    if(local('typescript/bin/tsc')&&local('powerbi-visuals-api/package.json'))run('typecheck',npm,['run','typecheck']);
    else skip('typecheck','Full locked compiler/API declarations not installed.');
    // test-core may use the global compiler for an explicitly OFFLINE check.
    if(local('typescript/bin/tsc')||offline)run('core-tests',npm,['test']);else skip('core-tests','Locked compiler unavailable.');
    if(local('typescript/bin/tsc')||offline)run('source-security',process.execPath,['scripts/cert-security.cjs']);else skip('source-security','AST compiler unavailable.');
    if(offline)skip('full-audit','No registry access attempted in offline mode; never count a skipped audit as clean.');
    else {
        const r=run('full-audit',npm,['audit','--include=dev','--audit-level=moderate','--json'],60000);
        const assessment=auditAssessment(r.status,r.stdout||'');r.step.assessment=assessment;
        r.step.status=assessment.passed?'passed':'failed';report.fullAuditPassed=assessment.passed;save();
    }
    report.buildReady=releaseReady(report.steps,required);
    if(build&&report.buildReady){
        const r=run('official-package',npm,['run','package'],300000);
        report.packageProduced=r.step.status==='passed';
        if(report.packageProduced)run('package-smoke',process.env.PYTHON||'python',['scripts/test-release-smoke.py'],120000);
    }else if(build)skip('official-package','Required checks are not all passed. No release file generated.');
    // Copy only explicitly listed review inputs, never npm credentials or user reports.
    const resolved=path.join(out,'review-inputs');mkdirSync(resolved,{recursive:true});
    for(const f of ['package.json','package-lock.json','pbiviz.json'])copyFileSync(path.join(root,f),path.join(resolved,f));
} finally {
    report.finishedAt=new Date().toISOString();save();
    const md=['# Certification build results','',`Product version: ${report.productVersion}. Preparation revision: 3.`,
        '', '| Check | Status |', '|---|---|',...report.steps.map(s=>`| ${s.name} | ${s.status} |`),
        '', '**This is not Microsoft certification.** A source/build check is not Desktop/Service or live-licensing validation.',
        '',report.buildReady?'Software prechecks passed. Complete package/browser and real-host checks before submission.':'BLOCKED: inspect failed/skipped checks. Do not submit a previous dist package as a new result.',
        '', 'The source and manifest files in review-inputs must be reviewed and committed before a release is frozen.'].join('\n');
    writeFileSync(path.join(out,'RESULTS.md'),md+'\n');
    console.log('Evidence: '+path.relative(root,out));
    if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,md+'\n',{flag:'a'});
    // A diagnostics run with blockers must be visibly unsuccessful, not green.
    if(!report.buildReady||build&&(!report.packageProduced||report.steps.find(s=>s.name==='package-smoke')?.status!=='passed'))process.exitCode=1;
}
