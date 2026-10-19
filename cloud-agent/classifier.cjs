'use strict';
const excludedIds=new Set(['GEM/2026/B/8104071','GEM/2026/B/8177535','GEM/2026/B/8177700','GEM/2026/B/8175296','GEM/2026/B/8177795','GEM/2026/B/8177509','GEM/2026/B/8168804','GEM/2026/B/8172904']);
const direct = /\b(?:medicine|medicines|drug|drugs|pharma(?:ceutical)?|surgical|surgery|hospital equipment|medical (?:equipment|device|devices|consumable|consumables|supply|supplies|gas|gases)|diagnostic|diagnostics|pathology|radiology|x[- ]?ray|ultrasound|mri|ct scan|ecg|eeg|ventilator|oxygen concentrator|anaesthesia|anesthesia|dialysis|endoscopy|laparoscopy|ophthalmic|dental|orthopaedic|orthopedic|prosthe(?:sis|tic)|implant|stent|catheter|cannula|syringe|(?:hypodermic|biopsy|injection|suture|spinal) needle|bandage|gauze|(?:surgical|examination|medical) gloves?|ppe kit|(?:surgical|medical|face|n95) masks?|sanitizer|disinfectant|reagent|vaccine|blood bank|ambulance|patient monitor|icu|nicu|hospital bed|wheelchair|stretcher|glucometer|haemoglobin|hemoglobin|biomedical|bio[- ]medical|jan aushadhi|janaushadhi|pmjay|ayushman|healthcare)\b/i;
const lab = /\b(?:laboratory|lab equipment|microscope|centrifuge|incubator|autoclave|spectrophotometer|chromatograph|analy[sz]er|biosafety|microbiology|biochemistry|serology|pcr|elisa)\b/i;
const healthBuyer = /\b(?:health(?: and family welfare)?|medical college|hospital|dispensary|pharmacy|drug control|nursing|aiims|esic|cancer institute|ayush|nhm|national health mission|bihar medical services|bmsicl)\b/i;
const hardNegative = /\b(?:road|bridge|drain|building construction|civil work|electrical work|water supply|irrigation|embankment|boundary wall|painting|repair of quarter|school laboratory|engineering laboratory|soil testing|public health engineering|phed|pipeline|sewerage|sanitation work|vehicle hiring|security service|housekeeping)\b/i;
const nonClinicalLab = /\b(?:dairy|milk|food|agriculture|agricultural|soil|water quality|environment|engineering|school|college laboratory|petroleum|cement)\b/i;
const contextualNegative = /\b(?:baggage (?:inspection|scanner)|library books?|purchase of books?|vehicle spares?|automotive|wiper motor|head lamp|fuel filter|oil filter|needle bearing|air cylinder|tyres?|toilet cleaner|toilet cleaning|broom|floor cleaner|room freshener|dishwash|binder clip|ball point pen|stationery|wood works|tile works|false ceiling|roofing works|canteen|food supply|compound wall|upvc (?:bath )?room door|hand railing|prefabricated structure|galvalume sheet|pcc hollow block|(?:turbo air|steel|roof) ventilator|bituminous pavement|fire extinguisher|electrical panel|air conditioner units?)\b/i;
const infrastructureNegative = /\b(?:road|bridge|drain|pavement|water supply|irrigation|embankment|boundary wall|public health engineering|phed|pipeline|sewerage)\b/i;
const mixedScope = /\b(?:patrol team|stage and decoration|hiring of bus|refreshment|barakhana|t shirts?|gifts for veterans|dumbbells?|gym equipment|fitness equipment)\b/i;
const supportService = /\b(?:facility management|housekeeping|cleaning, sanitation|general cleaning|sweeping, mopping|manpower outsourcing|security manpower|security service|laundry service)\b/i;
const healthFacility = /\b(?:hospital|medical college|health centre|health center|phc|chc|mch|medicine building|radiology building|blood bank|cancer care|orthopedic building|ophthalmology|microbiology|mri building)\b/i;
const constructionWork = /\b(?:construction|repair|repairing|renovation|maintenance|electrical|civil|sanitary|plumbing)\b/i;
const nonClinicalChemical = /\b(?:calibration standard|trace metal grade|water testing|bod\b|silver nitrate|sodium thiosulphate|chemical and reagent|laboratory reagent rack)\b/i;

function classify(record) {
  if(excludedIds.has(String(record.id||'')))return {class:'exclude',reason:'user-reviewed exclusion'};
  const title = String(record.title || record.item || '');
  const buyer = String(record.organization || record.buyer || '');
  const all = title + ' ' + buyer;
  if (healthFacility.test(title) && constructionWork.test(title)) return {class: 'review', reason: 'health facility construction/repair/maintenance'};
  if (contextualNegative.test(title)) return {class: 'exclude', reason: 'medical keyword occurs in a non-medical product context'};
  if (infrastructureNegative.test(title)) return {class: 'exclude', reason: 'non-medical infrastructure work'};
  if (mixedScope.test(title)) return {class: 'review', reason: 'mixed procurement includes medical and non-medical items'};
  if (supportService.test(title)) return {class: 'review', reason: 'healthcare support service; confirm business scope'};
  if (nonClinicalChemical.test(title)) return {class: 'review', reason: 'chemical/laboratory context is not proven clinical'};
  if (lab.test(title) && nonClinicalLab.test(all)) return {class: 'review', reason: 'laboratory scope may be non-clinical'};
  if (lab.test(title) && !healthBuyer.test(buyer)) return {class: 'review', reason: 'laboratory scope lacks a verified healthcare buyer'};
  if (direct.test(title)) return {class: 'medical', reason: 'direct medical product/service term'};
  if (hardNegative.test(title)) return {class: 'exclude', reason: 'non-medical works/service'};
  if (lab.test(title) && healthBuyer.test(buyer)) return {class: 'medical', reason: 'health buyer plus laboratory scope'};
  if (lab.test(title)) return {class: 'review', reason: 'laboratory scope requires clinical confirmation'};
  if (/\bmedical\b/i.test(title)) return {class: 'review', reason: 'generic medical reference; scope requires confirmation'};
  if (healthBuyer.test(buyer)) return {class: 'review', reason: 'health buyer; scope needs review'};
  return {class: 'exclude', reason: 'no strong medical evidence'};
}
module.exports={classify,excludedIds};
