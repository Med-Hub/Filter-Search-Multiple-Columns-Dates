import {readFile,writeFile} from 'node:fs/promises';
import {validEmail} from './build-contract.mjs';
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--email'||!validEmail(args[1])) {
    console.error('Usage: npm run configure -- --email YOUR_REAL_COMPANY_EMAIL');process.exitCode=1;
} else {
    const file=new URL('../pbiviz.json',import.meta.url);
    const metadata=JSON.parse(await readFile(file,'utf8'));
    metadata.author.email=args[1];
    await writeFile(file,JSON.stringify(metadata,null,2)+'\n');
    console.log('Publisher email set in local metadata. No email was sent and no account was changed.');
}
