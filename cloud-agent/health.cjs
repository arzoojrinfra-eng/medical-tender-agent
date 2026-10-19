'use strict';
const fs=require('node:fs'),path=require('node:path');const f=path.join(__dirname,'data','last-run.json');if(!fs.existsSync(f)){console.error('No completed run');process.exit(1)}const s=JSON.parse(fs.readFileSync(f));console.log(JSON.stringify(s,null,2));const age=Date.now()-new Date(s.finished).getTime();if(!s.ok||age>25*60000)process.exit(2);
