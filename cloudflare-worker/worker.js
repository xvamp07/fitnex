// FITNEX AI scanner backend — deploy on YOUR Cloudflare Workers account.
// Requires Workers AI binding "AI" and one-time acceptance of Meta model license.
// Do not place Cloudflare API keys or credentials in this file or GitHub Pages.
// Note: a publicly reachable Worker may incur usage; configure abuse/rate limits and account budget.
const MODEL='@cf/meta/llama-3.2-11b-vision-instruct';
const ORIGIN='https://xvamp07.github.io';
function headers(origin){return {'Access-Control-Allow-Origin':origin===ORIGIN?ORIGIN:'null','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','Vary':'Origin'}}
function json(obj,status,origin){return new Response(JSON.stringify(obj),{status,headers:headers(origin)})}
function normalize(s){const arr=Array.isArray(s?.items)?s.items:[];return arr.slice(0,8).map(x=>({name:String(x?.name||'').trim().slice(0,85),grams:Number(x?.grams),kcal:Number(x?.kcal),protein:Number(x?.protein),carbs:Number(x?.carbs),fat:Number(x?.fat)})).filter(x=>x.name&&Number.isFinite(x.grams)&&x.grams>0&&x.grams<=20000&&['kcal','protein','carbs','fat'].every(k=>Number.isFinite(x[k])&&x[k]>=0&&x[k]<=(k==='kcal'?1000:100)))}
export default {
async fetch(request,env){
 const origin=request.headers.get('Origin')||'';
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
 if(request.method!=='POST')return json({error:'Metodo non supportato.'},405,origin);
 if(new URL(request.url).pathname!=='/scan')return json({error:'Percorso non trovato.'},404,origin);
 if(origin!==ORIGIN)return json({error:'Origine non autorizzata.'},403,origin);
 if(!env.AI)return json({error:'Manca il binding AI del Worker.'},503,origin);
 const len=Number(request.headers.get('content-length')||0);
 if(len>1600000)return json({error:'Immagine troppo grande.'},413,origin);
 let body;
 try{body=await request.json()}catch{return json({error:'JSON non valido.'},400,origin)}
 const image=body?.image;
 if(typeof image!=='string'||image.length>1400000||!/^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(image))return json({error:'Invia una foto JPEG compressa.'},400,origin);
 try{
 const output=await env.AI.run(MODEL,{
  messages:[
   {role:'system',content:'You identify food in images. Return only strict JSON, no markdown, no commentary. If not food, return {"items":[]}. All nutrition and weights are rough estimates; never claim certainty.'},
   {role:'user',content:'Inspect the plate. Split visible ingredients into up to 8 foods. Estimate edible grams and typical kcal/protein/carbs/fat PER 100 GRAMS for each. Return exactly: {"items":[{"name":"nome alimento in italiano","grams":150,"kcal":165,"protein":31,"carbs":0,"fat":3.6}]}. If mixed dishes cannot be separated, label as one dish. All fields numeric except name. Do not claim weight or nutrition are measured.'}
  ],
  image,
  temperature:0.1,
  max_tokens:720
 });
 const text=typeof output==='string'?output:typeof output?.response==='string'?output.response:typeof output?.result==='string'?output.result:JSON.stringify(output);
 const match=text.match(/\{[\s\S]*\}/);
 if(!match)return json({error:'L’AI non ha fornito un risultato strutturato. Riprova o usa i dati manuali.'},422,origin);
 let parsed;try{parsed=JSON.parse(match[0])}catch{return json({error:'Risposta AI non interpretabile.'},422,origin)}
 const items=normalize(parsed);
 if(!items.length)return json({items:[],warning:'Nessun alimento riconosciuto con sufficiente struttura.'},200,origin);
 return json({items,notice:'Grammi e nutrienti sono stime non verificate.'},200,origin);
 }catch(e){
 console.error('AI request failure',String(e?.message||e));
 return json({error:'Analisi non disponibile. Controlla configurazione del modello, quota e licenza Cloudflare.'},502,origin);
 }
}
};