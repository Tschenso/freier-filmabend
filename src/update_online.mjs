import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {collect, DATA_PATH} from './collect_free_catalog.mjs';
import {validateCatalogue} from './validate_catalogue.mjs';

const SITE='https://freier-filmabend.jens-jung95.chatgpt.site';
async function jsonResponse(url,options={},limit=4500000){
  const response=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error('HTTP '+response.status+' from '+new URL(url).hostname);
  const reader=response.body.getReader(),parts=[];let bytes=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit)throw Error('Response too large');parts.push(Buffer.from(value));}}finally{await reader.cancel();}
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}

async function main(){
  if(process.env.GITHUB_EVENT_NAME==='schedule'&&new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',hourCycle:'h23'}).format(new Date())!=='06'){
    console.log('Winter-/Sommerzeit-Zweitlauf: kein Update erforderlich.');return;
  }
  if(process.env.GITHUB_REPOSITORY!=='Tschenso/freier-filmabend'||process.env.GITHUB_REF!=='refs/heads/main'||!['schedule','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME))throw Error('Only the configured GitHub workflow may upload.');
  const previous=await jsonResponse(SITE+'/api/catalogue');validateCatalogue(previous);
  await fs.mkdir(new URL('../data/',import.meta.url),{recursive:true});
  await fs.writeFile(DATA_PATH,JSON.stringify(previous));
  const next=await collect({persist:false});validateCatalogue(next);
  if(next.records.length<100||next.records.length>5000||next.records.length<previous.records.length*.6)throw Error('Unexpected catalogue loss; no upload.');
  const body=JSON.stringify(next);if(Buffer.byteLength(body)>4500000)throw Error('Catalogue too large; no upload.');
  const oidcURL=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
  if(oidcURL.protocol!=='https:'||!oidcURL.hostname.endsWith('.actions.githubusercontent.com'))throw Error('Unexpected GitHub identity endpoint.');
  oidcURL.searchParams.set('audience',SITE);
  const {value:token}=await jsonResponse(oidcURL,{headers:{authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}},20000);
  if(typeof token!=='string'||token.length>16000)throw Error('Missing GitHub identity.');
  const uploaded=await jsonResponse(SITE+'/api/catalogue',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body});
  const hash=createHash('sha256').update(body).digest('hex');
  if(uploaded.dataSHA256!==hash)throw Error('Upload hash mismatch.');
  const status=await jsonResponse(SITE+'/api/status');
  if(status.storage!=='cloud'||status.updatedAt!==next.fetchedAt||status.titles!==next.records.length||Object.values(status.providers).some(count=>count<1)||Object.keys(status.providers).length!==7)throw Error('Public readback mismatch.');
  console.log(JSON.stringify({status:'passed',site:SITE,...status,dataSHA256:hash},null,2));
  if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,'### Online-Katalog geprüft\n\nDatenstand: '+status.updatedAt+' · '+status.titles+' Titel · alle sieben Anbieter. Upload-Hash und öffentlicher Readback stimmen überein.\n');
}
main().catch(error=>{console.error('Update fehlgeschlagen. '+error.message);process.exitCode=1;});
