const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chromePath=()=>process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'google-chrome');
exports.sleep=sleep;
exports.browser=async function(port,profile){
const profilePath=path.isAbsolute(profile)?profile:path.join(__dirname,profile);fs.mkdirSync(profilePath,{recursive:true});
const chrome=spawn(chromePath(),['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-port='+port,'--user-data-dir='+profilePath,'about:blank'],{windowsHide:true,stdio:'ignore'});
let targets;for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:'+port+'/json')).json();break}catch{await sleep(150)}}if(!targets)throw Error('Browser startup failed');const socket=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});let id=0;const pending=new Map();socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}});
const call=(method,params={},timeout=45000)=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error(method+' timed out'))},timeout);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}))});
const evaluate=async(expression,timeout)=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},timeout);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
async function navigate(url){const stop=setTimeout(()=>call('Page.stopLoading').catch(()=>{}),20000);try{await call('Page.navigate',{url},25000)}finally{clearTimeout(stop)}for(let i=0;i<30;i++){await sleep(300);if(await evaluate('document.readyState==="complete"'))break}await sleep(500)}
async function close(){try{await call('Browser.close',{},5000)}catch{}socket.close();chrome.kill()}
return{call,evaluate,navigate,close};
};
