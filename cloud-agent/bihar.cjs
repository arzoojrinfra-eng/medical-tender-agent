'use strict';
const {browser,sleep}=require('../browser-lib.cjs');
async function collect(){
  const b=await browser(9261,'cloud-agent/chrome-bihar');
  try{
    await b.navigate('https://eproc2.bihar.gov.in/EPSV2Web/');
    let ready=false;
    for(let i=0;i<20;i++){
      ready=await b.evaluate(`!!(window.angular&&document.querySelector('[ng-controller="LoginDiv"]')&&angular.element(document.querySelector('[ng-controller="LoginDiv"]')).scope())`);
      if(ready)break;
      await sleep(500);
    }
    if(!ready)throw Error('Bihar landing page controller did not load');
    await b.evaluate(`angular.element(document.querySelector('[ng-controller="LoginDiv"]')).scope().goToTenderList('latestTenders')`);
    let list=[];
    for(let i=0;i<45;i++){
      await sleep(1000);
      list=await b.evaluate(`(()=>{const e=document.querySelector('[ng-controller="openareaTenderList"]');if(!e||!window.angular)return [];const s=angular.element(e).scope();return s&&s.tenderList||[]})()`);
      if(list.length)break;
    }
    if(!list.length)throw Error('Bihar active tender list was empty/unavailable');
    return {records:list.map(x=>({source:'Bihar eProc 2.0',sourceGroup:'Bihar eProc 2.0',id:String(x.currenttenderrefno||x.currenttenderid),title:x.currentdescription||'',quantity:'See tender',publishDate:x.currentTenderPublishDate,dueDate:x.currentbidEndDate,organization:`Department ${x.currentdeptid||''} / Organisation ${x.currentorgid||''}`,city:'Not stated on source',state:'Bihar',emd:'See tender document',estimatedValue:'Not disclosed',preBid:'See tender document',url:'https://eproc2.bihar.gov.in/EPSV2Web/',raw:x})),status:[{state:'Bihar',ok:true,count:list.length}],complete:true};
  }finally{await b.close()}
}
module.exports={collect};
