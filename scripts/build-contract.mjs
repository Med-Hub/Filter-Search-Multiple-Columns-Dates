/** Offline checks shared by configure, doctor and the real SDK build.
 * These checks do NOT replace SDK compilation, security audit or host tests.
 */
import {readFile, readdir, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
export function validEmail(value) {
    if (typeof value !== 'string' || value.length > 254 || value !== value.trim()) return false;
    const parts=value.split('@');
    if(parts.length!==2 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(parts[0]) || !parts[0] || parts[0].startsWith('.') || parts[0].endsWith('.') || parts[0].includes('..'))return false;
    const domain=parts[1].toLowerCase();
    return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain) &&
        !/(^|\.)(invalid|example|test|localhost)$/.test(domain) && !/(^|\.)example\.(com|org|net)$/.test(domain);
}
export function compatibleNode(version) {
    const match=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
    return !!match && (+match[1]>22 || (+match[1]===22 && +match[2]>=16));
}
export function validateMetadata(pkg, visual, icon, {requireEmail=true}={}) {
    const problems=[];
    if(!pkg || !visual?.visual || !visual.author || !visual.assets)return ['Missing package/visual metadata.'];
    if(requireEmail&&!validEmail(visual.author.email))problems.push('Set your actual publisher email; placeholder/test addresses are not accepted.');
    if(visual.author.email&&!validEmail(visual.author.email))problems.push('The configured publisher email is invalid.');
    if(pkg.dependencies?.['powerbi-visuals-api']!==visual.apiVersion)problems.push('API version differs between package.json and pbiviz.json.');
    if(!/^\d+\.\d+\.\d+$/.test(pkg.version)||visual.visual.version!==pkg.version+'.0')problems.push('Package and visual release versions must agree (x.y.z and x.y.z.0).');
    if(visual.visual.guid!=='fieldFindScope6F2E2BC419F64B839AFD02C06EFD2148')problems.push('FieldFind GUID changed; keep the existing visual identity for updates.');
    if(visual.visual.visualClassName!=='Visual')problems.push('The visual class must match the exported Visual class.');
    for(const field of ['name','displayName','description'])if(typeof visual.visual[field]!=='string'||!visual.visual[field].trim())problems.push('Missing visual '+field+'.');
    try{const url=new URL(visual.visual.supportUrl);if(url.protocol!=='https:'||url.username||url.password)throw Error();}catch{problems.push('Support URL must be a valid HTTPS URL without credentials.');}
    if(visual.externalJS!==null)problems.push('External JavaScript is not permitted in this prototype.');
    if(!Buffer.isBuffer(icon)||icon.length<24||!icon.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||icon.subarray(12,16).toString()!=='IHDR'||icon.readUInt32BE(16)!==20||icon.readUInt32BE(20)!==20)problems.push('The visual icon must be a 20 × 20 PNG.');
    return [...new Set(problems)];
}
export async function readProject(root) {
    const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
    const visual=JSON.parse(await readFile(path.join(root,'pbiviz.json'),'utf8'));
    // Do not follow metadata paths outside this project.
    const iconPath=path.resolve(root,visual.assets?.icon||'assets/icon.png');
    const relative=path.relative(root,iconPath);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Icon path must stay within the project.');
    return {pkg,visual,icon:await readFile(iconPath)};
}
export async function inspectArtifacts(root) {
    const folder=path.join(root,'dist');let names;
    try{names=await readdir(folder);}catch(error){if(error.code==='ENOENT')return [];throw error;}
    const files=[];
    for(const name of names.filter(n=>n.endsWith('.pbiviz')).sort()) {
        const file=path.join(folder,name),info=await stat(file);if(!info.isFile())continue;
        const bytes=await readFile(file);
        files.push({name,size:info.size,mtimeMs:info.mtimeMs,sha256:createHash('sha256').update(bytes).digest('hex'),zipHeader:bytes.length>=4&&bytes.readUInt32LE(0)===0x04034b50});
    }
    return files;
}
/** Freshness/header evidence only. A ZIP signature is NOT full SDK validation. */
export function newArtifacts(before,after) {
    const old=new Map(before.map(item=>[item.name,item]));
    return after.filter(item=>{
        const prior=old.get(item.name);
        return item.zipHeader&&item.size>32&&(!prior||prior.sha256!==item.sha256||prior.mtimeMs!==item.mtimeMs);
    });
}
