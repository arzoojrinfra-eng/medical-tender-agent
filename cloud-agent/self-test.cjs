'use strict';
const assert=require('node:assert'),fs=require('node:fs'),path=require('node:path'),{classify}=require('./classifier.cjs'),{make}=require('./report.cjs'),{inferCity}=require('./util.cjs');
const cases=[
 [{id:'x',title:'Rate contract and supply of medical equipment',organization:''},'medical'],
 [{id:'x',title:'Supply of CT Scan with ancillary civil works',organization:''},'medical'],
 [{id:'x',title:'Multi energy X-ray baggage scanner',organization:''},'exclude'],
 [{id:'x',title:'Road from medicine shop to post office',organization:''},'exclude'],
 [{id:'x',title:'Construction of electrical panel room at hospital',organization:''},'review'],
 [{id:'x',title:'Laboratory equipment for dairy milk testing',organization:''},'review'],
 [{id:'x',title:'Facility Management Service Healthcare Housekeeping Cleaning',organization:''},'review'],
 [{id:'x',title:'Bio Medical Waste Management Service',organization:''},'medical'],
 [{id:'GEM/2026/B/8177535',title:'Oxygen Concentrator',organization:''},'exclude']
];
for(const [record,want] of cases)assert.equal(classify(record).class,want,record.title);
const cityCases=[
 ['Supply at BADURIA RH under Public Private Partnerships','West Bengal','BADURIA RH'],
 ['Medical equipment at Burdwan Medical College and Hospital','West Bengal','Burdwan'],
 ['Sagore Dutta Hospital Kamarhati','West Bengal','Kamarhati'],
 ['MGM Medical College Jamshedpur','Jharkhand','Jamshedpur'],
 ['Hospital equipment at AGMC GBP Hospital Complex Agartala Tripura','Tripura','Agartala'],
 ['NORTH BENGAL MEDICAL COLLEGE','West Bengal','Not stated on source'],
 ['SAMBHU NATH PANDIT HOSPITAL','West Bengal','Not stated on source'],
 ['Sericulture Activities in two Aspirational District of Assam','Assam','Not stated on source']
];
for(const [value,state,want] of cityCases)assert.equal(inferCity(value,state),want,value);
fs.mkdirSync(path.join(__dirname,'data'),{recursive:true});const temp=path.join(__dirname,'data','self-test.xlsx'),base={source:'test',sourceGroup:'test',quantity:'1',organization:'Hospital',city:'Patna',state:'Bihar',emd:'',estimatedValue:'',preBid:'',url:'https://example.com',classificationReason:'test',dueDate:'2026-12-01T10:00:00Z'};make([{...base,id:'new',title:'Drug',publishDate:'2026-10-19T01:00:00Z'},{...base,id:'old',title:'Drug',publishDate:'2026-10-18T01:00:00Z'}],[],[],temp);const bytes=fs.readFileSync(temp).toString('latin1');assert(bytes.indexOf('19.10.26')<bytes.indexOf('18.10.26'),'date tabs are not newest-first');
const calls=[];global.fetch=async(url,opt={})=>{calls.push({url:String(url),opt});if(String(url).endsWith('/token'))return new Response(JSON.stringify({access_token:'test-token'}),{status:200,headers:{'Content-Type':'application/json'}});if(String(url).endsWith('/email'))return new Response('agent@example.iam.gserviceaccount.com',{status:200});if(String(url).includes('?fields=sheets.properties'))return new Response(JSON.stringify({sheets:[{properties:{title:'01.01.26',sheetId:1,gridProperties:{rowCount:1000,columnCount:26}}},{properties:{title:'Agent Status',sheetId:2,gridProperties:{rowCount:10,columnCount:26}}}]}),{status:200,headers:{'Content-Type':'application/json'}});return new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}})};
async function googleTest(){const {sync}=require('./google.cjs'),sheets=[{name:'19.10.26',rows:[['A'],['B']]},{name:'Agent Status',rows:Array.from({length:25},(_,i)=>[i])}],result=await sync({spreadsheetId:'sheet-id',sheets,xlsxFile:temp,excelDriveFileId:'excel-id'});assert(result.ok);assert.equal(result.deletedOldDateTabs,1);const mutation=JSON.parse(calls.find(x=>x.url.includes(':batchUpdate')).opt.body).requests;assert(mutation.some(x=>x.deleteSheet?.sheetId===1));assert(mutation.some(x=>x.addSheet?.properties?.title==='19.10.26'));assert(calls.some(x=>x.url.includes('values:batchClear')));assert(calls.some(x=>x.url.includes('values:batchUpdate')));assert(calls.some(x=>x.url.includes('upload/drive')));console.log(JSON.stringify({ok:true,classifierCases:cases.length,cityCases:cityCases.length,googleApiCalls:calls.length,deletedOldDateTabs:result.deletedOldDateTabs,reportOrder:'newest-first'},null,2))}
googleTest().catch(e=>{console.error(e);process.exitCode=1});
