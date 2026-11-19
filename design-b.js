/* FITNEX 3.3 — Dashboard conforme al riferimento Clean Premium B */
(function(){
"use strict";
function dashboardB(){
 const day=TODAY(),totals=foodTotals(day),goal=totalSettings("calories");
 const consumed=Math.round(totals.kcal), percent=goal?Math.min(100,Math.round(consumed/goal*100)):0;
 const remaining=goal?Math.max(0,goal-consumed):null;
 const macros=[["protein","Proteine","protein"],["carbs","Carboidrati","carbs"],["fat","Grassi","fat"]].map(function(pair){
  const key=pair[0],label=pair[1],className=pair[2],target=totalSettings(key),progress=target?pct(totals[key],target):0;
  return `<div class="b-macro-row ${className}"><div class="b-macro-info"><span class="b-macro-name"><span class="b-macro-dot ${className}"></span>${label}</span><span class="b-macro-value">${fmt(totals[key],1)} g / ${target?fmt(target)+' g':'—'}</span></div><div class="b-macro-track" aria-label="${label}: ${fmt(totals[key],1)} grammi"><span style="width:${progress}%"></span></div></div>`;
 }).join("");
 const days=pastDates(7),recorded=days.filter(d=>state.foods.some(f=>f.date===d));
 const avg=recorded.length?recorded.reduce((sum,d)=>sum+foodTotals(d).kcal,0)/recorded.length:0;
 const series=days.map(d=>state.foods.some(f=>f.date===d)?foodTotals(d).kcal:null);
 const scaleMax=Math.max(400,Math.ceil(Math.max(1,...series.filter(v=>v!==null))/400)*400);
 const axis=[4,3,2,1,0].map(x=>`<span>${recorded.length?fmt(scaleMax*x/4):'—'}</span>`).join("");
 const names=["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
 const columns=days.map(function(d,i){
  const n=series[i],date=new Date(d+"T12:00:00"),height=n===null?0:Math.max(3,Math.round(n/scaleMax*100));
  const label=n===null?"nessun dato":fmt(n)+" kcal";
  return `<div class="b-weekly-col ${n===null?'no-data':''}" title="${escapeHTML(shortDate(d))}: ${label}"><div class="b-column" style="--height:${height}%"></div><span class="b-column-day">${names[date.getDay()]}</span></div>`;
 }).join("");
 const trained=new Set(state.workouts.filter(w=>days.includes(w.date)).map(w=>w.date)).size;
 const targetWorkouts=4, markers=Array.from({length:targetWorkouts},(_,i)=>`<i class="${i<trained?'on':''}"></i>`).join("");
 const h=new Date().getHours(),greeting=h>=5&&h<12?"Buongiorno!":h<18?"Buon pomeriggio!":"Buonasera!";
 const foodToday=state.foods.filter(f=>f.date===day).slice(-3).reverse();
 const workRecent=state.workouts.slice().sort(sessionDateSort).slice(-3).reverse();
 return `<div class="b-dashboard">
 <div class="b-welcome">
 <div class="b-welcome-person"><span class="b-avatar"><img src="./fitnex-192.png" alt="Logo FITNEX"></span>
 <div><div class="b-hello-small">${greeting}</div><h1 class="b-hello-name">Il tuo percorso.</h1></div></div>
 <span class="b-date">${escapeHTML(fullDate(day))}</span>
 </div>
 <div class="b-grid">
 <section class="b-card b-calories" aria-label="Calorie di oggi">
  <div class="b-eyebrow">${ico('bolt')} CALORIE DI OGGI</div>
  <div class="b-calories-body"><div class="b-number-line"><strong class="b-calories-num">${fmt(consumed)}</strong><span class="b-calories-goal">/ ${goal?fmt(goal):'—'} kcal</span></div>
  <div class="b-remaining"><span>${goal?'Rimanenti':'Obiettivo'}</span><strong>${remaining!==null?fmt(remaining):'—'} <small>${goal?'kcal':'da impostare'}</small></strong></div></div>
  <div class="b-calories-bottom"><div class="b-calories-track" aria-label="${percent}% del tuo obiettivo"><span style="width:${percent}%"></span></div><strong>${goal?percent+'%':'—'}</strong></div>
 </section>
 <section class="b-card b-macros" aria-label="Macronutrienti di oggi">
  <div class="b-eyebrow">${ico('layers')} MACROS (OGGI)</div>
  <div class="b-macros-core">
   <div class="b-donut" role="img" aria-label="${fmt(consumed)} calorie registrate oggi" style="--percent:${percent}%;background:conic-gradient(#b2d6a3 0 ${percent}%,#48514a ${percent}% 100%)"><div class="b-donut-center"><strong>${fmt(consumed)}</strong><small>kcal</small></div></div>
   <div class="b-macro-list">${macros}</div>
  </div>
 </section>
 <button class="b-scan" data-action="scan-food" type="button">${ico('camera')} <span>Scansiona un pasto</span><span class="b-arrow" aria-hidden="true">›</span></button>
 <section class="b-card b-workout" aria-label="Allenamenti degli ultimi sette giorni">
  <div class="b-athlete" aria-hidden="true"></div>
  <div class="b-workout-content"><div class="b-eyebrow">${ico('dumbbell')} WORKOUT PROGRESS</div>
   <div class="b-workout-figure">${trained}<span> / ${targetWorkouts}</span></div>
   <div class="b-workout-text">Giorni allenati negli ultimi 7 giorni</div>
   <div class="b-dots" aria-label="${trained} giorni allenati su ${targetWorkouts} di riferimento">${markers}</div>
  </div><button class="b-workout-nav" type="button" data-action="navigate" data-page="workout" aria-label="Apri allenamenti">›</button>
 </section>
 <section class="b-card b-weekly" aria-label="Calorie registrate negli ultimi sette giorni">
  <div class="b-weekly-header"><div class="b-weekly-label">${ico('chart')} ANALISI SETTIMANALE</div>
   <div class="b-weekly-avg"><span>Media giorni registrati</span><strong>${recorded.length?fmt(avg)+' kcal':'—'}</strong></div></div>
  <div class="b-weekly-plot" role="img" aria-label="Grafico settimanale, giorni senza dati non sono considerati calorie zero"><div class="b-weekly-axis">${axis}</div><div class="b-weekly-chart">${columns}</div></div>
  <div class="b-weekly-foot">${recorded.length?'Calcolato su '+recorded.length+' giorni registrati':'Aggiungi un pasto per vedere il grafico.'} · <button class="b-analytics-link" type="button" data-action="navigate" data-page="analytics">Vedi analisi →</button></div>
 </section>
 </div>
 <div class="b-below">
  <section class="panel panel-pad">${sectionHead('Diario alimentare','Alimenti registrati oggi',`<button class="btn sm ghost" data-action="navigate" data-page="nutrition">Apri diario ${ico('arrow','sm')}</button>`)}
   ${foodToday.length?foodToday.map(x=>foodRow(x)).join(''):emptyState('apple','Ancora nessun pasto','Aggiungi un alimento per cominciare.',`<button class="btn sm primary" data-action="add-food">${ico('plus')} Aggiungi alimento</button>`)}
  </section>
  <section class="panel panel-pad">${sectionHead('Ultimi allenamenti','Le tue registrazioni recenti',`<button class="btn sm ghost" data-action="navigate" data-page="workout">Apri workout ${ico('arrow','sm')}</button>`)}
   ${workRecent.length?workRecent.map(x=>workRow(x)).join(''):emptyState('dumbbell','Ancora nessun allenamento','Registra serie e carichi per iniziare.',`<button class="btn sm primary" data-action="log-work">${ico('plus')} Registra serie</button>`)}
  </section>
 </div></div>`;
}
window.renderOverview=dashboardB;
if(typeof render==="function")render();
})();