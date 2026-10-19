'use strict';
const HEADERS=['ACTION','STATUS','ORIGINAL TENDER','CHECKLIST & ANNEXURES'];
const text=v=>v&&typeof v==='object'?String(v.value??''):String(v??'');
const isTender=s=>text(s.rows?.[0]?.[1])==='TENDER / BID NO.';
const key=(id,url)=>{const u=new URL(url);if(u.protocol!=='https:'||!(/\.(gov|nic)\.in$/i.test(u.hostname)))throw Error('Invalid official tender URL');return u.hostname.toLowerCase()+'|'+String(id).trim()};
const urlFor=row=>text(row[12]).match(/https:\/\/\S+/)?.[0]||'';
const a1=name=>`'${String(name).replaceAll("'","''")}'`;

function reconcile(records,views){
 const byKey=new Map(),newRows=[];
 for(const old of records){const r=Array.from({length:8},(_,i)=>old[i]??'');r[0]=key(r[1],r[4]);if(byKey.has(r[0]))throw Error('Duplicate tender identity in persistent queue');byKey.set(r[0],r)}
 for(const rows of views){if(text(rows[0]?.[1])!=='TENDER / BID NO.')continue;for(const row of rows.slice(1)){if(row[13]!=='Prepare Checklist'||!row[1])continue;const url=row[15]||urlFor(row);if(!url)continue;const k=key(row[1],url);if(!byKey.has(k)){const r=[k,row[1],'Prepare Checklist','Queued',url,'',new Date().toISOString(),''];byKey.set(k,r);newRows.push(r)}}}
 return {byKey,newRows};
}

async function prepare(token,base,meta,sheets,request){
 if(!meta.sheets.some(s=>s.properties.title==='Tender Actions'))return {sheets,enabled:false};
 const response=await request(token,base+'/values/'+encodeURIComponent("'Tender Actions'!A1:H10000"));
 const values=response.values||[];if(values[0]?.[0]!=='KEY'||values[0]?.[2]!=='ACTION')throw Error('Persistent tender queue schema changed');
 const views=[];
 for(const s of meta.sheets){const p=s.properties;if(p.title==='Tender Actions'||p.gridProperties?.columnCount<14)continue;const v=await request(token,base+'/values/'+encodeURIComponent(a1(p.title)+'!A1:Q'+p.gridProperties.rowCount));views.push(v.values||[])}
 const {byKey,newRows}=reconcile(values.slice(1).filter(r=>r.some(x=>x!=='')),views);
 if(newRows.length)await request(token,base+'/values/'+encodeURIComponent("'Tender Actions'!A:H")+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({values:newRows})});
 const enriched=sheets.map(s=>{if(!isTender(s))return s;return {...s,rows:s.rows.map((row,i)=>{const next=row.slice(0,13);while(next.length<13)next.push('');if(!i)return [...next,...HEADERS];const url=urlFor(row),r=url?byKey.get(key(text(row[1]),url)):null;return [...next,...(r?[r[2],r[3],r[4],r[5]]:['','Not requested',url,''])]})}});
 return {sheets:enriched,enabled:true};
}

async function format(token,base,sheets,request){
 const meta=await request(token,base+'?fields=sheets.properties'),requests=[];
 for(const s of sheets.filter(isTender)){
  const p=meta.sheets.find(x=>x.properties.title===s.name)?.properties;if(!p)continue;const sid=p.sheetId,end=p.gridProperties.rowCount;
  requests.push({setDataValidation:{range:{sheetId:sid,startRowIndex:1,endRowIndex:end,startColumnIndex:13,endColumnIndex:14},rule:{condition:{type:'ONE_OF_LIST',values:[{userEnteredValue:'Prepare Checklist'}]},strict:true,showCustomUi:true}}});
  requests.push({copyPaste:{source:{sheetId:sid,startRowIndex:0,endRowIndex:1,startColumnIndex:12,endColumnIndex:13},destination:{sheetId:sid,startRowIndex:0,endRowIndex:1,startColumnIndex:13,endColumnIndex:17},pasteType:'PASTE_FORMAT'}});
  requests.push({updateDimensionProperties:{range:{sheetId:sid,dimension:'COLUMNS',startIndex:13,endIndex:17},properties:{pixelSize:240},fields:'pixelSize'}});
 }
 if(requests.length)await request(token,base+':batchUpdate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests})});
}
module.exports={prepare,format,reconcile,key};
