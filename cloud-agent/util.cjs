'use strict';
const fs=require('node:fs'),path=require('node:path');
const IST=330*60000;
const first=v=>Array.isArray(v)?v[0]:v??'';
function localParts(d=new Date()){const x=new Date(d.getTime()+IST);return {y:x.getUTCFullYear(),m:x.getUTCMonth()+1,d:x.getUTCDate(),hh:x.getUTCHours(),mm:x.getUTCMinutes()}}
function dayKey(d=new Date()){const p=localParts(d);return `${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`}
function tomorrowStart(now=new Date()){const p=localParts(now);return new Date(Date.UTC(p.y,p.m-1,p.d+1)-IST)}
function reportStart(value){const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)throw Error('reportStartDate must be YYYY-MM-DD');return new Date(Date.UTC(+m[1],+m[2]-1,+m[3])-IST)}
function parseDate(v){if(v==null||v==='')return null;if(typeof v==='number')return new Date(v);const s=String(v).trim();let m=s.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);if(m){const mon={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11}[m[2].toLowerCase()];return new Date(Date.UTC(+m[3],mon,+m[1],+(m[4]||0),+(m[5]||0))-IST)}m=s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);if(m)return new Date(Date.UTC(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0))-IST);const d=new Date(s);return isNaN(d)?null:d}
function displayDate(v){const d=parseDate(v);if(!d)return String(v||'');const p=localParts(d);return `${String(p.d).padStart(2,'0')}-${String(p.m).padStart(2,'0')}-${p.y} ${String(p.hh).padStart(2,'0')}:${String(p.mm).padStart(2,'0')} IST`}
function tabName(v){const d=parseDate(v);if(!d)return 'Unknown Date';const p=localParts(d);return `${String(p.d).padStart(2,'0')}.${String(p.m).padStart(2,'0')}.${String(p.y).slice(-2)}`}
function writeJson(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2));fs.renameSync(tmp,file)}
const PLACE_NAMES={
  'West Bengal':['Alipurduar','Bankura','Birbhum','Cooch Behar','Dakshin Dinajpur','Darjeeling','Hooghly','Howrah','Jalpaiguri','Jhargram','Kalimpong','Kolkata','Malda','Murshidabad','Nadia','North 24 Parganas','Paschim Bardhaman','Paschim Medinipur','Purba Bardhaman','Purba Medinipur','Purulia','South 24 Parganas','Uttar Dinajpur','Asansol','Bardhaman','Basirhat','Burdwan','Chandannagar','Durgapur','Haldia','Kalyani','Kamarhati','Kharagpur','Mathabhanga','Midnapore','Siliguri','Tufanganj'],
  'Odisha':['Angul','Balangir','Balasore','Bargarh','Bhadrak','Bhubaneswar','Boudh','Cuttack','Deogarh','Dhenkanal','Gajapati','Ganjam','Jagatsinghpur','Jajpur','Jharsuguda','Kalahandi','Kandhamal','Kendrapara','Kendujhar','Khordha','Koraput','Malkangiri','Mayurbhanj','Nabarangpur','Nayagarh','Nuapada','Puri','Rayagada','Rourkela','Sambalpur','Subarnapur','Sundargarh'],
  'Bihar':['Araria','Arwal','Aurangabad','Banka','Begusarai','Bhagalpur','Bhojpur','Buxar','Darbhanga','Gaya','Gopalganj','Jamui','Jehanabad','Kaimur','Katihar','Khagaria','Kishanganj','Lakhisarai','Madhepura','Madhubani','Munger','Muzaffarpur','Nalanda','Nawada','Patna','Purnia','Rohtas','Saharsa','Samastipur','Saran','Sheikhpura','Sheohar','Sitamarhi','Siwan','Supaul','Vaishali'],
  'Assam':['Baksa','Barpeta','Biswanath','Bongaigaon','Cachar','Charaideo','Chirang','Darrang','Dhemaji','Dhubri','Dibrugarh','Dima Hasao','Goalpara','Golaghat','Guwahati','Hailakandi','Hojai','Jorhat','Kamrup','Karbi Anglong','Karimganj','Kokrajhar','Lakhimpur','Majuli','Morigaon','Nagaon','Nalbari','Sivasagar','Sonitpur','Tinsukia','Udalguri'],
  'Jharkhand':['Bokaro','Chatra','Deoghar','Dhanbad','Dumka','Garhwa','Giridih','Godda','Gumla','Hazaribagh','Jamshedpur','Khunti','Koderma','Latehar','Lohardaga','Pakur','Palamu','Ramgarh','Ranchi','Sahibganj','Seraikela','Simdega','West Singhbhum'],
  'Arunachal Pradesh':['Aalo','Anjaw','Bomdila','Changlang','Daporijo','Itanagar','Khonsa','Longding','Namsai','Pasighat','Roing','Seppa','Tawang','Tezu','Yingkiong','Ziro'],
  'Manipur':['Bishnupur','Chandel','Churachandpur','Imphal','Jiribam','Kakching','Kamjong','Kangpokpi','Noney','Senapati','Tamenglong','Thoubal','Ukhrul'],
  'Meghalaya':['Baghmara','Jowai','Khliehriat','Nongpoh','Nongstoin','Resubelpara','Shillong','Tura','Williamnagar'],
  'Mizoram':['Aizawl','Champhai','Kolasib','Lawngtlai','Lunglei','Mamit','Saiha','Serchhip'],
  'Nagaland':['Chumoukedima','Dimapur','Kiphire','Kohima','Longleng','Mokokchung','Mon','Peren','Phek','Tuensang','Wokha','Zunheboto'],
  'Tripura':['Agartala','Ambassa','Belonia','Dharmanagar','Kailashahar','Khowai','Udaipur','West Tripura'],
  'Sikkim':['Gangtok','Gyalshing','Mangan','Namchi','Pakyong','Soreng']
};
function cleanLocation(v){return String(v||'').replace(/\s+/g,' ').replace(/^[\s:,-]+|[\s:,-]+$/g,'').trim()}
function inferCity(text,state){
  text=String(text||'').replace(/\s+/g,' ').trim();
  if(!text)return 'Not stated on source';
  const facility=text.match(/\bat\s+([A-Za-z0-9][A-Za-z0-9 .&'()\/-]{1,55}?\s(?:RH|BPHC|PHC|SDH|SGH|SSH|TCF))(?=\s*(?:,|under\b|$))/i);
  if(facility)return cleanLocation(facility[1]);
  const district=text.match(/\b(?:district(?:\s+of)?|dist\.)\s*[-:]?\s*([A-Za-z][A-Za-z ]{2,30}?)(?=\s*(?:,|;|\.|for\b|under\b|pin\b|$))/i);
  if(district){const value=cleanLocation(district[1]);if(!new RegExp(`^(?:the|state|${String(state||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})$`,'i').test(value))return value}
  const names=PLACE_NAMES[state]||[],lower=text.toLocaleLowerCase('en-IN');
  const hits=names.map(name=>({name,index:lower.search(new RegExp(`\\b${name.toLocaleLowerCase('en-IN').replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\ /g,'\\s+')}\\b`,'i'))})).filter(x=>x.index>=0).sort((a,b)=>a.index-b.index||b.name.length-a.name.length);
  return hits.length?hits[0].name:'Not stated on source';
}
module.exports={first,dayKey,tomorrowStart,reportStart,parseDate,displayDate,tabName,writeJson,inferCity};
