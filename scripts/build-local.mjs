/** LOCAL SDK build only. Does not publish or create a remote repository.
 * Installs pinned public dependencies, records each stage and calls Microsoft's
 * packager. It never disguises the browser preview as a .pbiviz file.
 */
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync,createWriteStream} from 'node:fs';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validEmail,compatibleNode,readProject,validateMetadata,inspectArtifacts,newArtifacts} from './build-contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),logDir=path.join(root,'build-logs');
const npm=process.platform==='win32'?'npm.cmd':'npm';
const report={version:null,startedAt:new Date().toISOString(),node:process.versions.node,steps:[],result:'not-started',artifacts:[],powerBiHostVerified:false};
let logsReady=false;
function run(argv,label,logName) {
    console.log('\n> '+label);
    return new Promise((resolve,reject)=>{
        const step={name:label,status:'running'};report.steps.push(step);
        const log=createWriteStream(path.join(logDir,logName));
        const child=spawn(npm,argv,{cwd:root,stdio:['ignore','pipe','pipe'],shell:process.platform==='win32'});
        // Windows shell receives only fixed npm command arguments, never publisher input.
        child.stdout.on('data',chunk=>{stdout.write(chunk);log.write(chunk);});
        child.stderr.on('data',chunk=>{process.stderr.write(chunk);log.write(chunk);});
        child.once('error',error=>{step.status='failed';step.error=error.message;log.end(()=>reject(error));});
        child.once('close',code=>{
            if(step.status==='failed')return;
            step.exitCode=code;step.status=code===0?'passed':'failed';
            log.end(()=>code===0?resolve():reject(Error(label+' failed. See build-logs/'+logName+'.')));
        });
    });
}
async function main() {
    if(args.includes('--help')) {
        console.log('Usage: node scripts/build-local.mjs [--email YOUR_REAL_COMPANY_EMAIL]\nUse node scripts/doctor.mjs for an offline build check.\nRequires Node >=22.16, npm and registry access. Each build stage is logged.\nHigh/critical audit issues stop the build. Never runs npm audit fix or publishes.');return;
    }
    if(args.length && !(args.length===2&&args[0]==='--email'))throw Error('Unknown/incomplete arguments. Run with --help.');
    await mkdir(logDir,{recursive:true});logsReady=true;
    if(!compatibleNode(process.versions.node))throw Error('Use Node 22.16.0 or a newer compatible version.');
    const {pkg,visual,icon}=await readProject(root);report.version=pkg.version;
    let email=args[0]==='--email'?args[1]:process.env.FIELDFIND_PUBLISHER_EMAIL||visual.author.email;
    if(!email&&stdin.isTTY) {
        const prompt=createInterface({input:stdin,output:stdout});
        try{email=(await prompt.question('Your actual publisher email (package metadata only): ')).trim();}finally{prompt.close();}
    }
    if(!validEmail(email))throw Error('Provide your actual publisher email with --email or npm run configure. Placeholder/test addresses are not accepted.');
    visual.author.email=email;
    const issues=validateMetadata(pkg,visual,icon);if(issues.length)throw Error(issues.join('\n'));
    await writeFile(path.join(root,'pbiviz.json'),JSON.stringify(visual,null,2)+'\n');
    const hadLock=existsSync(path.join(root,'package-lock.json'));
    report.result='building';report.installMode=hadLock?'npm ci':'first npm install';
    await run([hadLock?'ci':'install','--no-fund','--no-audit','--fetch-retries=1','--fetch-timeout=20000'],'Install pinned SDK dependencies','01-install.log');
    if(!hadLock)console.log('Review and preserve the new package-lock.json. Subsequent runs use npm ci.');
    await run(['audit','--audit-level=high'],'Audit installed dependencies','02-audit.log');
    const before=await inspectArtifacts(root);
    await run(['run','package'],'SDK typecheck, automated tests and official pbiviz package','03-package.log');
    const fresh=newArtifacts(before,await inspectArtifacts(root));
    if(!fresh.length)throw Error('No new or rewritten .pbiviz ZIP was produced. An old dist file is not counted as a successful build.');
    report.artifacts=fresh;report.result='sdk-package-produced';
    console.log('\nSDK output:\n'+fresh.map(item=>'  dist/'+item.name+'\n  SHA-256: '+item.sha256).join('\n'));
    console.log('Next: synthetic Desktop/Service checks in docs/HOST_TEST_CHECKLIST.md. SDK output is not host or marketplace approval.');
}
try{await main();}
catch(error){report.result='blocked';report.error=error.message;console.error('\nBUILD STOPPED: '+error.message);process.exitCode=1;}
finally{
    if(logsReady){report.finishedAt=new Date().toISOString();await writeFile(path.join(logDir,'build-summary.json'),JSON.stringify(report,null,2)+'\n');console.log('Build report: build-logs/build-summary.json');}
}
