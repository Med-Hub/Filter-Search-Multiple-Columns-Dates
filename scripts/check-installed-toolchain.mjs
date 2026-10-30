/** A real installed-tree check, not a substitute for npm ci, typecheck or audit.
 * No fallback to global dependencies and no network/listening server.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const here=createRequire(path.join(root,'package.json'));
const fail=message=>{throw Error(message);};
export function probeUuid(api, count=16) {
    if(typeof api?.v4!=='function'||typeof api.validate!=='function'||typeof api.version!=='function')fail('UUID CommonJS API is incompatible with the reviewed SockJS usage.');
    const seen=new Set();
    for(let i=0;i<count;i++){
        const value=api.v4();
        if(typeof value!=='string'||!api.validate(value)||api.version(value)!==4||seen.has(value))fail('UUID v4 compatibility probe failed.');
        seen.add(value);
    }
    return {generated:seen.size};
}
export function inspectInstalled() {
    const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
    const installed={};
    for(const [name,wanted] of Object.entries({...pkg.dependencies,...pkg.devDependencies})){
        const file=path.join(root,'node_modules',...name.split('/'),'package.json');
        if(!fs.existsSync(file))fail('Missing local dependency '+name+'. Run npm ci first.');
        const data=JSON.parse(fs.readFileSync(file,'utf8'));
        if(data.version!==wanted)fail(`${name}: installed ${data.version}, expected ${wanted}.`);
        installed[name]=data.version;
    }
    const apiDir=path.join(root,'node_modules/powerbi-visuals-api');
    for(const file of ['index.d.ts','schema.capabilities.json'])if(!fs.existsSync(path.join(apiDir,file)))fail('API package is incomplete: '+file);
    // Resolve exactly the SockJS selected by webpack-dev-server, not an arbitrary
    // top-level UUID. 0.3.24's transport uses require('uuid').v4() with no args.
    const tools=createRequire(here.resolve('powerbi-visuals-tools/package.json'));
    const server=createRequire(tools.resolve('webpack-dev-server/package.json'));
    const sockjsPath=server.resolve('sockjs/package.json');
    const sockjsRequire=createRequire(sockjsPath);
    const sockjsPkg=JSON.parse(fs.readFileSync(sockjsPath,'utf8'));
    const uuidPkg=sockjsRequire('uuid/package.json');
    if(sockjsPkg.version!=='0.3.24'||uuidPkg.version!=='11.1.1')fail('Scoped SockJS/UUID remediation needs review for these installed versions.');
    const probe=probeUuid(sockjsRequire('uuid'));
    const sockjs=server('sockjs');
    if(typeof sockjs.createServer!=='function'||!sockjs.createServer({log:()=>{}}))fail('SockJS server could not initialise with the overridden UUID dependency.');
    return {status:'passed',installed,sockjs:sockjsPkg.version,uuid:uuidPkg.version,uuidProbe:probe,
        fullAuditPerformed:false,powerBiHostTested:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
    try{if(process.argv.length!==2)fail('This command takes no arguments.');console.log(JSON.stringify(inspectInstalled(),null,2));}
    catch(error){console.error('INSTALLED TOOLCHAIN BLOCKED: '+error.message);process.exitCode=1;}
}
