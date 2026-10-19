'use strict';
const fs=require('node:fs'),path=require('node:path'),config=require('./config.json'),{tomorrowStart,reportStart,dayKey}=require('./util.cjs');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'data','records.json'),'utf8')).records;
const allStrict=data.filter(x=>x.classification==='medical'),allReview=data.filter(x=>x.classification==='review'),cutoff=tomorrowStart(),start=reportStart(config.reportStartDate),strict=allStrict.filter(x=>new Date(x.publishDate)>=start),review=allReview.filter(x=>new Date(x.publishDate)>=start);
const excluded=new Set(['GEM/2026/B/8104071','GEM/2026/B/8177535','GEM/2026/B/8177700','GEM/2026/B/8175296','GEM/2026/B/8177795','GEM/2026/B/8177509','GEM/2026/B/8168804','GEM/2026/B/8172904']);
const keys=new Set(),duplicates=[];for(const x of strict){const k=`${x.sourceGroup||x.source}|${x.id}`;if(keys.has(k))duplicates.push(k);keys.add(k)}
const states=Object.fromEntries(config.states.map(s=>[s,strict.filter(x=>x.state===s).length]));
const invalidSource=strict.filter(x=>!/^https:\/\//i.test(x.url||''));
const blankCity=strict.filter(x=>!String(x.city||'').trim());
const guessedCity=strict.filter(x=>/^statewide/i.test(x.city||''));
const badCity=/^(?:Kendra|Dutta|PANDIT|other|BENGAL|the|FOR|MGM|GBP|Government|of Assam)$/i;
const suspiciousCity=strict.filter(x=>badCity.test(String(x.city||'').trim()));
const expired=strict.filter(x=>new Date(x.dueDate)<cutoff);
const workbook=path.resolve(__dirname,config.outputFile),bytes=fs.statSync(workbook).size;
const result={verifiedAt:new Date().toISOString(),cutoff:cutoff.toISOString(),reportStart:start.toISOString(),active:data.length,allActiveStrictMedical:allStrict.length,allActiveNeedsReview:allReview.length,strictMedical:strict.length,needsReview:review.length,noExpired:expired.length===0,expired:expired.length,blankCity:blankCity.length,guessedCity:guessedCity.length,suspiciousCity:suspiciousCity.map(x=>({id:x.id,city:x.city})),invalidSourceUrl:invalidSource.length,duplicateKeys:duplicates,userExcludedStillIncluded:strict.filter(x=>excluded.has(x.id)).map(x=>x.id),todayPublished:strict.filter(x=>dayKey(new Date(x.publishDate))===dayKey()).length,states,allRequestedStatesCovered:Object.values(states).every(Boolean),workbook,workbookBytes:bytes,selfTest:'run separately'};
const failures=[];if(!result.noExpired)failures.push('expired');if(result.blankCity)failures.push('blankCity');if(result.guessedCity)failures.push('guessedCity');if(result.suspiciousCity.length)failures.push('suspiciousCity');if(result.invalidSourceUrl)failures.push('invalidSourceUrl');if(result.duplicateKeys.length)failures.push('duplicates');if(result.userExcludedStillIncluded.length)failures.push('userExclusions');if(bytes<1000)failures.push('workbook');
fs.writeFileSync(path.join(__dirname,'data','validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failures.length){console.error('Validation failed: '+failures.join(', '));process.exitCode=1}
