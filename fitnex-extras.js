/* FITNEX 3.4 — Pasti preferiti + panoramica reale ultimi 30 giorni.
 * Uses the same local diary and backup; no network calls or credentials.
 */
(function () {
  "use strict";
  const originalNutrition = window.renderNutrition;
  const originalAnalytics = window.renderAnalytics;
  if (typeof originalNutrition !== "function" || typeof originalAnalytics !== "function") return;

  const maxTemplates = 20;
  const maxIngredients = 24;
  const MEAL_KEY = "data-fxmeal";

  function templates() {
    return safeArr(state.mealTemplates).filter(function (t) {
      return t && typeof t.id === "string" && typeof t.name === "string" && Array.isArray(t.items);
    }).slice(0, maxTemplates);
  }
  function safeAmount(v) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  function foodSnapshot(food) {
    return {
      name: String(food.name || "").trim().slice(0, 85),
      grams: safeAmount(food.grams),
      kcal: safeAmount(food.kcal),
      protein: safeAmount(food.protein),
      carbs: safeAmount(food.carbs),
      fat: safeAmount(food.fat)
    };
  }
  function validItem(f) {
    return f && f.name && f.name.length <= 85 && Number.isFinite(Number(f.grams))
      && Number(f.grams) > 0 && Number(f.grams) <= 20000
      && ["kcal","protein","carbs","fat"].every(function (key) {
        const n = Number(f[key]);
        return Number.isFinite(n) && n >= 0 && n <= (key === "kcal" ? 1000 : 100);
      });
  }
  function templateCal(t) {
    return Math.round(safeArr(t.items).reduce(function (sum, f) {
      return sum + safeAmount(f.grams) * safeAmount(f.kcal) / 100;
    }, 0));
  }
  function actionLabel(t) {
    return escapeHTML(t.name) + " — " + templateCal(t) + " kcal";
  }
  function renderFavoriteMeals() {
    const saved = templates();
    const mealButtons = MEALS.map(function (meal) {
      const amount = state.foods.filter(function (f) {
        return f.date === view.nutritionDate && f.meal === meal;
      }).length;
      return amount
        ? '<button type="button" class="fxmeal-action" data-fxmeal="save" data-meal="' + escapeHTML(meal) + '">+ Salva ' + escapeHTML(meal.toLowerCase()) + ' (' + amount + ')</button>'
        : "";
    }).join("");
    const cards = saved.map(function (t) {
      const defaultMeal = MEALS.includes(t.meal) ? t.meal : "Pranzo";
      const choice = MEALS.map(function (meal) {
        return '<option value="' + escapeHTML(meal) + '"' + (meal === defaultMeal ? ' selected' : '') + '>' + escapeHTML(meal) + '</option>';
      }).join("");
      return '<article class="fxmeal-card" data-fxmeal-id="' + escapeHTML(t.id) + '">' +
        '<div class="fxmeal-card-top"><div class="fxmeal-name">' + escapeHTML(t.name) + '</div><div class="fxmeal-detail">' + templateCal(t) + ' kcal</div></div>' +
        '<div class="fxmeal-detail">' + t.items.length + ' alimenti · quantità modificabili dopo il salvataggio</div>' +
        '<div class="fxmeal-actions"><select class="fxmeal-select" aria-label="Pasto in cui aggiungere ' + escapeHTML(t.name) + '">' + choice + '</select>' +
        '<button type="button" class="fxmeal-add" data-fxmeal="apply" data-id="' + escapeHTML(t.id) + '">Aggiungi al diario</button>' +
        '<button type="button" class="fxmeal-remove" data-fxmeal="delete" data-id="' + escapeHTML(t.id) + '" aria-label="Elimina pasto preferito ' + escapeHTML(t.name) + '">×</button></div>' +
        '</article>';
    }).join("");
    return '<section class="fxmeal-section" aria-label="I miei pasti preferiti">' +
      '<div class="fxmeal-header"><div><h2 class="fxmeal-title">I tuoi pasti preferiti</h2>' +
      '<p class="fxmeal-desc">Salva un pasto già registrato e riutilizzalo quando vuoi. Nessuna foto duplicata.</p></div>' +
      '<span class="fxmeal-icon" aria-hidden="true">' + ico("book") + '</span></div>' +
      (saved.length
        ? '<div class="fxmeal-grid">' + cards + '</div>'
        : '<div class="fxmeal-empty">Nessun pasto preferito ancora salvato. Registra un pasto, poi seleziona «Salva» qui sotto.</div>') +
      (mealButtons ? '<div class="fxmeal-shortcuts"><span class="fxmeal-detail">Dal giorno selezionato:</span>' + mealButtons + '</div>' : '') +
      '<p class="fxmeal-foot">I preferiti sono salvati sul dispositivo e inclusi nel backup FITNEX. Correggi i valori per 100 g se cambiano marca o preparazione.</p></section>';
  }
  window.renderNutrition = function () {
    const base = originalNutrition();
    const marker = '<div class="section-grid">';
    if (!base.includes(marker)) return base;
    return base.replace(marker, marker + '<div class="span-12">' + renderFavoriteMeals() + '</div>');
  };

  function averageOf(days, key) {
    if (!days.length) return null;
    return days.reduce(function (sum, day) { return sum + foodTotals(day)[key]; }, 0) / days.length;
  }
  function analyticCard(label, value, suffix, description) {
    return '<div class="fxinsights-stat"><span class="label">' + escapeHTML(label) + '</span>' +
      '<strong>' + value + (suffix ? ' <small>' + suffix + '</small>' : '') + '</strong>' +
      '<p>' + escapeHTML(description) + '</p></div>';
  }
  function render30DayInsights() {
    const days = pastDates(30);
    const registered = days.filter(function (day) {
      return state.foods.some(function (f) { return f.date === day; });
    });
    const avgCal = averageOf(registered, "kcal"), avgProtein = averageOf(registered, "protein");
    const recentWorkouts = state.workouts.filter(function (w) { return days.includes(w.date); });
    const gymDays = new Set(recentWorkouts.map(function (w) { return w.date; })).size;

    const proteinDays = pastDates(14);
    const barValues = proteinDays.map(function (day) {
      return state.foods.some(function (f) { return f.date === day; }) ? foodTotals(day).protein : null;
    });
    const maxP = Math.max(10, ...barValues.filter(function (v) { return v !== null; }));
    const bars = proteinDays.map(function (day, i) {
      const v = barValues[i], dayNumber = Number(day.slice(-2));
      const height = v === null ? 0 : Math.max(3, Math.round(v / maxP * 112));
      const info = v === null ? "nessun dato" : fmt(v,1) + " g";
      return '<div class="fxinsights-bar' + (v === null ? ' empty' : '') + '" title="' + escapeHTML(shortDate(day) + ': ' + info) + '">' +
        '<b>' + (v === null ? '—' : fmt(v)) + '</b><i style="--height:' + height + 'px"></i>' +
        '<span>' + dayNumber + '</span></div>';
    }).join("");
    const totalVolume = recentWorkouts.reduce(function (sum, w) { return sum + volume(w); }, 0);
    return '<section class="fxinsights" aria-label="Analisi ultimi 30 giorni">' +
      '<div class="fxinsights-head"><h2>Uno sguardo agli ultimi 30 giorni</h2>' +
      '<span>Solo dati registrati · senza proiezioni</span></div>' +
      '<div class="fxinsights-grid">' +
      analyticCard('Media calorie', avgCal === null ? '—' : fmt(avgCal), avgCal === null ? '' : 'kcal', 'Media dei giorni con alimenti registrati') +
      analyticCard('Media proteine', avgProtein === null ? '—' : fmt(avgProtein,1), avgProtein === null ? '' : 'g', 'Media dei giorni con alimenti registrati') +
      analyticCard('Giorni con pasti', fmt(registered.length), '/ 30', 'Giorni con almeno un alimento salvato') +
      analyticCard('Giorni allenati', fmt(gymDays), '/ 30', recentWorkouts.length + ' esercizi registrati') +
      '</div><div class="fxinsights-protein"><h3>Proteine · ultimi 14 giorni</h3>' +
      '<p>Grammature giornaliere registrate nel diario. Le barre vuote indicano giorni senza dati.</p>' +
      '<div class="fxinsights-bars" role="img" aria-label="Grafico proteine degli ultimi 14 giorni">' + bars + '</div>' +
      '<div class="fxinsights-hint">Volume esterno registrato negli ultimi 30 giorni: <strong>' +
      fmt(totalVolume) + ' kg × ripetizioni</strong>. Non include automaticamente il lavoro a corpo libero.</div>' +
      '</div></section>';
  }
  window.renderAnalytics = function () {
    return originalAnalytics() + render30DayInsights();
  };

  function saveFavorite(meal) {
    if (!MEALS.includes(meal)) return;
    const existingMeals = state.foods.filter(function (f) {
      return f.date === view.nutritionDate && f.meal === meal;
    });
    if (!existingMeals.length) return showToast("Prima registra almeno un alimento.");
    if (existingMeals.length > maxIngredients) return showToast("Troppi alimenti: massimo 24 per preferito.");
    const proposed = meal + " · " + shortDate(view.nutritionDate);
    const answer = window.prompt("Come vuoi chiamare questo pasto preferito?", proposed);
    if (answer === null) return;
    const name = answer.trim().slice(0,60);
    if (!name) return showToast("Inserisci un nome per il preferito.");
    const items = existingMeals.map(foodSnapshot);
    if (!items.every(validItem)) return showToast("Uno degli alimenti ha dati non validi.");
    const old = templates();
    const duplicate = old.find(function (t) { return t.name.toLocaleLowerCase("it") === name.toLocaleLowerCase("it"); });
    if (duplicate && !window.confirm('Sostituire il preferito "' + duplicate.name + '"?')) return;
    if (!duplicate && old.length >= maxTemplates) return showToast("Limite di 20 pasti preferiti raggiunto.");
    const updated = {id:duplicate ? duplicate.id : sid(),name:name,meal:meal,items:items,createdAt:new Date().toISOString()};
    state.mealTemplates = duplicate ? old.map(function(t) { return t.id === duplicate.id ? updated : t; }) : old.concat([updated]);
    if (!saveState()) { state.mealTemplates = old; return; }
    render();
    showToast(duplicate ? "Preferito aggiornato." : "Pasto salvato tra i preferiti.");
  }

  function addFavorite(button) {
    const id = button.dataset.id, template = templates().find(function (t) { return t.id === id; });
    if (!template) return showToast("Preferito non trovato.");
    const container = button.closest(".fxmeal-card");
    const dropdown = container && container.querySelector(".fxmeal-select");
    const meal = dropdown && MEALS.includes(dropdown.value) ? dropdown.value : "Pranzo";
    const date = view.nutritionDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return showToast("Seleziona una data valida.");
    if (!template.items.length || template.items.length > maxIngredients || !template.items.every(validItem)) {
      return showToast("Il pasto salvato contiene dati non validi.");
    }
    const priorFoods = state.foods.slice();
    if (priorFoods.length + template.items.length > 25000) return showToast("Diario troppo grande: esporta il backup.");
    const records = template.items.map(function (f) {
      return Object.assign({}, foodSnapshot(f), {id:sid(),date:date,meal:meal,photo:null});
    });
    state.foods.push.apply(state.foods, records);
    if (!saveState()) { state.foods = priorFoods; return; }
    render();
    showToast(records.length + " alimenti aggiunti a " + meal.toLowerCase() + ". Puoi correggere i grammi.");
  }

  function deleteFavorite(id) {
    const old = templates(), template = old.find(function(t) { return t.id === id; });
    if (!template) return;
    if (!window.confirm('Eliminare il preferito "' + template.name + '"? I pasti già registrati rimarranno nel diario.')) return;
    state.mealTemplates = old.filter(function(t) { return t.id !== id; });
    if (!saveState()) { state.mealTemplates = old; return; }
    render();
    showToast("Preferito eliminato. Il diario non è stato modificato.");
  }

  document.addEventListener("click", function (e) {
    const button = e.target.closest("button[" + MEAL_KEY + "]");
    if (!button || !button.isConnected) return;
    e.preventDefault();
    const action = button.dataset.fxmeal;
    if (action === "save") saveFavorite(button.dataset.meal);
    if (action === "apply") addFavorite(button);
    if (action === "delete") deleteFavorite(button.dataset.id);
  });

  // Existing FITNEX renders before this deferred script; redraw the current page once.
  if (typeof render === "function") render();
})();
