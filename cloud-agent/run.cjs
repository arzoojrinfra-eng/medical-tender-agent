'use strict';
const fs=require('node:fs'),path=require('node:path');
const config=require('./config.json');
const {writeJson,tomorrowStart,inferCity}=require('./util.cjs');
const {classify}=require('./classifier.cjs');
const {enrichGem}=require('./enrich.cjs');
const {make,masterSheets}=require('./report.cjs');
const google=require('./google.cjs');
const root=__dirname,dataDir=path.join(root,'data'),lockFile=path.join(dataDir,'agent.lock'),dbFile=path.join(dataDir,'records.json'),statusFile=path.join(dataDir,'last-run.json');
fs.mkdirSync(dataDir,{recursive:true});
function lock(){if(fs.existsSync(lockFile)){const age=Date.now()-fs.statSync(lockFile).mtimeMs;let alive=false;try{const held=JSON.parse(fs.readFileSync(lockFile,'utf8'));if(Number.isInteger(held.pid)&&held.pid>0){process.kill(held.pid,0);alive=true}}catch{}if(alive&&age<45*60000)throw Error('Another agent run is active');fs.unlinkSync(lockFile)}fs.writeFileSync(lockFile,JSON.stringify({pid:process.pid,started:new Date().toISOString()}))}
async function main(){
 lock();const started=new Date(),statuses=[],fresh=[];let prior={records:[]};
 try{
  if(fs.existsSync(dbFile))prior=JSON.parse(fs.readFileSync(dbFile,'utf8'));
  const full=process.argv.includes('--full');
  const adapters=[
   ['GeM',()=>require('./gem.cjs').collect({lookbackDays:config.lookbackDays,full})],
   ['Bihar eProc 2.0',()=>require('./bihar.cjs').collect()],
   ['NIC state portals',()=>require('./nic.cjs').collect({cacheFile:path.resolve(root,config.stateCache),cacheMaxMinutes:config.stateCacheMaxMinutes,force:full,node:process.execPath})],
   ['Manipur eProcurement',()=>require('./manipur.cjs').collect()]
  ],succeeded=new Set();
  for(const [name,run] of adapters){try{const value=await run();fresh.push(...value.records);statuses.push(...value.status);if(value.complete)succeeded.add(name)}catch(e){statuses.push({source:name,ok:false,error:e?.message||String(e)})}}
  const kept=(prior.records||[]).filter(x=>!succeeded.has(x.sourceGroup||x.source)),merged=new Map();
  for(const x of [...kept,...fresh])merged.set(x.source+'|'+x.id,x);
  const cutoff=tomorrowStart(started),candidates=[];
  for(const x of merged.values()){const due=new Date(x.dueDate);if(isNaN(due)||due<cutoff)continue;x.state=config.states.find(s=>s.toLowerCase()===String(x.state).toLowerCase())||x.state;if(x.sourceGroup!=='GeM')x.city=inferCity(`${x.title||''} ${x.organization||''}`,x.state);else x.city=x.city||'Not stated on source';const c=classify(x);if(c.class!=='exclude')candidates.push(x)}
  await enrichGem(candidates.filter(x=>x.source==='GeM'));
  const medical=[],reviews=[],active=[];
  for(const x of merged.values()){const due=new Date(x.dueDate);if(isNaN(due)||due<cutoff)continue;x.state=config.states.find(s=>s.toLowerCase()===String(x.state).toLowerCase())||x.state;if(x.sourceGroup!=='GeM')x.city=inferCity(`${x.title||''} ${x.organization||''}`,x.state);else if(!x.city||/^Statewide/.test(x.city))x.city='Not stated on source';const c=classify(x);x.classification=c.class;x.classificationReason=c.reason;active.push(x);if(c.class==='medical')medical.push(x);else if(c.class==='review')reviews.push(x)}
  writeJson(dbFile,{updated:new Date().toISOString(),records:active});
  const output=path.resolve(root,config.outputFile),sheets=make(medical,reviews,statuses,output,active);
  const validation=require('node:child_process').spawnSync(process.execPath,[path.join(root,'validate.cjs')],{encoding:'utf8',maxBuffer:10*1024*1024});
  if(validation.status!==0)throw Error(`Pre-upload validation failed: ${validation.stderr||validation.stdout}`);
  let sync;
  try{const daily=await google.sync({spreadsheetId:config.spreadsheetId,sheets,xlsxFile:output,excelDriveFileId:process.env.EXCEL_DRIVE_FILE_ID||'1Zmv4LNd7q2Ot9sbJlWMYcgGzLTfVFPr1'}),master=await google.sync({spreadsheetId:config.masterSpreadsheetId,sheets:masterSheets(medical,reviews,statuses)});sync={ok:daily.ok&&master.ok,daily,master}}catch(e){sync={ok:false,error:e.message}}
  statuses.push({source:'Google Drive/Sheets',ok:!!sync.ok,error:sync.ok?undefined:(sync.error||sync.reason)});
  const summary={ok:statuses.every(x=>x.ok)&&!!sync.ok,started:started.toISOString(),finished:new Date().toISOString(),cutoff:cutoff.toISOString(),sources:statuses,counts:{fresh:fresh.length,active:active.length,medical:medical.length,review:reviews.length,excluded:active.length-medical.length-reviews.length},output,sync};
  writeJson(statusFile,summary);console.log(JSON.stringify(summary,null,2));if(!summary.ok)process.exitCode=2;
 }finally{try{fs.unlinkSync(lockFile)}catch{}}
}
main().catch(e=>{const failure={ok:false,finished:new Date().toISOString(),fatal:e.stack||e.message};writeJson(statusFile,failure);console.error(e);try{fs.unlinkSync(lockFile)}catch{}process.exitCode=1});
