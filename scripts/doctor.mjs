/** Offline, data-free environment report. No package install or external calls. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compatibleNode,readProject,validateMetadata} from './build-contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try {
    const {pkg,visual,icon}=await readProject(root);
    const issues=validateMetadata(pkg,visual,icon);
    if(!compatibleNode(process.versions.node))issues.push('Node 22.16.0 or a newer compatible version is needed.');
    const dependencies=[];
    for(const [name,expected] of Object.entries({...pkg.dependencies,...pkg.devDependencies})) {
        let installed=null;
        try{installed=JSON.parse(await readFile(path.join(root,'node_modules',name,'package.json'),'utf8')).version;}catch{}
        dependencies.push({name,expected,installed,status:installed===expected?'present':installed?'version-mismatch':'missing'});
    }
    const missing=dependencies.filter(item=>item.status!=='present');
    if(missing.length)issues.push(`${missing.length} SDK/build dependencies are missing or do not match their pins.`);
    const hasLock=existsSync(path.join(root,'package-lock.json'));
    const report={version:pkg.version,generatedAt:new Date().toISOString(),node:process.versions.node,platform:process.platform,architecture:process.arch,networkChecked:false,publisherEmailConfigured:!!visual.author.email,issues,lockfile:hasLock?'present, review required':'absent; first successful install must create it',dependencies,sdkBuild:'not run by this diagnostic',powerBiHostTests:'not run',marketplaceSubmission:'not run'};
    await mkdir(path.join(root,'build-logs'),{recursive:true});
    await writeFile(path.join(root,'build-logs/diagnostics.json'),JSON.stringify(report,null,2)+'\n');
    console.log(`FieldFind ${pkg.version} — offline build check`);
    for(const issue of issues)console.log('BLOCKER: '+issue);
    if(!issues.length)console.log('Local preflight passed. Run the real SDK build next; no package is claimed here.');
    console.log('Report: build-logs/diagnostics.json (no email, dataset, keys or search text included)');
    process.exitCode=issues.length?1:0;
} catch(error){console.error('DIAGNOSTIC FAILED: '+error.message);process.exitCode=1;}
