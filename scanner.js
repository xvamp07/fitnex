/* FITNEX scanner — independent widget, no secret API keys */
(function(){
'use strict';
var KEY='fitnex_worker_url',photo=null,items=[],busy=false;
function el(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function validURL(s){try{var u=new URL(s);return u.protocol==='https:'&&u.hostname.endsWith('.workers.dev')&&!u.username&&!u.password}catch(e){return false}}
function say(s,error){var n=el('fxscan-status');if(n){n.textContent=s;n.setAttribute('role',error?'alert':'status')}}
function dismiss(){if(busy)return;el('fxscan-layer')?.remove();photo=null;items=[]}
function open(){
if(el('fxscan-layer'))return;
var wrap=document.createElement('div');wrap.id='fxscan-layer';wrap.className='fxscan-layer';
wrap.innerHTML='<section class="fxscan-modal" role="dialog" aria-modal="true" aria-labelledby="fxscan-title"><div class="fxscan-head"><div><div class="fxscan-eyebrow">FITNEX · NUTRITION AI</div><h2 id="fxscan-title">Scanner alimentare.</h2><p class="fxscan-sub">Fotografa il cibo, correggi i grammi, poi salva nel diario.</p></div><button id="fxscan-close" class="fxscan-x" aria-label="Chiudi">×</button></div>'+
'<div class="fxscan-grid"><div class="fxscan-preview" id="fxscan-preview"><div class="fxscan-icon">📷</div><p class="fxscan-empty">Seleziona una foto dal telefono o dal computer.</p></div><div class="fxscan-side"><label class="fxscan-label" for="fxscan-file">Foto del piatto</label><input id="fxscan-file" class="fxscan-input" type="file" accept="image/*"><label class="fxscan-label" for="fxscan-meal">Pasto</label><select id="fxscan-meal" class="fxscan-select"><option>Colazione</option><option selected>Pranzo</option><option>Cena</option><option>Spuntini</option></select><button id="fxscan-analyze" class="fxscan-btn primary" disabled>✨ Analizza con AI</button><button id="fxscan-manual" class="fxscan-btn">+ Aggiungi manualmente</button></div></div>'+
'<div class="fxscan-config"><details><summary class="fxscan-label" style="cursor:pointer">⚙ Configura riconoscimento AI</summary><p class="fxscan-tip">Per riconoscere davvero le immagini occorre collegare il tuo Cloudflare Worker. Le foto saranno inviate al suo URL quando premi Analizza. Non inserire mai chiavi segrete qui.</p><label class="fxscan-label" for="fxscan-endpoint">Indirizzo HTTPS del tuo Worker</label><input id="fxscan-endpoint" class="fxscan-input" type="url" placeholder="https://fitnex-scanner.tuonome.workers.dev"><div class="fxscan-btn-row" style="margin-top:8px"><button id="fxscan-save-endpoint" class="fxscan-btn">Salva indirizzo</button><button id="fxscan-clear-endpoint" class="fxscan-btn danger">Rimuovi</button></div></details></div>'+
'<p id="fxscan-status" class="fxscan-status" role="status"></p><div id="fxscan-results" class="fxscan-hide"><h3 class="fxscan-section-title">Ingredienti — correggi prima di salvare</h3><div id="fxscan-list" class="fxscan-list"></div><div class="fxscan-actions"><strong id="fxscan-total"></strong><button id="fxscan-add" class="fxscan-btn">+ Ingrediente</button><button id="fxscan-save" class="fxscan-btn primary">Salva nel diario</button></div><p class="fxscan-note">Le quantità e i nutrienti stimati da una foto possono essere sbagliati. Oli, salse e ingredienti nascosti non si possono misurare con certezza.</p></div><p class="fxscan-note">L’AI richiede Internet. Il diario manuale continua a funzionare offline.</p></section>';
document.body.appendChild(wrap);
el('fxscan-endpoint').value=localStorage.getItem(KEY)||'';
el('fxscan-close').onclick=dismiss;
wrap.addEventListener('click',function(e){if(e.target===wrap)dismiss()});
el('fxscan-file').onchange=choose;
el('fxscan-analyze').onclick=analyze;
el('fxscan-manual').onclick=function(){if(!items.length)items.push({name:'',grams:150,kcal:0,protein:0,carbs:0,fat:0});draw();say('Puoi compilare i dati manualmente, senza usare l’AI.')};
el('fxscan-save-endpoint').onclick=function(){var v=el('fxscan-endpoint').value.trim().replace(/\/+$/,'');if(!validURL(v)){say('Inserisci un indirizzo HTTPS valido del tuo Worker (*.workers.dev).',true);return}localStorage.setItem(KEY,v);say('Indirizzo salvato sul dispositivo.')};
el('fxscan-clear-endpoint').onclick=function(){localStorage.removeItem(KEY);el('fxscan-endpoint').value='';say('Collegamento rimosso.')};
el('fxscan-add').onclick=function(){if(items.length>=8)return say('Massimo 8 ingredienti.',true);items.push({name:'',grams:100,kcal:0,protein:0,carbs:0,fat:0});draw()};
el('fxscan-save').onclick=save;
el('fxscan-list').addEventListener('input',function(e){var node=e.target.closest('[data-ix]'),i=node?+node.dataset.ix:-1,k=e.target.dataset.field;if(!items[i]||!['name','grams','kcal','protein','carbs','fat'].includes(k))return;items[i][k]=k==='name'?e.target.value:Number(e.target.value);total()});
el('fxscan-list').addEventListener('click',function(e){var b=e.target.closest('[data-remove]');if(b){items.splice(+b.dataset.remove,1);draw()}});
say(!navigator.onLine?'Offline: puoi inserire gli ingredienti manualmente.':!localStorage.getItem(KEY)?'Il servizio AI non è ancora collegato. Inserisci il tuo Worker nelle impostazioni qui sopra.':'Scegli una foto, poi premi Analizza.');
}
async function choose(e){
var file=e.target.files[0];if(!file||!file.type.startsWith('image/'))return say('Scegli un’immagine valida.',true);
if(file.size>15*1024*1024)return say('Foto troppo grande (limite 15 MB).',true);
var url=URL.createObjectURL(file);
try{
var img=new Image();await new Promise(function(resolve,reject){img.onload=resolve;img.onerror=reject;img.src=url});
var scale=Math.min(1,850/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
var ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);photo=canvas.toDataURL('image/jpeg',.65);
if(photo.length>1400000)throw new Error('Foto troppo grande anche dopo la compressione.');
el('fxscan-preview').innerHTML='<img id="fxscan-image" alt="Foto del cibo scelta">';el('fxscan-image').src=photo;el('fxscan-analyze').disabled=false;
items=[];el('fxscan-results').classList.add('fxscan-hide');say('Foto pronta. Premi Analizza con AI.');
}catch(err){photo=null;el('fxscan-analyze').disabled=true;say('Foto non leggibile: '+err.message,true)}
finally{URL.revokeObjectURL(url)}
}
async function analyze(){
if(!photo)return say('Prima scegli una foto.',true);
if(!navigator.onLine)return say('Serve Internet per usare l’AI.',true);
var url=localStorage.getItem(KEY);if(!validURL(url))return say('Collega prima il tuo Cloudflare Worker (apri Configura riconoscimento AI).',true);
busy=true;el('fxscan-analyze').disabled=true;say('Analisi della foto in corso…');
var c=new AbortController(),tm=setTimeout(function(){c.abort()},25000);
try{var res=await fetch(url+'/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:photo}),signal:c.signal,cache:'no-store'});
var data=await res.json();if(!res.ok)throw new Error(data.error||'Errore del Worker');if(!Array.isArray(data.items)||!data.items.length)throw new Error('Nessun alimento rilevato. Aggiungilo manualmente.');
items=data.items.slice(0,8).map(function(x){return {name:String(x.name||'').slice(0,85),grams:Number(x.grams)||100,kcal:Number(x.kcal)||0,protein:Number(x.protein)||0,carbs:Number(x.carbs)||0,fat:Number(x.fat)||0}});draw();say('Stima ricevuta. Correggi i grammi e verifica gli ingredienti.');
}catch(e){say(e.name==='AbortError'?'Tempo scaduto. Riprova.':String(e.message||'Errore di rete').slice(0,200),true)}
finally{clearTimeout(tm);busy=false;el('fxscan-analyze').disabled=!photo}
}
function draw(){el('fxscan-results').classList.remove('fxscan-hide');el('fxscan-list').innerHTML=items.map(function(item,i){
return '<div class="fxscan-item" data-ix="'+i+'"><div class="fxscan-item-top"><input class="fxscan-input" aria-label="Nome alimento" maxlength="85" data-field="name" value="'+esc(item.name)+'" placeholder="Alimento"><button type="button" class="fxscan-btn danger" data-remove="'+i+'">✕</button></div><div class="fxscan-item-meta">'+[['grams','Grammi'],['kcal','kcal/100g'],['protein','Proteine/100g'],['carbs','Carbo/100g'],['fat','Grassi/100g']].map(function(entry){return '<label><span class="fxscan-label">'+entry[1]+'</span><input class="fxscan-input" type="number" min="0" step="any" data-field="'+entry[0]+'" value="'+(Number(item[entry[0]])||0)+'"></label>'}).join('')+'</div><div class="fxscan-item-kcal" id="fxscan-kcal-'+i+'"></div></div>'
}).join('');total()}
function total(){var sum=0;items.forEach(function(x,i){var k=Math.max(0,+x.grams||0)*Math.max(0,+x.kcal||0)/100;sum+=k;if(el('fxscan-kcal-'+i))el('fxscan-kcal-'+i).textContent=Math.round(k)+' kcal stimate'});el('fxscan-total').textContent=Math.round(sum)+' kcal stimate'}
function save(){
if(!items.length)return say('Aggiungi almeno un ingrediente.',true);
for(var x of items){if(!x.name.trim()||![x.grams,x.kcal,x.protein,x.carbs,x.fat].every(function(n){return Number.isFinite(n)&&n>=0})||x.grams<=0||x.grams>20000||x.kcal>1000||x.protein>100||x.carbs>100||x.fat>100)return say('Controlla i valori: grammi positivi e numeri validi per 100 g.',true)}
if(typeof window.fitnexStoreScan!=='function')return say('Salvataggio non pronto: ricarica FITNEX.',true);
var ok=window.fitnexStoreScan(items.map(function(x){return {...x,name:x.name.trim()}}),{photo:photo,meal:el('fxscan-meal').value});
if(ok){dismiss()}else say('Memoria locale piena. Esporta un backup prima di continuare.',true)
}
window.FitnexScanner={open:open};
})();