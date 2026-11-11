/** Verify package/source correspondence before an SDK output can be delivered.
 * Pure checks: does not rewrite metadata or approve Microsoft certification.
 */
import {equivalent} from './certification-contract.mjs';
const requireThat=(condition,message)=>{if(!condition)throw Error(message);};
export function resourcePath(outer) {
    const resources=outer?.resources;
    requireThat(Array.isArray(resources),'Missing package resource table.');
    const entries=resources.filter(item=>item?.sourceType===5);
    requireThat(entries.length===1,'Expected exactly one visual resource.');
    const item=entries[0];
    requireThat(typeof item.file==='string'&&/^resources\/[A-Za-z0-9_.-]+\.pbiviz\.json$/.test(item.file),'Unsafe or unsupported visual resource path.');
    requireThat(typeof item.resourceId==='string'&&outer.metadata?.pbivizjson?.resourceId===item.resourceId,'Resource pointer does not match the visual.');
    return item.file;
}
export function validateArtifact({outer,resource,manifest,capabilities,packageVersion,expectedIcon}) {
    resourcePath(outer);
    requireThat(/^[1-9]\d*\.(0|[1-9]\d*)\.(0|[1-9]\d*)\.0$/.test(manifest?.visual?.version||''),'Marketplace visual version must use a nonzero major version without leading zeros.');
    requireThat(manifest?.visual?.version===packageVersion+'.0','Source package and visual versions differ.');
    requireThat(outer.version===manifest.visual.version,'Outer package version differs from source.');
    requireThat(equivalent(outer.visual,manifest.visual),'Outer visual metadata differs from source.');
    requireThat(equivalent(resource?.visual,manifest.visual),'Inner visual metadata differs from source.');
    requireThat(resource.apiVersion===manifest.apiVersion,'Packaged API differs from source.');
    requireThat(equivalent(outer.author,manifest.author)&&equivalent(resource.author,manifest.author),'Packaged publisher differs from source.');
    requireThat(equivalent(resource.capabilities,capabilities),'Packaged capabilities differ from source.');
    requireThat(Array.isArray(capabilities?.privileges)&&capabilities.privileges.length===0,'This product is reviewed without external privileges.');
    requireThat(Array.isArray(resource.externalJS)&&resource.externalJS.length===0,'External scripts are not allowed in this product.');
    requireThat(typeof resource.content?.js==='string'&&resource.content.js.trim().length>0,'Missing compiled visual JavaScript.');
    requireThat(typeof resource.content?.css==='string'&&resource.content.css.trim().length>0,'Missing compiled visual CSS.');
    requireThat(resource.content.iconBase64===expectedIcon,'Packaged icon differs from source.');
    return {version:manifest.visual.version,guid:manifest.visual.guid,apiVersion:manifest.apiVersion};
}
