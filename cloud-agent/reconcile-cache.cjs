'use strict';
const fs=require('node:fs'),path=require('node:path'),{classify}=require('./classifier.cjs'),{enrichGem}=require('./enrich.cjs');
async function main(){const file=path.join(__dirname,'data','records.json'),db=JSON.parse(fs.readFileSync(file,'utf8')),records=db.records||[],gem=records.filter(x=>x.source==='GeM'&&classify(x).class!=='exclude');await enrichGem(gem);fs.writeFileSync(file,JSON.stringify({updated:new Date().toISOString(),records},null,2));console.log(JSON.stringify({records:records.length,gemReconciled:gem.length},null,2))}
main().catch(e=>{console.error(e);process.exitCode=1});
