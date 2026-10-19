'use strict';
const fs=require('node:fs'),path=require('node:path');
const pdfjs=require('../pdfjs/package/legacy/build/pdf.js');
const cache=path.resolve(__dirname,'..','bid-documents');fs.mkdirSync(cache,{recursive:true});
const first=v=>Array.isArray(v)?v[0]:v??'',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const stateNames=['West Bengal','Odisha','Bihar','Assam','Jharkhand','Arunachal Pradesh','Manipur','Meghalaya','Mizoram','Nagaland','Tripura','Sikkim'];
const aliases={
 'West Bengal':/\b(?:Kolkata|Calcutta|Durgapur|Siliguri|Jalpaiguri|Darjeeling|Murshidabad|Bankura|Bardhaman|Medinipur)\b/i,
 Odisha:/\b(?:Bhubaneswar|Cuttack|Khurda|Angul|Jharsuguda|Sambalpur|Berhampur|Damanjodi)\b/i,
 Bihar:/\b(?:Patna|Gaya|Purnia|Motihari|Katihar|Gopalganj|Samastipur|Rohtas)\b/i,
 Assam:/\b(?:Guwahati|Kamrup|Darrang|Dhemaji|Jorhat|Dibrugarh|Silchar|Tezpur)\b/i,
 Jharkhand:/\b(?:Ranchi|Dhanbad|Deoghar|Godda|Pakur|Palamu|Jaduguda|Jamshedpur|Singhbhum)\b/i,
 'Arunachal Pradesh':/\b(?:Itanagar|Naharlagun|Tawang|Pasighat|Bomdila|Ziro)\b/i,
 Manipur:/\b(?:Imphal|Lamphelpat|Bishnupur|Thoubal|Churachandpur)\b/i,
 Meghalaya:/\b(?:Shillong|Tura|Prahari Nagar|Arai Mile)\b/i,
 Mizoram:/\b(?:Aizawl|Lunglei|Champhai)\b/i,
 Nagaland:/\b(?:Kohima|Dimapur|Mokokchung)\b/i,
 Tripura:/\b(?:Agartala|Salbagan|Shyamalibazar|Udaipur Tripura|Dharmanagar)\b/i,
 Sikkim:/\b(?:Gangtok|Namchi|Gyalshing)\b/i
};
function resolveState(record,info){const evidence=[...(info?.addresses||[]),info?.office||''].join(' '),found=[];for(const state of stateNames){const explicit=new RegExp('\\b'+state.replaceAll(' ','\\s+')+'\\b','i');if(explicit.test(evidence)||aliases[state].test(evidence))found.push(state)}if(found.length===1)return found[0];if(found.length>1)return 'Multiple: '+found.join(' / ');const matched=(record.raw?.matchedStates||[]).map(x=>stateNames.find(s=>s.toUpperCase()===String(x).toUpperCase())).filter(Boolean);return matched.length===1?matched[0]:matched.length?'Multiple: '+matched.join(' / '):record.state}
async function gem(record){
 const raw=record.raw||{},id=String(first(raw.b_id)||''),file=path.join(cache,id+'.json');let info;
 if(id&&fs.existsSync(file)){try{info=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}}
 if(!info&&id){const type=Number(first(raw.b_bid_type)),route=type===5?'showdirectradocumentPdf':type===2?'showradocumentPdf':'showbidDocument',url='https://bidplus.gem.gov.in/'+route+'/'+id;try{
  const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('HTTP '+r.status);const data=new Uint8Array(await r.arrayBuffer());if(Buffer.from(data.subarray(0,5)).toString()!=='%PDF-')throw Error('not a PDF');const doc=await pdfjs.getDocument({data,disableFontFace:true,isEvalSupported:false,verbosity:0}).promise,pages=[];
  for(let p=1;p<=Math.min(doc.numPages,80);p++){const pg=await doc.getPage(p),tc=await pg.getTextContent();pages.push(tc.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join(''))}await doc.destroy();const clean=pages.join('\n').replace(/[ \t]+/g,' '),match=re=>clean.match(re)?.[1]?.trim()||'',at=clean.search(/Consignees\/Reporting Officer and Quantity/i),block=at>=0?clean.slice(at,at+6500):'',lines=block.split('\n'),addresses=[];lines.forEach((line,i)=>{if(/\b\d{6}\b/.test(line)&&addresses.length<10)addresses.push(lines.slice(i,i+3).join(' ').trim())});const emdBlock=clean.match(/EMD Detail([\s\S]{0,1600}?)(?:ePBG Detail|Bid splitting)/i)?.[1]||'';let emd=emdBlock.match(/EMD Amount\s*\(?INR\)?\s*([\d,.]+)/i)?.[1]||'';if(!emd&&/Required\s+No\b/i.test(emdBlock))emd='Not required';info={id,url,organisation:match(/\/Organisation Name\s+([^\n]+)/i),office:match(/\/Office Name\s+([^\n]+)/i),emd,estimated:match(/Estimated\s+(?:Bid\s+)?Value\s*\(?[A-Za-z]*\)?\s*([\d,.]+)/i),addresses,retrieved:new Date().toISOString(),error:''};fs.writeFileSync(file,JSON.stringify(info,null,2));await sleep(200)
 }catch(e){info={id,error:e.message,retrieved:new Date().toISOString()};fs.writeFileSync(file,JSON.stringify(info,null,2))}}
 if(info&&!info.error){record.organization=[info.organisation,info.office].filter(x=>x&&!/^\*+$/.test(x)).join(' / ')||record.organization;record.city=(info.addresses||[]).join(' | ')||'Not stated on source';record.state=resolveState(record,info);record.emd=info.emd||record.emd;record.estimatedValue=info.estimated||record.estimatedValue;record.url=info.url||record.url}else record.state=resolveState(record,info)
 return record
}
async function enrichGem(records){let i=0;async function worker(){while(i<records.length)await gem(records[i++])}await Promise.all([worker(),worker(),worker()])}
module.exports={enrichGem,resolveState};
