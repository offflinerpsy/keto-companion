// cloudflare-saas/public/food-picker.js
function createFoodPicker({ root, input, el: el2, call: call2, getState, accept: accept2, run: run2, epoch, foodState: foodState2, onSelect, selectionMessage, allergens = [], debounce = 220 }) {
  let version2 = 0, detailVersion = 0, timer = null, query = "", foods = [], page = 0, cursor = null, sourceBusy = false, pending = null;
  const status = el2("p", "food-search-status"), hint = el2("div", "food-search-hint"), list = el2("div", "food-result-list"), source = el2("section", "food-reference"), sourceStatus = el2("p", "muted"), sourceRows = el2("div", "food-result-list"), review = el2("section", "food-source-review");
  status.setAttribute("role", "status");
  status.setAttribute("tabindex", "-1");
  sourceStatus.setAttribute("role", "status");
  list.setAttribute("aria-label", "\u041D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B");
  source.setAttribute("aria-label", "\u0411\u043E\u043B\u044C\u0448\u043E\u0439 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432");
  review.hidden = source.hidden = true;
  review.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target?.tagName === "INPUT") event.preventDefault();
  });
  const button = (label, fn, cls = "secondary") => {
    const b2 = el2("button", cls, label);
    b2.type = "button";
    b2.onclick = () => run2(fn);
    return b2;
  };
  const more = button("\u0415\u0449\u0451 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0438\u0437 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0430", () => loadSource(true));
  more.hidden = true;
  more.setAttribute("data-icon", "plus");
  const wide = button("\u0418\u0441\u043A\u0430\u0442\u044C \u0432 USDA \u2014 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u043C \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0435", () => loadSource(false));
  wide.hidden = true;
  const catalogueHint = el2("p", "ux-hint", "\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u2014 \u043E\u0442\u043E\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u044B\u0435 \u0438 \u0432\u0430\u0448\u0438 \u043B\u0438\u0447\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B. \u0414\u043B\u044F \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0439 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0438 \u0432 \u0420\u043E\u0441\u0441\u0438\u0438 \u0438\u043B\u0438 \u0411\u0435\u043B\u0430\u0440\u0443\u0441\u0438 \u0441\u0432\u0435\u0440\u044F\u0439\u0442\u0435 \u0441\u043E\u0441\u0442\u0430\u0432 \u0441 \u0435\u0451 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u043E\u0439.");
  source.append(el2("h3", "", "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A USDA"), el2("p", "ux-hint", "USDA \u2014 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A \u0441\u043E\u0441\u0442\u0430\u0432\u0430 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432 \u0421\u0428\u0410. \u042D\u0442\u043E \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u043D\u0430 100 \u0433, \u0430 \u043D\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0432\u0430\u0448\u0435\u0439 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0438 \u0432 \u0420\u043E\u0441\u0441\u0438\u0438 \u0438\u043B\u0438 \u0411\u0435\u043B\u0430\u0440\u0443\u0441\u0438. \u041F\u0435\u0440\u0435\u0434 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435\u043C \u0441\u0432\u0435\u0440\u044F\u0439\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442, \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0438 \u0441\u043E\u0441\u0442\u0430\u0432 \u0441 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u043E\u0439."), sourceStatus, sourceRows, more);
  root.append(status, catalogueHint, hint, list, wide, source, review);
  const current = (stamp, screen, q2) => stamp === version2 && screen === epoch() && q2 === input.value.trim();
  function invalidate() {
    version2++;
    detailVersion++;
    clearTimeout(timer);
    cursor = null;
    sourceBusy = false;
    review.hidden = true;
    review.replaceChildren();
    list.replaceChildren();
    hint.replaceChildren();
    sourceRows.replaceChildren();
    source.hidden = true;
    wide.hidden = true;
    more.hidden = true;
    status.textContent = "";
  }
  function select(food) {
    invalidate();
    const next = onSelect(food);
    input.value = food.name_ru;
    status.textContent = selectionMessage ? selectionMessage(food) : "\u0412\u044B\u0431\u0440\u0430\u043D \u043F\u0440\u043E\u0434\u0443\u043A\u0442: " + food.name_ru;
    if (next?.focus) {
      next.focus({ preventScroll: true });
      next.scrollIntoView?.({ block: "nearest" });
    } else status.focus?.({ preventScroll: true });
  }
  function option(name2, subtitle, fn) {
    const b2 = button("", fn, "food-option");
    b2.append(el2("strong", "", name2), el2("span", "muted", subtitle));
    b2.setAttribute("aria-label", name2 + " \xB7 " + subtitle);
    return b2;
  }
  function drawFoods() {
    list.replaceChildren();
    const start2 = page * 8;
    for (const food of foods.slice(start2, start2 + 8)) list.append(option(food.name_ru, foodState2(food.state), () => select(food)));
    const nav = el2("div", "food-result-pages");
    if (page) nav.append(button("\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B", () => {
      page--;
      drawFoods();
    }));
    if (start2 + 8 < foods.length) nav.append(button("\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B", () => {
      page++;
      drawFoods();
    }));
    if (nav.children.length) list.append(nav);
  }
  async function search({ reveal = false } = {}) {
    invalidate();
    query = input.value.trim();
    if (!query) return;
    const stamp = version2, screen = epoch(), q2 = query;
    status.textContent = "\u0418\u0449\u0435\u043C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B\u2026";
    try {
      const result = await call2("keto_kitchen", { action: "foods", query: q2 });
      if (!current(stamp, screen, q2)) return;
      foods = result.foods || [];
      page = 0;
      drawFoods();
      status.textContent = foods.length ? `\u0412 \u0432\u0430\u0448\u0438\u0445 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430\u0445 \u0438 \u0431\u0430\u0437\u043E\u0432\u043E\u043C \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435: ${foods.length}. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442.` : "\u0412 \u0431\u0430\u0437\u043E\u0432\u043E\u043C \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u0438 \u0432\u0430\u0448\u0438\u0445 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430\u0445 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0439 \u043D\u0435\u0442.";
      if (result.search?.label) hint.append(el2("span", "field-help", result.search.label));
      for (const alternative of result.search?.alternatives || []) hint.append(button(alternative.label, () => {
        input.value = alternative.query;
        return search({ reveal: true });
      }, "text-btn"));
      wide.hidden = false;
      if (reveal && current(stamp, screen, q2) && (!root.getClientRects || root.getClientRects().length)) {
        status.focus?.({ preventScroll: true });
        root.scrollIntoView?.({ block: "start", behavior: "instant" });
      }
    } catch (error) {
      if (current(stamp, screen, q2)) {
        status.textContent = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.";
        list.append(button("\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u043F\u043E\u0438\u0441\u043A", () => search({ reveal: true })));
      }
    }
  }
  async function loadSource(append) {
    if (sourceBusy || !query || query !== input.value.trim() || append && !cursor) return;
    const stamp = version2, screen = epoch(), q2 = query, next = append ? cursor : null;
    sourceBusy = true;
    source.hidden = false;
    wide.hidden = true;
    more.hidden = true;
    sourceStatus.textContent = "\u0418\u0449\u0435\u043C \u0432 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u043C \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0435 USDA\u2026";
    try {
      const result = await call2("keto_kitchen", { action: "source_search", query: q2, values: { cursor: next, limit: 8 } });
      if (!current(stamp, screen, q2)) return;
      if (!append) sourceRows.replaceChildren();
      sourceStatus.textContent = result.total ? `\u0421\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0439 \u0432 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0435: ${result.total}` : "\u0412 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0439 \u043D\u0435\u0442. \u0423\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438\u043B\u0438 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u043F\u043E \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0435.";
      for (const candidate of result.candidates || []) {
        let row;
        row = option(candidate.name_ru_unofficial || candidate.name_en, candidate.already_imported ? "\u0423\u0436\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D \xB7 \u0432\u044B\u0431\u0440\u0430\u0442\u044C" : "USDA \xB7 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u043E\u0441\u0442\u0430\u0432", async () => {
          const detail = ++detailVersion, e = epoch(), v2 = version2;
          try {
            if (candidate.personal_food_id) {
              const d3 = await call2("keto_kitchen", { action: "foods", query: candidate.personal_food_id });
              if (detail !== detailVersion || e !== epoch() || v2 !== version2) return;
              const food = d3.foods?.find((f) => f.food_id === candidate.personal_food_id);
              if (food) select(food);
              return;
            }
            const d2 = await call2("keto_kitchen", { action: "source_detail", values: { candidate_id: candidate.candidate_id } });
            if (detail !== detailVersion || e !== epoch() || v2 !== version2) return;
            showReview(d2.candidate, row, v2, e);
          } catch (error) {
            if (detail === detailVersion && e === epoch() && v2 === version2) {
              sourceStatus.textContent = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u043E\u0441\u0442\u0430\u0432. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C \u0435\u0449\u0451 \u0440\u0430\u0437.";
            }
          }
        });
        sourceRows.append(row);
      }
      cursor = result.next_cursor;
      more.hidden = !cursor;
      more.textContent = "\u0415\u0449\u0451 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0438\u0437 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0430";
    } catch (error) {
      if (current(stamp, screen, q2)) {
        sourceStatus.textContent = "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0441\u044F. \u0412\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D.";
        more.hidden = false;
        more.textContent = "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u043F\u043E\u0438\u0441\u043A \u0432 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0435";
        more.onclick = () => run2(() => loadSource(Boolean(cursor)));
      }
    } finally {
      if (stamp === version2) {
        sourceBusy = false;
      }
    }
  }
  function showReview(candidate, origin, stamp, screen) {
    const reviewVersion = detailVersion;
    review.hidden = false;
    review.replaceChildren(el2("h3", "", "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442"), el2("p", "", candidate.name_en));
    const a2 = el2("a", "", "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A USDA");
    a2.href = candidate.source_url;
    a2.target = "_blank";
    a2.rel = "noopener noreferrer";
    review.append(a2);
    const nutrients = el2("dl", "intake-nutrients");
    for (const [key, label, unit] of [["energy_kcal", "\u042D\u043D\u0435\u0440\u0433\u0438\u044F", "\u043A\u043A\u0430\u043B"], ["protein_g", "\u0411\u0435\u043B\u043A\u0438", "\u0433"], ["fat_g", "\u0416\u0438\u0440\u044B", "\u0433"], ["carbohydrate_total_g", "\u041E\u0431\u0449\u0438\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B", "\u0433"], ["fiber_g", "\u041A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430", "\u0433"]]) nutrients.append(el2("dt", "", label), el2("dd", "", candidate[key] == null ? "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(candidate[key]) + " " + unit));
    review.append(el2("p", "ux-hint", "\u041D\u0430 100 \u0433. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0438 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B \u043F\u043E \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435; USDA \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442 \u0435\u0451 \u0441\u043E\u0441\u0442\u0430\u0432 \u0438 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B. \u0413\u0418 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D."), nutrients);
    const field = (label, control) => {
      const box = el2("label", "", label);
      box.append(control);
      review.append(box);
      return control;
    };
    const name2 = field("\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430", el2("input"));
    name2.value = candidate.name_ru_unofficial || candidate.name_en;
    name2.maxLength = 200;
    const state2 = field("\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430", el2("select"));
    for (const [value, label] of [["", "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435"], ["ready_to_eat", "\u0413\u043E\u0442\u043E\u0432 \u043A \u0443\u043F\u043E\u0442\u0440\u0435\u0431\u043B\u0435\u043D\u0438\u044E"], ["raw", "\u0421\u044B\u0440\u043E\u0439"], ["cooked", "\u041F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0439"], ["dry", "\u0421\u0443\u0445\u043E\u0439"], ["canned", "\u041A\u043E\u043D\u0441\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439"], ["ready_to_cook", "\u0414\u043B\u044F \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u044F"]]) {
      const o2 = el2("option", "", label);
      o2.value = value;
      state2.append(o2);
    }
    const allergy = el2("details", "food-source-allergens"), checks = [];
    allergy.append(el2("summary", "", "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B"));
    for (const [value, label] of allergens) {
      const box = el2("label", "check", label), control = el2("input");
      control.type = "checkbox";
      control.value = value;
      box.append(control);
      allergy.append(box);
      checks.push(control);
    }
    const checked = el2("input");
    checked.type = "checkbox";
    const confirm2 = el2("label", "check", "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0438 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B");
    confirm2.append(checked);
    const error = el2("p", "field-error");
    error.setAttribute("role", "alert");
    const save = button("\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435", async () => {
      if (save.disabled || reviewVersion !== detailVersion || !current(stamp, screen, query)) return;
      if (!name2.value.trim() || !state2.value || !checked.checked) {
        error.textContent = "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u043E\u0432.";
        return;
      }
      save.disabled = true;
      error.textContent = "";
      try {
        const result = await call2("keto_kitchen", { action: "source_import", values: { candidate_id: candidate.candidate_id, release_hash: candidate.release_hash, name_ru: name2.value.trim(), state: state2.value, allergens: checks.filter((x) => x.checked).map((x) => x.value), source_review_confirmed: true }, expected_revision: getState().revision });
        if (reviewVersion !== detailVersion || !current(stamp, screen, query)) return;
        if (result.proposal?.preview?.food) pending = { id: result.proposal.id, food: result.proposal.preview.food, stamp, screen };
        accept2(result);
      } catch (e) {
        if (stamp === version2 && screen === epoch()) error.textContent = e.message;
      } finally {
        save.disabled = false;
      }
    }, "primary");
    const cancel = button("\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043A \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430\u043C", () => {
      detailVersion++;
      review.hidden = true;
      review.replaceChildren();
      origin.focus?.({ preventScroll: true });
      origin.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "instant" });
    });
    review.append(allergy, confirm2, error, save, cancel);
    review.setAttribute("tabindex", "-1");
    review.focus?.({ preventScroll: true });
    review.scrollIntoView?.({ block: "nearest" });
  }
  function afterApplied(data) {
    if (!pending) return;
    if (data?.receipt?.id === pending.id) {
      const done = pending;
      pending = null;
      if (done.stamp === version2 && done.screen === epoch()) select(done.food);
    } else if (data?.state?.pending && !data.state.pending.some((p) => p.id === pending.id)) pending = null;
  }
  function reset() {
    invalidate();
    pending = null;
    foods = [];
    query = "";
    input.value = "";
  }
  input.addEventListener("input", () => {
    invalidate();
    const stamp = version2;
    timer = setTimeout(() => {
      if (stamp === version2) run2(search);
    }, debounce);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      run2(() => search({ reveal: true }));
    }
  });
  return { search, reset, invalidate, afterApplied };
}

// cloudflare-saas/public/chat-actions.js
var TYPES = /* @__PURE__ */ new Set(["navigate", "choose_meal_mode", "open_recipe", "open_intake", "review_proposal"]);
var VIEWS = /* @__PURE__ */ new Set(["chat", "diary", "recipes", "products", "today", "setup", "targets", "knowledge", "memory", "reminders", "more"]);
var MODES = /* @__PURE__ */ new Set(["pantry_only", "pantry_plus", "inspiration"]);
var STATUS = { unavailable: "\u042D\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E.", expired: "\u0421\u0440\u043E\u043A \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0438\u0441\u0442\u0451\u043A.", completed: "\u0423\u0436\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E.", stale: "\u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C. \u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0437\u0430\u043D\u043E\u0432\u043E." };
function setupChatActions({ el: el2, call: call2, getState, epoch, getContext = () => null, refresh: refresh2, run: run2, notify: notify2, navigate, chooseMode, openRecipe: openRecipe2, openIntake, showProposal: showProposal2 }) {
  let serial = 0, resolving = false;
  function render(message) {
    const wrapper = el2("article", "chat-message " + (message.role === "user" ? "user" : "assistant"));
    if (message.id) wrapper.dataset.messageId = message.id;
    wrapper.append(el2("div", "bubble " + (message.role === "user" ? "user" : "assistant"), message.text || ""));
    if (message.role !== "assistant" || !message.id || !message.thread_id) return wrapper;
    const actions = Array.isArray(message.actions) ? message.actions.filter((a2) => a2 && TYPES.has(a2.type) && typeof a2.id === "string" && typeof a2.label === "string").slice(0, 3) : [];
    if (!actions.length) return wrapper;
    const group = el2("div", "message-actions");
    group.setAttribute("aria-label", "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043F\u043E\u0441\u043B\u0435 \u043E\u0442\u0432\u0435\u0442\u0430");
    const status = el2("p", "message-action-status");
    status.setAttribute("role", "status");
    function explainDisabled() {
      if (status.textContent.trim() || !Array.from(group.children).every((control) => control.disabled)) return;
      status.textContent = [...new Set(actions.map((action) => action.reason || STATUS[action.status] || STATUS.unavailable))].join(" ");
    }
    for (const action of actions) {
      const button = el2("button", "secondary", action.label);
      button.type = "button";
      button.dataset.actionId = action.id;
      if (action.type === "open_recipe" && typeof action.fit_note === "string") button.append(el2("span", "message-action-note", action.fit_note));
      button.disabled = action.status !== "available";
      if (button.disabled) button.setAttribute("aria-description", action.reason || STATUS[action.status] || STATUS.unavailable);
      button.onclick = () => run2(async () => {
        if (resolving) return;
        const before = getState(), thread = before?.active_thread || "main";
        if (thread !== message.thread_id) {
          notify2("\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0442\u0435\u043C\u0443 \u044D\u0442\u043E\u0433\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F.");
          return;
        }
        const version2 = before.revision, stamp = epoch(), token = serial, context = getContext();
        resolving = true;
        for (const control of group.children) control.disabled = true;
        status.textContent = "\u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u043C\u2026";
        try {
          const result = await call2("keto_kitchen", {
            action: "chat_action",
            thread_id: message.thread_id,
            values: { message_id: message.id, action_id: action.id },
            expected_revision: version2
          });
          if (token !== serial || stamp !== epoch() || context !== getContext() || (getState()?.active_thread || "main") !== thread) return;
          if (getState().revision !== version2) {
            status.textContent = "\u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.";
            return;
          }
          if (result.message_id !== message.id || result.response_thread_id !== message.thread_id || result.action?.id !== action.id) {
            status.textContent = "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440.";
            return;
          }
          const command = result.command;
          if (!command) {
            status.textContent = result.action?.reason || STATUS[result.action?.status] || STATUS.unavailable;
            button.dataset.unavailable = "true";
            return;
          }
          button.disabled = false;
          button.focus?.({ preventScroll: true });
          if (command.type !== action.type) throw Error("\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440.");
          if (command.type === "navigate" && VIEWS.has(command.view)) navigate(command.view);
          else if (command.type === "choose_meal_mode" && MODES.has(command.mode)) chooseMode(command.mode);
          else if (command.type === "open_recipe" && command.recipe?.recipe_id) openRecipe2(command.recipe, command.source);
          else if (command.type === "open_intake" && command.source?.recipe_id) openIntake({ ...command.source, amount: command.suggested_amount });
          else if (command.type === "review_proposal" && getState().pending?.some((p) => p.id === command.proposal_id)) showProposal2(command.proposal_id);
          else throw Error("\u042D\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E.");
          status.textContent = "";
        } catch (error) {
          if (token === serial && stamp === epoch() && context === getContext()) {
            status.textContent = error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u044C. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.";
            if (refresh2) {
              const retry = el2("button", "text-btn", "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440");
              retry.type = "button";
              retry.onclick = () => run2(async () => {
                retry.disabled = true;
                try {
                  await refresh2();
                  if (token === serial && stamp === epoch()) status.textContent = "\u0420\u0430\u0437\u0433\u043E\u0432\u043E\u0440 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0443\u0436\u043D\u043E\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.";
                } finally {
                  retry.disabled = false;
                }
              });
              status.append(retry);
            }
          }
        } finally {
          if (token === serial && stamp === epoch()) {
            resolving = false;
            for (const control of group.children) {
              const original = actions.find((a2) => a2.id === control.dataset.actionId);
              control.disabled = original?.status !== "available" || control.dataset.unavailable === "true";
            }
            explainDisabled();
          }
        }
      });
      group.append(button);
    }
    explainDisabled();
    wrapper.append(group, status);
    return wrapper;
  }
  return { render, reset() {
    serial++;
    resolving = false;
  } };
}

// cloudflare-saas/public/auth-session.js
var AuthError = class extends Error {
  constructor(code, { status = 0, ambiguous = false } = {}) {
    super(code);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
    this.ambiguous = ambiguous;
  }
};
function transientStorage(readStorage) {
  const memory = /* @__PURE__ */ new Map();
  return {
    getItem(key) {
      if (memory.has(key)) return memory.get(key);
      try {
        const value = readStorage().getItem(key);
        if (value !== null) {
          memory.set(key, value);
          return value;
        }
      } catch {
      }
      return null;
    },
    setItem(key, value) {
      memory.set(key, String(value));
      try {
        readStorage().setItem(key, String(value));
      } catch {
      }
    },
    removeItem(key) {
      memory.set(key, null);
      try {
        readStorage().removeItem(key);
      } catch {
      }
    }
  };
}
function bounded(operation, { signal, timeoutMs = 15e3 } = {}) {
  const controller = new AbortController();
  let timer, rejectPending;
  const stopped = new Promise((_, reject) => {
    rejectPending = reject;
  });
  const abort = () => {
    controller.abort();
    rejectPending(new AuthError("CANCELLED"));
  };
  if (signal?.aborted) {
    controller.abort();
    return Promise.reject(new AuthError("CANCELLED"));
  }
  signal?.addEventListener("abort", abort, { once: true });
  timer = setTimeout(() => {
    controller.abort();
    rejectPending(new AuthError("NETWORK_TIMEOUT"));
  }, timeoutMs);
  let task;
  try {
    task = operation(controller.signal);
  } catch (error) {
    task = Promise.reject(error);
  }
  return Promise.race([task, stopped]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    controller.abort();
  });
}
async function authJson(fetcher, path, { method = "GET", body, signal, csrf: csrf2 } = {}) {
  let response;
  try {
    response = await fetcher(path, { method, credentials: "same-origin", cache: "no-store", signal, headers: { ...body !== void 0 ? { "Content-Type": "application/json" } : {}, ...csrf2 && method !== "GET" ? { "X-CSRF-Token": csrf2 } : {} }, body: body === void 0 ? void 0 : JSON.stringify(body) });
  } catch {
    throw new AuthError(signal?.aborted ? "CANCELLED" : "NETWORK_ERROR");
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new AuthError("INVALID_RESPONSE", { status: response.status });
  }
  if (!response.ok) throw new AuthError(typeof data?.error === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(data.error) ? data.error : "REQUEST_FAILED", { status: response.status });
  return data;
}
var messages = {
  NETWORK_ERROR: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F \u0441 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435\u043C. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435.",
  NETWORK_TIMEOUT: "\u041E\u0442\u0432\u0435\u0442 \u043D\u0435 \u043F\u0440\u0438\u0448\u0451\u043B \u0432\u043E\u0432\u0440\u0435\u043C\u044F. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435.",
  INVALID_RESPONSE: "\u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u043E \u043D\u0435\u043F\u043E\u043B\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443.",
  SETUP_REQUIRED: "\u0412\u0445\u043E\u0434 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u043F\u043E\u0437\u0436\u0435.",
  LOGIN_UNAVAILABLE: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043D\u0430\u0447\u0430\u0442\u044C \u0432\u0445\u043E\u0434. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u043F\u044B\u0442\u043A\u0443.",
  LOGIN_BUSY: "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043F\u043E\u043F\u044B\u0442\u043E\u043A \u0432\u0445\u043E\u0434\u0430. \u041F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435 \u043D\u0435\u043C\u043D\u043E\u0433\u043E \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435.",
  INVALID_CHALLENGE: "\u041F\u043E\u043F\u044B\u0442\u043A\u0430 \u0432\u0445\u043E\u0434\u0430 \u0443\u0441\u0442\u0430\u0440\u0435\u043B\u0430. \u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0432\u0445\u043E\u0434 \u0435\u0449\u0451 \u0440\u0430\u0437.",
  SESSION_LIMIT: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0435\u0430\u043D\u0441: \u0434\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0432\u0445\u043E\u0434\u043E\u0432. \u0412\u044B\u0439\u0434\u0438\u0442\u0435 \u0438\u0437 KETO \u043D\u0430 \u0434\u0440\u0443\u0433\u043E\u043C \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0435 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435.",
  SIGN_IN_BLOCKED: "\u0414\u043E\u0441\u0442\u0443\u043F \u044D\u0442\u043E\u0433\u043E \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442.",
  INVITATION_REQUIRED: "\u0414\u043B\u044F \u044D\u0442\u043E\u0439 \u043F\u043E\u0447\u0442\u044B \u043D\u0443\u0436\u043D\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0451\u043D\u043D\u044B\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F.",
  INVITE_NOT_AVAILABLE: "\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043D\u043E\u0432\u0443\u044E \u0441\u0441\u044B\u043B\u043A\u0443 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F.",
  SESSION_NOT_SAVED: "Google \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B \u0432\u0445\u043E\u0434, \u043D\u043E \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u043E \u0441\u0435\u0430\u043D\u0441. \u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 cookie \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0441\u0430\u0439\u0442\u0430 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.",
  SIGN_IN: "\u0421\u0435\u0430\u043D\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D. \u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.",
  "auth/popup-closed-by-user": "\u0412\u0445\u043E\u0434 \u043E\u0442\u043C\u0435\u043D\u0451\u043D. \u041C\u043E\u0436\u043D\u043E \u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0435\u0449\u0451 \u0440\u0430\u0437.",
  "auth/cancelled-popup-request": "\u0412\u0445\u043E\u0434 \u043E\u0442\u043C\u0435\u043D\u0451\u043D. \u041C\u043E\u0436\u043D\u043E \u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0435\u0449\u0451 \u0440\u0430\u0437.",
  "auth/popup-blocked": "\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043B \u043E\u043A\u043D\u043E Google. \u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0432\u0441\u043F\u043B\u044B\u0432\u0430\u044E\u0449\u0438\u0435 \u043E\u043A\u043D\u0430 \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0441\u0430\u0439\u0442\u0430 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435.",
  "auth/network-request-failed": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F \u0441 Google. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435.",
  "auth/unauthorized-domain": "Google-\u0432\u0445\u043E\u0434 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0430\u0434\u0440\u0435\u0441\u0430 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F.",
  "auth/operation-not-supported-in-this-environment": "\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u0441\u043C\u043E\u0433 \u043E\u0442\u043A\u0440\u044B\u0442\u044C Google-\u0432\u0445\u043E\u0434. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 KETO \u0432 \u043E\u0431\u044B\u0447\u043D\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430."
};
function authMessage(error) {
  return messages[error?.code] || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0432\u0445\u043E\u0434. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u043F\u044B\u0442\u043A\u0443.";
}
function authDiagnostic(phase, error) {
  const code = Object.hasOwn(messages, error?.code) ? error.code : { COMPUTE_UNAVAILABLE: true, BRIDGE_NOT_CONFIGURED: true, BUSY_OR_CONSENT_OR_LIMIT: true, REQUEST_PENDING: true, STATE_CHANGED: true, CSRF: true }[error?.code] ? "SERVICE_UNAVAILABLE" : "REQUEST_FAILED";
  return [phase, code, ...Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? [error.status] : []].join(" \xB7 ");
}
function createAuthSession({ api, authenticate, loadWorkspace, openWorkspace, identityChanged, view: view2, timeoutMs = 15e3, workspaceTimeoutMs = 65e3 }) {
  let generation = 0, operation = null, identity = null, config = null, configError = null, configFlight = null, loginFlight = null, phase = "checking", lastError = null;
  const emit = (next, error = null) => {
    phase = next;
    lastError = error;
    view2({ phase, identity, config, error });
  };
  const current = (job) => job.id === generation && !job.controller.signal.aborted;
  const begin = () => {
    operation?.controller.abort();
    const job = { id: ++generation, controller: new AbortController() };
    operation = job;
    return job;
  };
  const drop = () => {
    identity = null;
    identityChanged(null);
  };
  function configuration() {
    if (config) return Promise.resolve(config);
    if (configFlight) return configFlight;
    configFlight = bounded((signal) => api("/auth/config", { signal }), { timeoutMs }).then((value) => {
      if (!["firebase_google", "direct_google"].includes(value?.provider)) throw new AuthError("SETUP_REQUIRED");
      config = value;
      configError = null;
      return config;
    }).catch((error) => {
      configError = error;
      return null;
    }).finally(() => {
      configFlight = null;
      if (phase === "signed-out") emit(phase, lastError || configError);
    });
    return configFlight;
  }
  async function workspace(job) {
    emit("loading");
    try {
      const data = await bounded((signal) => loadWorkspace(signal), { signal: job.controller.signal, timeoutMs: workspaceTimeoutMs });
      if (!current(job)) return;
      if (!data?.state) throw new AuthError("INVALID_RESPONSE");
      openWorkspace(data);
      if (current(job)) emit("ready");
    } catch (error) {
      if (!current(job)) return;
      if (error.status === 401 && error.code === "SIGN_IN") {
        drop();
        emit("signed-out", error);
        configuration();
      } else emit("workspace-error", error);
    }
  }
  async function restore(job, { afterLogin = false, loginError = null } = {}) {
    emit("checking");
    try {
      const value = await bounded((signal) => api("/api/session", { signal }), { signal: job.controller.signal, timeoutMs });
      if (!current(job)) return;
      if (!value?.csrf || !["active", "pending"].includes(value.user?.status) || !["admin", "member"].includes(value.user?.role)) throw new AuthError("INVALID_RESPONSE");
      identity = value;
      identityChanged(value);
      if (value.user.status === "pending") {
        emit("pending");
        return;
      }
      await workspace(job);
    } catch (error) {
      if (!current(job)) return;
      if (error.status === 401 && error.code === "SIGN_IN") {
        drop();
        emit("signed-out", afterLogin ? loginError || new AuthError("SESSION_NOT_SAVED") : null);
        configuration();
      } else emit("session-error", error);
    }
  }
  function start2() {
    const job = begin();
    configuration();
    return restore(job);
  }
  function retry() {
    if (["checking", "loading", "signing-in", "finishing", "signing-out", "claiming"].includes(phase)) return Promise.resolve();
    const job = begin();
    configuration();
    return restore(job);
  }
  function login(invite = "") {
    if (loginFlight) return loginFlight;
    if (phase !== "signed-out" || !config) return Promise.resolve();
    const job = begin();
    emit("signing-in");
    let task;
    try {
      task = authenticate(config, invite, { signal: job.controller.signal, onPhase: (next) => {
        if (current(job)) emit(next);
      } });
    } catch (error) {
      task = Promise.reject(error);
    }
    loginFlight = (async () => {
      try {
        const result = await task;
        if (!current(job) || result?.redirect) return;
        await restore(job, { afterLogin: true });
      } catch (error) {
        if (!current(job)) return;
        if (error.ambiguous) await restore(job, { afterLogin: true, loginError: error });
        else emit("signed-out", error);
      }
    })().finally(() => {
      loginFlight = null;
    });
    return loginFlight;
  }
  async function logout() {
    if (phase === "signing-out") return;
    const job = begin();
    emit("signing-out");
    try {
      await bounded((signal) => api("/api/logout", { method: "POST", body: {}, signal }), { signal: job.controller.signal, timeoutMs });
      if (!current(job)) return;
      drop();
      emit("signed-out");
      configuration();
    } catch (error) {
      if (!current(job)) return;
      if (error.status === 401 && error.code === "SIGN_IN") {
        drop();
        emit("signed-out");
        configuration();
      } else emit("logout-error", error);
    }
  }
  async function claim(token) {
    if (phase !== "pending") return;
    const job = begin();
    emit("claiming");
    try {
      await bounded((signal) => api("/api/invites/claim", { method: "POST", body: { token }, signal }), { signal: job.controller.signal, timeoutMs });
      if (current(job)) await restore(job);
    } catch (error) {
      if (!current(job)) return;
      if (error.status === 401 && error.code === "SIGN_IN") {
        drop();
        emit("signed-out", error);
        configuration();
      } else if (!error.status || error.status >= 500 || error.code === "INVALID_RESPONSE") {
        await restore(job);
        if (current(job) && phase === "pending") emit("pending", error);
      } else emit("pending", error);
    }
  }
  function signedOut(error = null) {
    begin();
    drop();
    emit("signed-out", error);
    configuration();
  }
  function expired() {
    signedOut(new AuthError("SIGN_IN"));
  }
  return { start: start2, retry, login, logout, claim, expired, signedOut, get phase() {
    return phase;
  }, get identity() {
    return identity;
  } };
}

// cloudflare-saas/public/recipe-page-calls.js
function createRecipePageCalls({ call: call2, epoch, timeoutMs = 65e3 }) {
  let tail = Promise.resolve(), session2 = epoch();
  const pending = /* @__PURE__ */ new Set();
  function invoke(...args) {
    const stamp = epoch();
    if (stamp !== session2) {
      session2 = stamp;
      tail = Promise.resolve();
      pending.clear();
    }
    const result = tail.catch(() => {
    }).then(() => {
      if (stamp !== epoch()) throw Object.assign(Error("\u0421\u0435\u0430\u043D\u0441 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u044D\u043A\u0440\u0430\u043D."), { code: "STALE_SESSION" });
      if (args[2]?.signal?.aborted) throw Object.assign(Error("\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E."), { name: "AbortError" });
      return bounded((signal) => call2(args[0], args[1], { ...args[2], signal }), { signal: args[2]?.signal, timeoutMs }).catch((error) => {
        if (error.code === "NETWORK_TIMEOUT") error.message = "\u041E\u0442\u0432\u0435\u0442 \u043D\u0435 \u043F\u0440\u0438\u0448\u0451\u043B \u0432\u043E\u0432\u0440\u0435\u043C\u044F. \u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u0451\u043D. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u0435\u0440\u0435\u0434 \u043D\u043E\u0432\u044B\u043C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435\u043C.";
        throw error;
      });
    });
    tail = result;
    pending.add(result);
    result.then(() => pending.delete(result), () => pending.delete(result));
    return result;
  }
  async function settle(current) {
    while (pending.size) {
      await Promise.allSettled([...pending]);
      if (!current()) return false;
    }
    return current();
  }
  return { invoke, settle };
}

// cloudflare-saas/public/today-plan.js
function localCalendarDate(date = /* @__PURE__ */ new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function renderTodayPlan({ plan, draft, root, empty, el: el2, formatDate: formatDate2, openRecipe: openRecipe2, acceptPlan, now = /* @__PURE__ */ new Date() }) {
  const otherWasOpen = root.querySelector?.("details")?.open === true;
  const today = localCalendarDate(now), days = plan?.days || [], todayDays = days.filter((d2) => d2.date === today), otherDays = days.filter((d2) => d2.date !== today);
  empty.hidden = Boolean(plan) && !draft && plan.status !== "stale_requires_recheck" && todayDays.some((d2) => d2.meals.length > 0);
  if (!empty.querySelector?.(".menu-empty-hint")) empty.append(el2("p", "ux-hint menu-empty-hint", "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0431\u043B\u044E\u0434\u043E \u0432 \xAB\u0420\u0435\u0446\u0435\u043F\u0442\u0430\u0445\xBB \u0438\u043B\u0438 \u043F\u043E\u0434\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0435\u043D\u044E \u0447\u0435\u0440\u0435\u0437 \xAB\u041F\u043B\u0430\u043D \u043D\u0430 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0434\u043D\u0435\u0439\xBB."));
  root.replaceChildren(...plan ? [el2("h2", "", draft ? "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043C\u0435\u043D\u044E" : "\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0435 \u043C\u0435\u043D\u044E")] : [], el2("p", "ux-hint", "\xAB\u041C\u043E\u0451 \u043C\u0435\u043D\u044E\xBB \u2014 \u0432\u0430\u0448 \u043F\u043B\u0430\u043D \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u044F. \u0414\u043B\u044F \u043F\u043E\u043A\u0443\u043F\u043E\u043A \u0441\u043C\u043E\u0442\u0440\u0438\u0442\u0435 \u043E\u0431\u044A\u0451\u043C \u0432\u0441\u0435\u0433\u043E \u0431\u043B\u044E\u0434\u0430, \u0434\u043B\u044F \u0441\u0435\u0431\u044F \u2014 \u0440\u0430\u0437\u043C\u0435\u0440 \u043F\u043E\u0440\u0446\u0438\u0438; \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0439\u0442\u0435 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E \u0432 \xAB\u0414\u043D\u0435\u0432\u043D\u0438\u043A\xBB."));
  if (draft) root.append(el2("p", "ux-callout", "\u042D\u0442\u043E \u043F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u043C\u0435\u043D\u044E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0431\u043B\u044E\u0434\u0430 \u0438 \u0433\u0440\u0430\u043C\u043C\u043E\u0432\u043A\u0438, \u0437\u0430\u0442\u0435\u043C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0432\u044B\u0431\u043E\u0440."));
  if (plan?.status === "stale_requires_recheck") root.append(el2("div", "notice danger", "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F: \u044D\u0442\u043E \u043C\u0435\u043D\u044E \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u0435\u0440\u0435\u0441\u0447\u0451\u0442\u0430. \u041D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u0430\u043A \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0435."));
  function dayCard(day) {
    const box = el2("article", "menu-day");
    box.append(el2("h3", "", formatDate2(day.date)));
    for (const meal of day.meals) {
      const part = el2("div", "meal");
      part.append(el2("h3", "", meal.name_ru));
      const b2 = el2("button", "text-btn", "\u0413\u0440\u0430\u043C\u043C\u043E\u0432\u043A\u0438 \u0438 \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u0435");
      b2.addEventListener("click", () => openRecipe2(meal));
      part.append(b2);
      box.append(part);
    }
    return box;
  }
  for (const day of todayDays) root.append(dayCard(day));
  if (otherDays.length) {
    const details = el2("details", "panel");
    details.open = otherWasOpen;
    details.append(el2("summary", "", "\u0414\u0440\u0443\u0433\u0438\u0435 \u0434\u043D\u0438 \u043F\u043B\u0430\u043D\u0430"), ...otherDays.map(dayCard));
    root.append(details);
  }
  if (draft) {
    const b2 = el2("button", "primary", "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u043E \u043C\u0435\u043D\u044E");
    b2.addEventListener("click", acceptPlan);
    root.append(b2);
  }
}

// cloudflare-saas/public/media.js
var RecorderController = class {
  constructor({ mediaDevices, Recorder, onState, onAudio, clock = () => Date.now(), interval = (fn, ms) => globalThis.setInterval(fn, ms), clear = (id) => globalThis.clearInterval(id) }) {
    Object.assign(this, { mediaDevices, Recorder, onState, onAudio, clock, interval, clear });
    this.generation = 0;
    this.mode = "idle";
  }
  emit(mode, message = "") {
    this.mode = mode;
    this.onState({ mode, message, seconds: Math.min(60, Math.floor((this.clock() - (this.started ?? this.clock())) / 1e3)) });
  }
  release() {
    if (this.timer) this.clear(this.timer);
    this.timer = null;
    for (const track of this.stream?.getTracks() || []) {
      track.onended = null;
      track.stop();
    }
    this.stream = null;
  }
  async start() {
    if (this.mode !== "idle") return;
    const generation = ++this.generation;
    this.emit("permission", "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u0434\u043B\u044F \u044D\u0442\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u0438.");
    try {
      if (!this.mediaDevices?.getUserMedia || !this.Recorder) throw Error("\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0434\u0438\u043A\u0442\u043E\u0432\u043A\u0443 \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u044B \u0438\u043B\u0438 \u0442\u0435\u043A\u0441\u0442.");
      const mime = ["audio/mp4", "audio/webm"].find((x) => this.Recorder.isTypeSupported(x));
      if (!mime) throw Error("\u042D\u0442\u043E\u0442 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u044C MP4/WebM. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u0443.");
      const stream = await this.mediaDevices.getUserMedia({ audio: true });
      if (generation !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      for (const track of stream.getTracks()) track.onended = () => this.cancel("\u0417\u0430\u043F\u0438\u0441\u044C \u043F\u0440\u0435\u0440\u0432\u0430\u043D\u0430. \u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u043D\u043E\u0432\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C.");
      const recorder = new this.Recorder(stream, { mimeType: mime, audioBitsPerSecond: 64e3 });
      this.recorder = recorder;
      this.parts = [];
      this.bytes = 0;
      this.started = this.clock();
      recorder.ondataavailable = (e) => {
        if (generation !== this.generation) return;
        if (e.data?.size) {
          this.parts.push(e.data);
          this.bytes += e.data.size;
          if (this.bytes > 1e6) this.cancel("\u0417\u0430\u043F\u0438\u0441\u044C \u0431\u043E\u043B\u044C\u0448\u0435 1 \u041C\u0411. \u0417\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043A\u043E\u0440\u043E\u0447\u0435.");
        }
      };
      recorder.onerror = () => this.cancel("\u0417\u0430\u043F\u0438\u0441\u044C \u043F\u0440\u0435\u0440\u0432\u0430\u043D\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.");
      recorder.onstop = async () => {
        this.release();
        if (generation !== this.generation) return;
        try {
          const blob = new Blob(this.parts, { type: mime });
          this.parts = [];
          if (!blob.size) throw Error("\u0417\u0430\u043F\u0438\u0441\u044C \u043F\u0443\u0441\u0442\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.");
          if (blob.size > 1e6) throw Error("\u0417\u0430\u043F\u0438\u0441\u044C \u0431\u043E\u043B\u044C\u0448\u0435 1 \u041C\u0411.");
          this.abort = new AbortController();
          this.emit("recognizing", "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u044E\u2026 \u041C\u043E\u0436\u043D\u043E \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C.");
          const text = await this.onAudio(blob, mime, this.abort.signal);
          if (generation !== this.generation) return;
          this.emit("idle", "\u0422\u0435\u043A\u0441\u0442 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0435\u0433\u043E \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C\xBB.");
        } catch (e) {
          if (generation === this.generation) this.emit("idle", e.name === "AbortError" ? "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E." : e.message);
        } finally {
          this.parts = [];
        }
      };
      recorder.start(250);
      this.emit("recording", "\u0418\u0434\u0451\u0442 \u0437\u0430\u043F\u0438\u0441\u044C");
      this.timer = this.interval(() => {
        this.emit("recording", "\u0418\u0434\u0451\u0442 \u0437\u0430\u043F\u0438\u0441\u044C");
        if (this.clock() - this.started >= 6e4) this.stop();
      }, 250);
    } catch (e) {
      this.release();
      if (generation === this.generation) this.emit("idle", e.name === "NotAllowedError" ? "\u041D\u0435\u0442 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u043D\u0430 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D. \u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0435\u0433\u043E \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u0441\u0430\u0439\u0442\u0430 \u0438\u043B\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442." : e.message);
    }
  }
  stop() {
    if (this.mode === "recording" && this.recorder?.state === "recording") {
      this.recorder.stop();
      this.release();
    }
  }
  cancel(message = "\u0417\u0430\u043F\u0438\u0441\u044C \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430.") {
    this.generation++;
    this.abort?.abort();
    if (this.recorder?.state === "recording") this.recorder.stop();
    this.release();
    this.parts = [];
    this.emit("idle", message);
  }
};
async function blobBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text = "";
  for (const b2 of bytes) text += String.fromCharCode(b2);
  return btoa(text);
}
async function prepareImage(file, { bitmap = globalThis.createImageBitmap, document: document2 = globalThis.document, URL: URL2 = globalThis.URL, Image = globalThis.Image } = {}) {
  if (!file || !file.type?.startsWith("image/") || file.size > 12e6) throw Error("\u041D\u0443\u0436\u043D\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0434\u043E 12 \u041C\u0411.");
  let source, url;
  try {
    if (bitmap) source = await bitmap(file);
    else {
      url = URL2.createObjectURL(file);
      source = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    }
    const width = source.width || source.naturalWidth, height = source.height || source.naturalHeight;
    if (!width || !height || width * height > 24e6) throw Error("\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435.");
    const canvas = document2.createElement("canvas");
    let scale = Math.min(1, 1024 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/jpeg", 0.78);
    if (result.length > 13e5) throw Error("\u041F\u043E\u0441\u043B\u0435 \u0441\u0436\u0430\u0442\u0438\u044F \u0444\u043E\u0442\u043E \u0431\u043E\u043B\u044C\u0448\u0435 1 \u041C\u0411. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0435\u043D\u044C\u0448\u0438\u0439 \u0441\u043D\u0438\u043C\u043E\u043A.");
    return result;
  } catch (e) {
    throw Error(e.message?.includes("\u041C\u0411") ? e.message : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u043E\u0442\u043E. \u0414\u043B\u044F HEIC \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044D\u043A\u0441\u043F\u043E\u0440\u0442 \u0432 JPEG/PNG \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.");
  } finally {
    source?.close?.();
    if (url) URL2.revokeObjectURL(url);
  }
}
function setupChatImages({ root, $: $3, prepare = prepareImage, link, epoch, setImage, notify: notify2, openDialog, closeDialog }) {
  let generation = 0;
  const current = (g, e) => g === generation && e === epoch();
  function closeLink(history2 = true) {
    const d2 = $3("image-link-details");
    if (history2 && d2.open && closeDialog) {
      closeDialog();
      return;
    }
    if (typeof d2.close === "function") {
      if (d2.open) d2.close();
    } else d2.open = false;
  }
  function openLink() {
    if (openDialog) {
      openDialog("image", "image-link-url");
      return;
    }
    const d2 = $3("image-link-details");
    if (typeof d2.showModal === "function") {
      if (!d2.open) d2.showModal();
    } else d2.open = true;
    $3("image-link-url").focus();
  }
  function reset() {
    generation++;
    closeLink(false);
    $3("image-link-load").disabled = false;
    setImage(null);
    $3("message").required = true;
    $3("photo-preview").hidden = true;
    $3("photo-preview-image").removeAttribute("src");
    $3("photo").value = "";
    $3("photo-status").textContent = "";
    $3("image-link-url").value = "";
    $3("image-drop-zone").classList.remove("dragging");
  }
  function display(value) {
    setImage(value);
    $3("message").required = false;
    $3("photo-preview-image").src = value;
    $3("photo-preview").hidden = false;
    $3("photo-status").textContent = "\u0424\u043E\u0442\u043E \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043E. \u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0441 \u0432\u0430\u0448\u0438\u043C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u043C.";
  }
  async function attach(file) {
    const g = ++generation, e = epoch();
    try {
      const value = await prepare(file);
      if (current(g, e)) display(value);
    } catch (error) {
      if (current(g, e)) notify2(error.message);
    }
  }
  function first(files) {
    const images = [...files].filter((f) => f.type?.startsWith("image/"));
    if (images.length) {
      if (images.length > 1) notify2("\u0417\u0430 \u043E\u0434\u043D\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043E\u0434\u043D\u043E \u0444\u043E\u0442\u043E. \u0412\u044B\u0431\u0440\u0430\u043D\u043E \u043F\u0435\u0440\u0432\u043E\u0435.");
      void attach(images[0]);
      return true;
    }
    if (files.length) notify2("\u041D\u0443\u0436\u0435\u043D \u0444\u0430\u0439\u043B \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F. \u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u043C\u043E\u0436\u043D\u043E \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442\u043E\u043C \u0438\u043B\u0438 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u043C.");
    return false;
  }
  function offerUrl(value) {
    const url = String(value || "").split("\n").find((x) => x.trim() && !x.startsWith("#"));
    if (!url) return;
    try {
      if (new URL(url).protocol !== "https:") throw Error();
      $3("image-link-url").value = url;
      openLink();
      notify2("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u043E\u0442\u043E \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0435\xBB.");
    } catch {
      notify2("\u041D\u0443\u0436\u043D\u0430 \u043F\u0440\u044F\u043C\u0430\u044F \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u0430\u044F HTTPS-\u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435.");
    }
  }
  $3("photo").onchange = (e) => first(e.target.files || []);
  $3("photo-remove").onclick = reset;
  root.addEventListener("paste", (e) => {
    const files = [...e.clipboardData?.items || []].filter((x) => x.kind === "file" && x.type.startsWith("image/")).map((x) => x.getAsFile()).filter(Boolean);
    if (!files.length) {
      const text2 = (e.clipboardData?.getData("text/plain") || "").trim();
      if (/^https:\/\/[^\s]+$/i.test(text2) && (/\.(?:png|jpe?g|webp|gif)(?:[?#]|$)/i.test(text2) || /^https:\/\/(?:images\.unsplash\.com|images\.pexels\.com|upload\.wikimedia\.org)\//i.test(text2))) offerUrl(text2);
      return;
    }
    const text = e.clipboardData?.getData("text/plain");
    if (!text) e.preventDefault();
    first(files);
  });
  const zone = $3("image-drop-zone");
  zone.onclick = () => $3("photo").click();
  zone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $3("photo").click();
    }
  });
  const relevant = (e) => [...e.dataTransfer?.types || []].some((t) => ["Files", "text/uri-list"].includes(t));
  root.addEventListener("dragover", (e) => {
    if (relevant(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      zone.classList.add("dragging");
    }
  });
  root.addEventListener("dragleave", (e) => {
    if (!root.contains(e.relatedTarget)) zone.classList.remove("dragging");
  });
  root.addEventListener("drop", (e) => {
    if (!relevant(e)) return;
    e.preventDefault();
    zone.classList.remove("dragging");
    if (!first(e.dataTransfer.files || [])) offerUrl(e.dataTransfer.getData("text/uri-list"));
  });
  $3("image-link-open").onclick = openLink;
  $3("image-link-close").onclick = () => {
    generation++;
    closeLink();
    $3("image-link-load").disabled = false;
  };
  $3("image-link-details").addEventListener("cancel", (e) => {
    generation++;
    $3("image-link-load").disabled = false;
    if (closeDialog) {
      e.preventDefault();
      closeDialog();
    }
  });
  $3("image-link-load").onclick = async () => {
    const g = ++generation, e = epoch(), url = $3("image-link-url").value;
    $3("image-link-load").disabled = true;
    try {
      const value = await link(url);
      if (current(g, e)) {
        display(value);
        closeLink();
      }
    } catch (error) {
      if (current(g, e)) notify2(error.message);
    } finally {
      if (current(g, e)) $3("image-link-load").disabled = false;
    }
  };
  return { reset, attach, offerUrl, invalidate() {
    generation++;
  } };
}

// cloudflare-saas/public/shop-scanner.js
var libraryPromise;
function loadScanner() {
  if (globalThis.Quagga) return Promise.resolve(globalThis.Quagga);
  if (!libraryPromise) libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/quagga-1.13.0.min.js";
    script.onload = () => globalThis.Quagga ? resolve(globalThis.Quagga) : reject(Error("scanner unavailable"));
    script.onerror = () => reject(Error("scanner unavailable"));
    document.head.append(script);
  }).catch((e) => {
    libraryPromise = null;
    throw e;
  });
  return libraryPromise;
}
function validScanCode(s2) {
  if (typeof s2 !== "string" || !/^\d+$/.test(s2) || ![8, 12, 13].includes(s2.length)) return false;
  let sum = 0;
  for (let i = s2.length - 2, j2 = 0; i >= 0; i--, j2++) sum += Number(s2[i]) * (j2 % 2 ? 1 : 3);
  return (10 - sum % 10) % 10 === Number(s2.at(-1));
}
function createScanner({ video, load = loadScanner, getMedia = (constraints) => navigator.mediaDevices.getUserMedia(constraints), replaceVideo = (old) => {
  const fresh = old.cloneNode(false);
  old.replaceWith(fresh);
  return fresh;
}, capture = (preview) => {
  const canvas = document.createElement("canvas");
  canvas.width = preview.videoWidth;
  canvas.height = preview.videoHeight;
  if (!canvas.width || !canvas.height) return null;
  canvas.getContext("2d").drawImage(preview, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.85);
}, schedule = (fn, ms) => setTimeout(fn, ms), cancelTimer = (id) => clearTimeout(id), onState = () => {
}, onCode = () => {
} }) {
  let token = 0, stream = null, active = false, timer = null, flight2 = Promise.resolve();
  function stop() {
    token++;
    active = false;
    if (timer !== null) cancelTimer(timer);
    timer = null;
    const s2 = stream;
    stream = null;
    if (s2) for (const track of s2.getTracks()) track.stop();
    video.srcObject = null;
    video.hidden = true;
  }
  async function start2() {
    stop();
    const id = token;
    active = true;
    onState("opening");
    try {
      video = replaceVideo(video);
      const preview = video;
      preview.hidden = false;
      const lib = await load();
      if (id !== token) return;
      const acquired = await getMedia({ audio: false, video: { facingMode: "environment" } });
      if (id !== token) {
        for (const t of acquired.getTracks()) t.stop();
        return;
      }
      stream = acquired;
      for (const track of acquired.getTracks()) track.addEventListener?.("ended", () => {
        if (id === token) {
          stop();
          onState("error");
        }
      }, { once: true });
      preview.srcObject = acquired;
      await preview.play();
      if (id !== token) return;
      onState("scanning");
      async function scan() {
        try {
          await flight2.catch(() => {
          });
          if (id !== token || !active) return;
          const src = capture(preview);
          if (src) {
            const work = Promise.resolve().then(() => lib.decodeSingle({ src, numOfWorkers: 0, locate: true, decoder: { readers: ["ean_reader", "ean_8_reader", "upc_reader"] } }));
            flight2 = work;
            const result = await work;
            if (id !== token || !active) return;
            const code = result?.codeResult?.code;
            if (validScanCode(code)) {
              stop();
              onCode(code);
              return;
            }
          }
          if (id === token && active) timer = schedule(() => {
            timer = null;
            scan();
          }, 500);
        } catch (e) {
          if (id === token) {
            stop();
            onState("error");
          }
        }
      }
      scan();
    } catch (e) {
      if (id !== token) return;
      stop();
      onState(e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "denied" : "error");
    }
  }
  return { start: start2, stop };
}

// cloudflare-saas/public/shop-ui.js
function setupShop({ $: $3, el: el2, call: call2, api, getState, accept: accept2, run: run2, epoch, allergens, prepare = prepareImage, scannerFactory = createScanner, onPantryPreview = () => {
}, onPantryReset = () => {
}, onOwnFood = () => {
}, setView: setView2 = () => {
}, openIntake }) {
  const root = $3("shop-root");
  let image2 = null, generation = 0, pending = null, saved = null, source = null, abort = null, ready = true, preparing = false, ownHint = null, pantryPending = null, pantryBusy = false, uncertainLabelAttempt = null;
  root.innerHTML = `<details class="panel"><summary data-icon="barcode">\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u0432 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435</summary><p class="ux-hint">\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0438\u0449\u0435\u0442 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0438 \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E \u0438\u043B\u0438 \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434\u0443 \u0438\u0437 \u0420\u043E\u0441\u0441\u0438\u0438, \u0411\u0435\u043B\u0430\u0440\u0443\u0441\u0438 \u0438 \u0434\u0440\u0443\u0433\u0438\u0445 \u0441\u0442\u0440\u0430\u043D; \u043F\u0435\u0440\u0435\u0434 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435\u043C \u0441\u0432\u0435\u0440\u044C\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C \u0441 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u043E\u0439.</p><div id="shop-search-stage" hidden><form id="shop-search-form"><label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438\u043B\u0438 \u0431\u0440\u0435\u043D\u0434<input id="shop-query" minlength="2" maxlength="80" required></label><label class="check"><input id="shop-wide" type="checkbox"> \u0418\u0441\u043A\u0430\u0442\u044C \u043F\u043E \u0432\u0441\u0435\u043C \u0441\u0442\u0440\u0430\u043D\u0430\u043C</label><button type="submit">\u041D\u0430\u0439\u0442\u0438 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0443</button></form><p class="ux-hint">\u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E \u0438\u0449\u0435\u043C \u0437\u0430\u043F\u0438\u0441\u0438 \u0434\u043B\u044F \u0420\u043E\u0441\u0441\u0438\u0438 \u0438 \u0411\u0435\u043B\u0430\u0440\u0443\u0441\u0438; \u0434\u043B\u044F \u0434\u0440\u0443\u0433\u0438\u0445 \u0441\u0442\u0440\u0430\u043D \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \xAB\u0418\u0441\u043A\u0430\u0442\u044C \u043F\u043E \u0432\u0441\u0435\u043C \u0441\u0442\u0440\u0430\u043D\u0430\u043C\xBB. \u0423\u043A\u0430\u0437\u0430\u043D\u043D\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0430 \u043D\u0435 \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0440\u0443\u0435\u0442 \u043D\u0430\u043B\u0438\u0447\u0438\u0435 \u0432 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0435.</p><div id="shop-search-results" aria-live="polite"></div></div><div id="shop-methods" class="shop-methods"><button id="shop-name-method" type="button" data-icon="search">\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E</button><button id="shop-scan" type="button" data-icon="scan">\u0421\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434</button><button id="shop-barcode-method" type="button" data-icon="barcode">\u0412\u0432\u0435\u0441\u0442\u0438 \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434</button><button id="shop-photo-method" type="button" data-icon="camera">\u0424\u043E\u0442\u043E \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0438</button><button id="shop-manual" type="button" data-icon="edit">\u0412\u0432\u0435\u0441\u0442\u0438 \u0432\u0440\u0443\u0447\u043D\u0443\u044E</button></div><button id="shop-other-method" class="secondary" type="button" hidden data-icon="left">\u0414\u0440\u0443\u0433\u043E\u0439 \u0441\u043F\u043E\u0441\u043E\u0431</button><div id="shop-scanner" hidden><p class="ux-hint">\u0415\u0441\u043B\u0438 \u043A\u0430\u043C\u0435\u0440\u0430 \u043D\u0435 \u0441\u043A\u0430\u043D\u0438\u0440\u0443\u0435\u0442 \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434, \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0435\u0433\u043E \u0446\u0438\u0444\u0440\u044B \u0432\u0440\u0443\u0447\u043D\u0443\u044E \u0432 \u043F\u043E\u043B\u0435 \u043D\u0438\u0436\u0435.</p><video id="shop-video" muted playsinline></video><button id="shop-stop-scan" type="button">\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u043C\u0435\u0440\u0443</button></div><div id="shop-photo-stage" hidden><p class="ux-hint">\u0424\u043E\u0442\u043E \u0447\u0438\u0442\u0430\u0435\u0442 \u0442\u0430\u0431\u043B\u0438\u0446\u0443 \u043F\u0438\u0449\u0435\u0432\u043E\u0439 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u043F\u043E\u0441\u043B\u0435 \u043D\u0430\u0436\u0430\u0442\u0438\u044F \xAB\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0443\xBB \u2014 \u0441\u043D\u0438\u043C\u0438\u0442\u0435 \u0442\u0430\u0431\u043B\u0438\u0446\u0443 \u0440\u043E\u0432\u043D\u043E \u0438 \u0431\u0435\u0437 \u0431\u043B\u0438\u043A\u043E\u0432.</p><div class="shop-photo-actions"><label class="secondary photo-button shop-file-label">\u0421\u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0443<input id="shop-camera" type="file" accept="image/*" capture="environment"></label><label class="secondary photo-button shop-file-label">\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0444\u043E\u0442\u043E<input id="shop-photo" type="file" accept="image/*"></label></div><img id="shop-preview" alt="\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0435 \u0444\u043E\u0442\u043E \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0438" hidden style="max-width:100%;max-height:240px"><button id="shop-read" type="button" disabled data-icon="scan">\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0443</button><button id="shop-cancel" type="button" hidden>\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435</button></div><div id="shop-barcode-stage" hidden><p class="ux-hint">\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0446\u0438\u0444\u0440\u044B \u043F\u043E\u0434 \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434\u043E\u043C, \u0435\u0441\u043B\u0438 \u043E\u043D \u043D\u0435 \u0441\u043A\u0430\u043D\u0438\u0440\u0443\u0435\u0442\u0441\u044F \u043A\u0430\u043C\u0435\u0440\u043E\u0439; \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0443\u0436\u043D\u043E \u0441\u0432\u0435\u0440\u0438\u0442\u044C \u0441 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u043E\u0439.</p><label>\u0428\u0442\u0440\u0438\u0445\u043A\u043E\u0434<input id="shop-barcode" inputmode="numeric" maxlength="14"></label><button id="shop-find" type="button" data-icon="search">\u041D\u0430\u0439\u0442\u0438 \u043F\u043E \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434\u0443</button></div><p id="shop-status" role="status"></p><div id="shop-candidate"></div><form id="shop-form" hidden><h3>\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442</h3><p class="ux-callout" data-shop-loaded hidden>\u0414\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B \u0434\u043B\u044F \u0441\u0432\u0435\u0440\u043A\u0438 \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0447\u0438\u0441\u043B\u0430 \u0438 \u043E\u0441\u043D\u043E\u0432\u0443 \u043F\u043E \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435. \u041F\u0440\u043E\u0434\u0443\u043A\u0442 \u0435\u0449\u0451 \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D.</p><p>\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043A\u0430\u043A \u0443\u043A\u0430\u0437\u0430\u043D\u043E \u043D\u0430 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435 \u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0441\u043D\u043E\u0432\u0443. \u0414\u043B\u044F 100 \u043C\u043B \u0438\u043B\u0438 \u043F\u043E\u0440\u0446\u0438\u0438 \u043D\u0443\u0436\u043D\u0430 \u044F\u0432\u043D\u043E \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043C\u0430\u0441\u0441\u0430 \u0432 \u0433\u0440\u0430\u043C\u043C\u0430\u0445. \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0435 \u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u0443\u0441\u0442\u044B\u043C.</p><label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435<input name="name" maxlength="200" required></label><label>\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435<select name="state" required><option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435</option><option value="ready_to_eat">\u0413\u043E\u0442\u043E\u0432 \u043A \u0443\u043F\u043E\u0442\u0440\u0435\u0431\u043B\u0435\u043D\u0438\u044E</option><option value="raw">\u0421\u044B\u0440\u043E\u0439</option><option value="dry">\u0421\u0443\u0445\u043E\u0439</option><option value="cooked">\u0413\u043E\u0442\u043E\u0432\u044B\u0439</option><option value="canned">\u041A\u043E\u043D\u0441\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439</option><option value="ready_to_cook">\u0414\u043B\u044F \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u044F</option></select></label><label>\u041E\u0441\u043D\u043E\u0432\u0430 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439<select name="unit_basis" required><option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0441\u043D\u043E\u0432\u0443</option><option value="per100g">\u041D\u0430 100 \u0433</option><option value="per100ml">\u041D\u0430 100 \u043C\u043B</option><option value="perserving">\u041D\u0430 \u043F\u043E\u0440\u0446\u0438\u044E</option></select></label><label data-shop-mass-wrap><span data-shop-mass-label>\u041C\u0430\u0441\u0441\u0430 100 \u043C\u043B \u0438\u043B\u0438 \u043F\u043E\u0440\u0446\u0438\u0438, \u0433</span><input name="basis_mass" inputmode="decimal"></label><p class="ux-hint" data-shop-basis-hint>\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435, \u043A \u043A\u0430\u043A\u043E\u0439 \u043E\u0441\u043D\u043E\u0432\u0435 \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u0447\u0438\u0441\u043B\u0430 \u043D\u0430 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0435.</p><label>\u042D\u043D\u0435\u0440\u0433\u0438\u044F, \u043A\u043A\u0430\u043B<input name="energy_kcal" inputmode="decimal"></label><label>\u0411\u0435\u043B\u043A\u0438, \u0433<input name="protein_g" inputmode="decimal"></label><label>\u0416\u0438\u0440\u044B, \u0433<input name="fat_g" inputmode="decimal"></label><label>\u0423\u0433\u043B\u0435\u0432\u043E\u0434\u044B, \u0433<input name="carb" inputmode="decimal"></label><label>\u041A\u0430\u043A \u0443\u043A\u0430\u0437\u0430\u043D\u044B \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B<select name="basis"><option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043E\u0441\u043B\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438</option><option value="unknown">\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E</option><option value="total_includes_fiber">\u0412\u0441\u0435\u0433\u043E, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0443</option><option value="available_excludes_fiber">\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435, \u0431\u0435\u0437 \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0438</option></select></label><label>\u041A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430, \u0433<input name="fiber_g" inputmode="decimal"></label><p class="ux-hint">\u0421\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u044C \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432 \u043D\u0430 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0435. \u0415\u0441\u043B\u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E \u0438\u043B\u0438 \u043D\u0430 \u043F\u0430\u0447\u043A\u0435 \u043D\u0435\u0442 \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0438 \u2014 \u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u043E\u043B\u0435 \u043F\u0443\u0441\u0442\u044B\u043C (\xAB\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445\xBB, \u0430 \u043D\u0435 0).</p><details class="ux-guide"><summary>\u041A\u0430\u043A \u043E\u0442\u043B\u0438\u0447\u0430\u044E\u0442\u0441\u044F \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B \u043D\u0430 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0430\u0445 (\u0415\u0421/\u0421\u041D\u0413 \u0438 \u0421\u0428\u0410)?</summary><div class="ux-guide-body"><p>\u041D\u0430 \u043C\u043D\u043E\u0433\u0438\u0445 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0430\u0445 \u0421\u0428\u0410 \xABTotal Carbohydrate\xBB \u0432\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0443 (\xAB\u0412\u0441\u0435\u0433\u043E, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0443\xBB). \u041D\u0430 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0430\u0445 \u0415\u0421, \u0412\u0435\u043B\u0438\u043A\u043E\u0431\u0440\u0438\u0442\u0430\u043D\u0438\u0438 \u0438 \u0447\u0430\u0441\u0442\u0438 \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u0421\u041D\u0413 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B \u0447\u0430\u0441\u0442\u043E \u0443\u0436\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B \u0431\u0435\u0437 \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0438 (\xAB\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435, \u0431\u0435\u0437 \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0438\xBB) \u2014 \u0438\u0437 \u043D\u0438\u0445 \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0443 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E \u0432\u044B\u0447\u0438\u0442\u0430\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F. \u0415\u0441\u043B\u0438 \u043F\u043E \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435 \u044D\u0442\u043E \u043D\u0435\u043E\u0447\u0435\u0432\u0438\u0434\u043D\u043E, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \xAB\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\xBB.</p></div></details><details id="shop-allergen-review"><summary>\u0410\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0443</summary><fieldset id="shop-allergens"><legend>\u041E\u0442\u043C\u0435\u0442\u044C\u0442\u0435 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B \u0441 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0438</legend></fieldset></details><label class="check"><input name="confirm" type="checkbox"> \u042F \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u043B(\u0430) \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435, \u043E\u0441\u043D\u043E\u0432\u0443, \u043C\u0430\u0441\u0441\u0443, \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0438 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B \u043F\u043E \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435</label><details id="shop-portion-options"><summary>\u041F\u043E\u0441\u0447\u0438\u0442\u0430\u0442\u044C \u0434\u0440\u0443\u0433\u0443\u044E \u043F\u043E\u0440\u0446\u0438\u044E</summary><p class="ux-hint">\u041F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u043F\u0435\u0440\u0435\u0441\u0447\u0451\u0442 \u043D\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u0443\u044E \u043C\u0430\u0441\u0441\u0443 \u2014 \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A \u0435\u0449\u0451 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E.</p><label>\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u043B\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u0432 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0439 \u0435\u0434\u0438\u043D\u0438\u0446\u0435 (\u0433, \u043C\u043B \u0438\u043B\u0438 \u043F\u043E\u0440\u0446\u0438\u0439)<input name="portion" inputmode="decimal"></label><button id="shop-portion" type="button">\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0442\u044C</button><p id="shop-portion-result" role="status"></p></details><p>\u0413\u043B\u0438\u043A\u0435\u043C\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0438\u043D\u0434\u0435\u043A\u0441: \u043D\u0435\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445.</p><button id="shop-submit" type="submit">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u0435\u0440\u0435\u0434 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435\u043C</button></form><div id="shop-next" hidden><p id="shop-saved-name"></p><p class="ux-callout">\u041F\u0440\u043E\u0434\u0443\u043A\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D. \u041F\u0440\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0438 \u0437\u0430\u043F\u0438\u0441\u0438 \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0435 100 \u0433 \u043C\u043E\u0436\u043D\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043D\u0430 \u0432\u0430\u0448\u0443 \u0444\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0443\u044E \u043F\u043E\u0440\u0446\u0438\u044E.</p><button id="shop-record" class="primary" type="button" data-icon="plus">\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435</button><details id="shop-next-options"><summary>\u0417\u0430\u043F\u0430\u0441\u044B \u0438 \u0441\u0432\u043E\u0451 \u0431\u043B\u044E\u0434\u043E</summary><p class="ux-hint">\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0432 \u0437\u0430\u043F\u0430\u0441\u044B \u0438\u043B\u0438 \u0441\u0431\u043E\u0440\u043A\u0430 \u0441\u0432\u043E\u0435\u0433\u043E \u0431\u043B\u044E\u0434\u0430 \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u044E\u0442 \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435 \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A.</p><label>\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0432 \u0437\u0430\u043F\u0430\u0441\u0430\u0445, \u0433<input id="shop-grams" inputmode="decimal"></label><div class="button-row"><button id="shop-pantry" type="button" data-icon="basket">\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0437\u0430\u043F\u0430\u0441\u044B</button><button id="shop-own" type="button" data-icon="recipe">\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0441\u0432\u043E\u0451 \u0431\u043B\u044E\u0434\u043E</button><button id="shop-suggest" type="button" hidden data-icon="recipe">\u041F\u043E\u0434\u043E\u0431\u0440\u0430\u0442\u044C \u0431\u043B\u044E\u0434\u043E</button></div></details></div></details>`;
  const form = $3("shop-form"), status = $3("shop-status"), preview = $3("shop-preview"), next = $3("shop-next");
  const basisHint = form.querySelector("[data-shop-basis-hint]"), loadedNotice = form.querySelector("[data-shop-loaded]"), massWrap = form.querySelector("[data-shop-mass-wrap]"), massLabel = form.querySelector("[data-shop-mass-label]");
  function syncBasisHint() {
    const b2 = form.elements.unit_basis.value;
    massWrap.hidden = b2 === "per100g";
    massLabel.textContent = b2 === "per100ml" ? "\u041C\u0430\u0441\u0441\u0430 100 \u043C\u043B, \u0433 (\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u0430 \u0434\u043B\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F)" : b2 === "perserving" ? "\u041C\u0430\u0441\u0441\u0430 1 \u043F\u043E\u0440\u0446\u0438\u0438, \u0433 (\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u0430 \u0434\u043B\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F)" : "\u041C\u0430\u0441\u0441\u0430 100 \u043C\u043B \u0438\u043B\u0438 \u043F\u043E\u0440\u0446\u0438\u0438, \u0433";
    basisHint.textContent = { per100g: "\u0412\u0441\u0435 \u0447\u0438\u0441\u043B\u0430 \u043D\u0438\u0436\u0435 \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u043A 100 \u0433 \u0441\u044A\u0435\u0434\u043E\u0431\u043D\u043E\u0439 \u0447\u0430\u0441\u0442\u0438 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430.", per100ml: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0443\u044E \u043C\u0430\u0441\u0441\u0443 100 \u043C\u043B \u044D\u0442\u043E\u0433\u043E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430 \u0432 \u0433\u0440\u0430\u043C\u043C\u0430\u0445: \u043C\u0438\u043B\u043B\u0438\u043B\u0438\u0442\u0440\u044B \u2014 \u044D\u0442\u043E \u043E\u0431\u044A\u0451\u043C, \u0438 100 \u043C\u043B \u043D\u0435 \u043F\u0440\u0438\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u043A 100 \u0433 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438.", perserving: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043C\u0430\u0441\u0441\u0443 \u043E\u0434\u043D\u043E\u0439 \u043F\u043E\u0440\u0446\u0438\u0438 \u0432 \u0433\u0440\u0430\u043C\u043C\u0430\u0445, \u043A \u043A\u043E\u0442\u043E\u0440\u043E\u0439 \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u0447\u0438\u0441\u043B\u0430 \u043D\u0430 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0435." }[b2] || "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435, \u043A \u043A\u0430\u043A\u043E\u0439 \u043E\u0441\u043D\u043E\u0432\u0435 \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u0447\u0438\u0441\u043B\u0430 \u043D\u0430 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0435.";
  }
  form.addEventListener("change", syncBasisHint);
  syncBasisHint();
  const scanner = scannerFactory({ video: $3("shop-video"), onState(state2) {
    status.textContent = { opening: "\u041E\u0436\u0438\u0434\u0430\u0435\u043C \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u043A\u0430\u043C\u0435\u0440\u0435. \u041C\u043E\u0436\u043D\u043E \u0437\u0430\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u043C\u0435\u0440\u0443 \u0438\u043B\u0438 \u0432\u0432\u0435\u0441\u0442\u0438 \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", scanning: "\u041D\u0430\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u0430\u043C\u0435\u0440\u0443 \u043D\u0430 \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434.", denied: "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u043A\u0430\u043C\u0435\u0440\u0435. \u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0434\u043E\u0441\u0442\u0443\u043F \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u0438\u043B\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", error: "\u041A\u0430\u043C\u0435\u0440\u0430 \u0438\u043B\u0438 \u0441\u043A\u0430\u043D\u0435\u0440 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B. \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434 \u0432\u0440\u0443\u0447\u043D\u0443\u044E \u0438\u043B\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0444\u043E\u0442\u043E \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0438." }[state2];
    if (state2 === "denied" || state2 === "error") $3("shop-scanner").hidden = true;
  }, onCode(code) {
    $3("shop-scanner").hidden = true;
    $3("shop-barcode").value = code;
    $3("shop-find").onclick();
  } });
  function stopScanner() {
    scanner.stop();
    $3("shop-scanner").hidden = true;
  }
  let searchToken = 0;
  $3("shop-query").addEventListener("input", () => {
    searchToken++;
    $3("shop-search-results").replaceChildren();
  });
  $3("shop-wide").addEventListener("change", () => {
    searchToken++;
    $3("shop-search-results").replaceChildren();
  });
  $3("shop-search-form").onsubmit = (e) => {
    e.preventDefault();
    run2(async () => {
      const token = ++searchToken, stamp = epoch(), query = $3("shop-query").value.trim(), wide = $3("shop-wide").checked, box = $3("shop-search-results");
      box.replaceChildren(el2("p", "muted", "\u0418\u0449\u0435\u043C \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0438\u2026"));
      try {
        const d2 = await api("/api/shop/search", "POST", { query, wide });
        if (token !== searchToken || stamp !== epoch()) return;
        box.replaceChildren();
        if (!d2.hits.length) box.append(el2("p", "muted", "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E. \u041C\u043E\u0436\u043D\u043E \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u043E\u0438\u0441\u043A \u043F\u043E \u0432\u0441\u0435\u043C \u0441\u0442\u0440\u0430\u043D\u0430\u043C, \u0441\u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0443 \u0438\u043B\u0438 \u0432\u0432\u0435\u0441\u0442\u0438 \u0434\u0430\u043D\u043D\u044B\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E."));
        for (const hit of d2.hits) {
          const b2 = el2("button", "secondary", [hit.name, hit.brand, ...hit.countries.map((c2) => ({ "en:russia": "\u0420\u043E\u0441\u0441\u0438\u044F", "en:belarus": "\u0411\u0435\u043B\u0430\u0440\u0443\u0441\u044C" })[c2]).filter(Boolean)].filter(Boolean).join(" \xB7 "));
          b2.type = "button";
          b2.onclick = () => {
            searchToken++;
            $3("shop-barcode").value = hit.code;
            $3("shop-find").onclick();
          };
          box.append(b2);
        }
        box.append(el2("p", "muted", "Open Food Facts \xB7 ODbL. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C \u0438 \u0441\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0441 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u043E\u0439."));
      } catch (err) {
        if (token === searchToken && stamp === epoch()) box.replaceChildren(el2("p", "muted", "\u041F\u043E\u0438\u0441\u043A \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D: " + err.message));
      }
    });
  };
  function leave() {
    stopScanner();
    searchToken++;
    generation++;
    const waiting = !$3("shop-cancel").hidden;
    abort?.abort();
    abort = null;
    if (waiting) {
      $3("shop-cancel").hidden = true;
      $3("shop-read").disabled = !image2;
      status.textContent = "\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E. \u0417\u0430\u043F\u0440\u043E\u0441 \u043C\u043E\u0433 \u0431\u044B\u0442\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D; \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043D\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442\u0441\u044F. \u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435.";
    }
  }
  function stage(name2) {
    $3("shop-methods").hidden = Boolean(name2);
    $3("shop-other-method").hidden = !name2;
    $3("shop-search-stage").hidden = name2 !== "name";
    $3("shop-barcode-stage").hidden = name2 !== "barcode" && name2 !== "scan";
    $3("shop-photo-stage").hidden = name2 !== "photo";
    form.hidden = !["manual", "review"].includes(name2);
    $3("shop-candidate").hidden = name2 !== "review";
    next.hidden = name2 !== "saved";
  }
  function method(name2) {
    leave();
    stage(name2);
  }
  $3("shop-other-method").onclick = () => {
    method("");
    status.textContent = "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043F\u043E\u0441\u043E\u0431. \u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435.";
  };
  stage("");
  $3("shop-name-method").onclick = () => method("name");
  $3("shop-barcode-method").onclick = () => method("barcode");
  $3("shop-scan").onclick = () => {
    method("scan");
    $3("shop-scanner").hidden = false;
    scanner.start();
  };
  $3("shop-stop-scan").onclick = () => {
    stopScanner();
    status.textContent = "\u041A\u0430\u043C\u0435\u0440\u0430 \u0437\u0430\u043A\u0440\u044B\u0442\u0430.";
  };
  $3("shop-photo-method").onclick = () => method("photo");
  const panel = root.querySelector("details");
  panel.addEventListener("toggle", () => {
    if (!panel.open) stopScanner();
  });
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopScanner();
  });
  for (const [id, label] of allergens) {
    const l2 = el2("label", "check", label), i = el2("input");
    i.type = "checkbox";
    i.value = id;
    l2.prepend(i);
    $3("shop-allergens").append(l2);
  }
  const unresolvedLabels = { name: "\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435", brand: "\u0431\u0440\u0435\u043D\u0434", barcode: "\u0448\u0442\u0440\u0438\u0445\u043A\u043E\u0434", basis: "\u043E\u0441\u043D\u043E\u0432\u0430 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439", serving_mass: "\u043C\u0430\u0441\u0441\u0430 \u043F\u043E\u0440\u0446\u0438\u0438", serving_unit: "\u0435\u0434\u0438\u043D\u0438\u0446\u0430 \u043F\u043E\u0440\u0446\u0438\u0438", nutrients: "\u043F\u0438\u0449\u0435\u0432\u044B\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F", carbohydrate_basis: "\u043E\u0441\u043D\u043E\u0432\u0430 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432", carbohydrate_caption: "\u043F\u043E\u0434\u043F\u0438\u0441\u044C \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432", ingredients_text: "\u0441\u043E\u0441\u0442\u0430\u0432", allergen_statement_text: "\u0441\u0432\u0435\u0434\u0435\u043D\u0438\u044F \u043E\u0431 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u0430\u0445", readability: "\u0447\u0438\u0442\u0430\u0435\u043C\u043E\u0441\u0442\u044C \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0438", reshoot_hint: "\u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u0444\u043E\u0442\u043E" };
  const unresolvedLabel = (key) => Object.hasOwn(unresolvedLabels, key) ? "\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438: " + unresolvedLabels[key] + "." : "\u0414\u0440\u0443\u0433\u0438\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438.";
  const current = (g, e) => g === generation && e === epoch();
  function setReady(value) {
    ready = value;
    $3("shop-submit").disabled = !value || preparing;
  }
  function clearCandidate() {
    loadedNotice.hidden = true;
    for (const id of ["shop-next-options", "shop-allergen-review", "shop-portion-options"]) $3(id).open = false;
    pantryPending = null;
    $3("shop-suggest").hidden = true;
    onPantryReset();
    ownHint?.remove();
    ownHint = null;
    source = null;
    saved = null;
    next.hidden = true;
    $3("shop-saved-name").textContent = "";
    $3("shop-grams").value = "";
    $3("shop-candidate").replaceChildren();
    $3("shop-portion-result").textContent = "";
    for (const key of ["name", "state", "unit_basis", "basis_mass", "energy_kcal", "protein_g", "fat_g", "carb", "basis", "fiber_g", "portion"]) form.elements[key].value = "";
    form.elements.confirm.checked = false;
    for (const x of $3("shop-allergens").querySelectorAll("input")) x.checked = false;
    syncBasisHint();
    setReady(false);
  }
  form.addEventListener("input", () => {
    syncBasisHint();
    generation++;
    if (saved) {
      pantryPending = null;
      $3("shop-suggest").hidden = true;
      onPantryReset();
      saved = null;
      next.hidden = true;
      $3("shop-saved-name").textContent = "";
      ownHint?.remove();
      ownHint = null;
    }
  });
  $3("shop-manual").onclick = () => {
    method("manual");
    if (saved) clearCandidate();
    setReady(true);
    status.textContent = "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u0445 \u043F\u043E \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435.";
  };
  async function select(file) {
    stopScanner();
    const g = ++generation, e = epoch();
    abort?.abort();
    image2 = null;
    uncertainLabelAttempt = null;
    clearCandidate();
    preview.hidden = true;
    $3("shop-read").disabled = true;
    if (!file) return;
    const data = await prepare(file);
    if (!current(g, e)) return;
    image2 = data;
    preview.src = data;
    preview.hidden = false;
    $3("shop-read").disabled = false;
    status.textContent = "\u0424\u043E\u0442\u043E \u0433\u043E\u0442\u043E\u0432\u043E. \u0414\u043B\u044F \u0447\u0442\u0435\u043D\u0438\u044F \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443.";
  }
  for (const id of ["shop-camera", "shop-photo"]) $3(id).onchange = () => run2(() => select($3(id).files?.[0]));
  function nutrientLine(x) {
    const off = source?.provider === "Open Food Facts", name2 = { Energy: "\u042D\u043D\u0435\u0440\u0433\u0438\u044F", Protein: "\u0411\u0435\u043B\u043A\u0438", Fat: "\u0416\u0438\u0440\u044B", Carbohydrates: "\u0423\u0433\u043B\u0435\u0432\u043E\u0434\u044B", Fiber: "\u041A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430" }[x.name] || x.name, unit = { kcal: "\u043A\u043A\u0430\u043B", g: "\u0433", ml: "\u043C\u043B" }[x.unit] || x.unit, column = off && x.column === "100 g/ml (provider; verify label)" ? "\u043D\u0430 100 \u0433 \u0438\u043B\u0438 100 \u043C\u043B \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435" : x.column;
    return `${name2}: ${x.value ?? "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445"} ${unit ?? ""} (${column ?? "\u043A\u043E\u043B\u043E\u043D\u043A\u0430 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430"})`;
  }
  function show(c2) {
    clearCandidate();
    if (c2) stage("review");
    else form.hidden = true;
    source = c2?.provenance || null;
    loadedNotice.hidden = !c2;
    const host = $3("shop-candidate");
    if (!c2) {
      status.textContent = "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E. \u041C\u043E\u0436\u043D\u043E \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.";
      return;
    }
    form.elements.confirm.checked = false;
    for (const x of $3("shop-allergens").querySelectorAll("input")) x.checked = false;
    if (c2.name) form.elements.name.value = c2.name;
    $3("shop-barcode").value = typeof c2.barcode === "string" && /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(c2.barcode) ? c2.barcode : "";
    host.append(el2("h3", "", "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0434\u043B\u044F \u0441\u0432\u0435\u0440\u043A\u0438 \u0441 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u043E\u0439"));
    for (const line of [c2.name, c2.brand, c2.barcode ? "\u0428\u0442\u0440\u0438\u0445\u043A\u043E\u0434: " + c2.barcode : null, "\u041E\u0441\u043D\u043E\u0432\u0430: " + ({ per100g: "\u043D\u0430 100 \u0433", per100ml: "\u043D\u0430 100 \u043C\u043B", perserving: "\u043D\u0430 \u043F\u043E\u0440\u0446\u0438\u044E", unknown: "\u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0430" }[c2.basis] || "\u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0430"), ...c2.nutrients.map(nutrientLine), c2.ingredients_text, c2.allergen_statement_text, ...c2.unresolved_fields.map(unresolvedLabel), c2.reshoot_hint]) if (line) host.append(el2("p", "", line));
    const original = el2("details");
    original.append(el2("summary", "", "\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u0438 \u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F"));
    for (const x of c2.nutrients) original.append(el2("p", "", `${x.name}: ${x.value ?? "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445"} ${x.unit ?? ""} (${x.column ?? "\u043A\u043E\u043B\u043E\u043D\u043A\u0430 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430"})`));
    host.append(original);
    const columns = [...new Set(c2.nutrients.map((x) => x.column || "\u043A\u043E\u043B\u043E\u043D\u043A\u0430 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430"))];
    function applyColumn(column) {
      setReady(true);
      const f = form.elements;
      for (const key of ["energy_kcal", "protein_g", "fat_g", "carb", "fiber_g"]) f[key].value = "";
      f.unit_basis.value = columns.length === 1 && ["per100g", "per100ml", "perserving"].includes(c2.basis) ? c2.basis : "";
      f.basis_mass.value = columns.length === 1 && c2.serving_mass != null && c2.serving_unit === "g" && c2.basis === "perserving" ? String(c2.serving_mass) : "";
      f.basis.value = "";
      const keys = { energy_kcal: [], protein_g: [], fat_g: [], carb: [], fiber_g: [] };
      for (const r of c2.nutrients.filter((x) => (x.column || "\u043A\u043E\u043B\u043E\u043D\u043A\u0430 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430") === column)) {
        const n = (r.name || "").toLowerCase().trim(), u2 = (r.unit || "").toLowerCase().trim();
        let key = null;
        if (/^(energy|energy kcal|энергия|энергетическая ценность)$/.test(n) && ["kcal", "\u043A\u043A\u0430\u043B"].includes(u2)) key = "energy_kcal";
        else if (/^(protein|proteins|белки|белок)$/.test(n) && ["g", "\u0433"].includes(u2)) key = "protein_g";
        else if (/^(fat|fats|жиры|жир)$/.test(n) && ["g", "\u0433"].includes(u2)) key = "fat_g";
        else if (["g", "\u0433"].includes(u2) && (/^(carbohydrate|carbohydrates|углеводы)$/.test(n) || /^(total carbohydrates? \(includes fib(?:er|re)\))$/.test(n) && c2.carbohydrate_basis === "total_includes_fiber" && typeof c2.carbohydrate_caption === "string" && c2.carbohydrate_caption.toLowerCase().trim() === n)) key = "carb";
        else if (/^(fiber|fibre|клетчатка|пищевые волокна)$/.test(n) && ["g", "\u0433"].includes(u2)) key = "fiber_g";
        if (key && typeof r.value === "number" && Number.isFinite(r.value) && r.value >= 0) keys[key].push(r.value);
      }
      for (const [key, values2] of Object.entries(keys)) if (values2.length === 1) f[key].value = String(values2[0]);
      if (columns.length === 1 && keys.carb.length === 1 && c2.carbohydrate_basis === "total_includes_fiber" && typeof c2.carbohydrate_caption === "string") {
        const caption = c2.carbohydrate_caption.toLowerCase().trim();
        const matching = c2.nutrients.filter((r) => (r.column || "\u043A\u043E\u043B\u043E\u043D\u043A\u0430 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430") === column && (r.name || "").toLowerCase().trim() === caption && /^(total carbohydrates? \(includes fib(?:er|re)\))$/.test(caption) && ["g", "\u0433"].includes((r.unit || "").toLowerCase().trim()) && typeof r.value === "number" && Number.isFinite(r.value) && r.value >= 0 && r.value === keys.carb[0]);
        if (matching.length === 1) f.basis.value = "total_includes_fiber";
      }
      syncBasisHint();
      status.textContent = "\u0427\u0438\u0441\u043B\u0430 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u044B \u0432 \u0438\u0441\u0445\u043E\u0434\u043D\u043E\u0439 \u043E\u0441\u043D\u043E\u0432\u0435. \u0421\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u0430\u0436\u0434\u044B\u0439 \u043F\u0443\u043D\u043A\u0442, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0441\u043D\u043E\u0432\u0443 \u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435.";
    }
    if (columns.length === 1) applyColumn(columns[0]);
    else if (columns.length > 1) {
      host.append(el2("p", "", "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0434\u043D\u0443 \u043A\u043E\u043B\u043E\u043D\u043A\u0443 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0438 \u0434\u043B\u044F \u0444\u043E\u0440\u043C\u044B:"));
      for (const column of columns) {
        const b2 = el2("button", "secondary", "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C: " + column);
        b2.type = "button";
        b2.onclick = () => applyColumn(column);
        host.append(b2);
      }
    }
    if (source) {
      const p = el2("p", "", "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: Open Food Facts, ODbL \xB7 "), a2 = el2("a", "", "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430");
      a2.href = "https://world.openfoodfacts.org/product/" + c2.barcode;
      a2.target = "_blank";
      a2.rel = "noopener noreferrer";
      p.append(a2);
      host.append(p);
    }
    if (columns.length !== 1) status.textContent = "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A; \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B.";
  }
  $3("shop-read").onclick = () => run2(async () => {
    if (!image2) return;
    const g = ++generation, e = epoch(), reqId = uncertainLabelAttempt?.image === image2 ? uncertainLabelAttempt.request_id : crypto.randomUUID().replaceAll("-", "");
    abort = new AbortController();
    $3("shop-read").disabled = true;
    $3("shop-cancel").hidden = false;
    status.textContent = "\u0427\u0438\u0442\u0430\u044E \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0443\u2026";
    try {
      const d2 = await call2("keto_label_extract", { request_id: reqId, image_data_url: image2 }, { signal: abort.signal });
      uncertainLabelAttempt = null;
      if (current(g, e)) show(d2.review_candidate);
    } catch (err) {
      const keepAttempt = !err?.status && err?.name !== "AbortError" || err?.code === "REQUEST_PENDING" || err?.status >= 500;
      if (keepAttempt) uncertainLabelAttempt = { image: image2, request_id: reqId };
      else uncertainLabelAttempt = null;
      if (current(g, e)) status.textContent = err?.status ? "\u0427\u0442\u0435\u043D\u0438\u0435 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0438 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E: " + (err.message || "\u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0444\u043E\u0442\u043E.") : "\u0421\u0432\u044F\u0437\u044C \u043F\u0440\u0435\u0440\u0432\u0430\u043B\u0430\u0441\u044C: \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D. \u041F\u043E\u0432\u0442\u043E\u0440\u043D\u043E\u0435 \u043D\u0430\u0436\u0430\u0442\u0438\u0435 \u0441\u0432\u0435\u0440\u0438\u0442 \u043F\u0440\u0435\u0436\u043D\u0438\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u0431\u0435\u0437 \u0434\u0432\u043E\u0439\u043D\u043E\u0433\u043E \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F.";
      throw err;
    } finally {
      if (current(g, e)) {
        $3("shop-read").disabled = false;
        $3("shop-cancel").hidden = true;
      }
    }
  });
  $3("shop-cancel").onclick = () => {
    generation++;
    abort?.abort();
    abort = null;
    $3("shop-cancel").hidden = true;
    $3("shop-read").disabled = !image2;
    status.textContent = "\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E. \u0417\u0430\u043F\u0440\u043E\u0441 \u043C\u043E\u0433 \u0431\u044B\u0442\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D; \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043D\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442\u0441\u044F. \u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435.";
  };
  $3("shop-barcode").oninput = () => {
    stopScanner();
    generation++;
    abort?.abort();
    clearCandidate();
  };
  $3("shop-find").onclick = () => run2(async () => {
    stopScanner();
    const barcode = $3("shop-barcode").value.trim(), g = ++generation, e = epoch();
    clearCandidate();
    status.textContent = "\u0418\u0449\u0443\u2026";
    try {
      const d2 = await api("/api/shop/barcode", "POST", { barcode });
      if (current(g, e)) show(d2.review_candidate);
    } catch (err) {
      if (current(g, e)) status.textContent = "\u041F\u043E\u0438\u0441\u043A \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u041C\u043E\u0436\u043D\u043E \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.";
      throw err;
    }
  });
  function number2(v2, max) {
    if (!v2.trim()) return null;
    const x = v2.trim().replace(",", ".");
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(x) || !Number.isFinite(Number(x)) || Number(x) > max) throw Error("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0447\u0438\u0441\u043B\u043E.");
    return Number(x);
  }
  $3("shop-portion").onclick = () => run2(async () => {
    const f = form.elements, unit = f.unit_basis.value;
    if (!["per100g", "per100ml", "perserving"].includes(unit)) throw Error("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0441\u043D\u043E\u0432\u0443 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439.");
    const amount = number2(f.portion.value, 1e4);
    if (amount === null || amount <= 0) throw Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E.");
    const factor = amount / (unit === "perserving" ? 1 : 100), parts = [];
    for (const [key, label] of [["energy_kcal", "\u043A\u043A\u0430\u043B"], ["protein_g", "\u0431\u0435\u043B\u043A\u0438, \u0433"], ["fat_g", "\u0436\u0438\u0440\u044B, \u0433"], ["carb", "\u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B, \u0433"], ["fiber_g", "\u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430, \u0433"]]) {
      const v2 = number2(f[key].value, 1e4);
      parts.push(label + ": " + (v2 === null ? "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v2 * factor)));
    }
    $3("shop-portion-result").textContent = parts.join(" \xB7 ") + "; \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0443\u043A\u0430\u0437\u0430\u043D\u044B \u043A\u0430\u043A \u043D\u0430 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0435.";
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    run2(async () => {
      if (!ready) throw Error("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u043E\u043B\u043E\u043D\u043A\u0443 \u0438\u043B\u0438 \u0432\u0432\u043E\u0434 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.");
      if (preparing || pending) throw Error("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0438\u043B\u0438 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430.");
      const f = form.elements;
      if (!f.confirm.checked || !f.name.value.trim() || !f.state.value) throw Error("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435, \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0438 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B.");
      const unit = f.unit_basis.value;
      if (!["per100g", "per100ml", "perserving"].includes(unit)) throw Error("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0441\u043D\u043E\u0432\u0443 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439.");
      const mass = unit === "per100g" ? 100 : number2(f.basis_mass.value, 1e4);
      if (mass === null || mass <= 0) throw Error("\u0414\u043B\u044F 100 \u043C\u043B \u0438\u043B\u0438 \u043F\u043E\u0440\u0446\u0438\u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0443\u044E \u043C\u0430\u0441\u0441\u0443 \u0432 \u0433\u0440\u0430\u043C\u043C\u0430\u0445.");
      const scale = (v2) => v2 === null ? null : v2 * 100 / mass;
      const declared_label = { basis: unit, mass_g: mass, energy_kcal: number2(f.energy_kcal.value, 1e4), protein_g: number2(f.protein_g.value, 1e4), fat_g: number2(f.fat_g.value, 1e4), carbohydrate_g: number2(f.carb.value, 1e4), fiber_g: number2(f.fiber_g.value, 1e4), carbohydrate_basis: f.basis.value };
      const id = "U" + crypto.randomUUID().replaceAll("-", ""), carb = scale(number2(f.carb.value, 1e4));
      let basis = f.basis.value;
      if (carb !== null && !["total_includes_fiber", "available_excludes_fiber", "unknown"].includes(basis)) throw Error("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435, \u043A\u0430\u043A \u0443\u043A\u0430\u0437\u0430\u043D\u044B \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B, \u0438\u043B\u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \xAB\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\xBB.");
      if (carb === null && !basis) basis = "unknown";
      declared_label.carbohydrate_basis = basis;
      const values2 = { energy_kcal: scale(number2(f.energy_kcal.value, 1e4)), protein_g: scale(number2(f.protein_g.value, 1e4)), fat_g: scale(number2(f.fat_g.value, 1e4)), carbohydrate_total_g: basis === "total_includes_fiber" ? carb : null, fiber_g: scale(number2(f.fiber_g.value, 1e4)) };
      const provider = source?.provider === "Open Food Facts" ? "open_food_facts" : "personal_label";
      const provenance = { type: "shop_label", provider, barcode: provider === "open_food_facts" ? $3("shop-barcode").value.trim() : null, license: provider === "open_food_facts" ? "ODbL" : null };
      const payload = { food_id: id, name_ru: f.name.value.trim(), state: f.state.value, allergens: [...$3("shop-allergens").querySelectorAll("input:checked")].map((x) => x.value), label_confirmed: true, source_ref: provider === "open_food_facts" ? source.url : "\u041B\u0438\u0447\u043D\u0430\u044F \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0430", carb_basis: "total_includes_fiber", nutrient_status: Object.values(values2).some((x) => x === null) ? "partial" : "complete", provenance, recipe_eligible: false, declared_label, ...values2 };
      if (carb !== null && basis !== "total_includes_fiber") payload.declared_carbohydrate = { value: carb, basis };
      const submitted = { id, state: payload.state, name: payload.name_ru, generation };
      preparing = true;
      setReady(ready);
      let d2;
      try {
        d2 = await call2("keto_propose_change", { event_type: "catalog.food.add", payload, expected_revision: getState().revision });
      } finally {
        preparing = false;
        setReady(ready);
      }
      pending = { proposal: d2.proposal.id, ...submitted };
      accept2(d2);
      ;
    });
  };
  $3("shop-pantry").onclick = () => run2(async () => {
    if (!saved || pantryBusy || pantryPending) return;
    const grams = number2($3("shop-grams").value, 3e4);
    if (grams !== null && grams <= 0) throw Error("\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0443\u043B\u044F.");
    const current2 = getState().kitchen?.pantry || [];
    if (current2.some((x) => x.food_id === saved.id)) throw Error("\u041F\u0440\u043E\u0434\u0443\u043A\u0442 \u0443\u0436\u0435 \u0432 \u0437\u0430\u043F\u0430\u0441\u0430\u0445; \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \u043A\u0443\u0445\u043D\u0438.");
    const selected = { id: saved.id, name: saved.name, generation };
    const items = [...current2.map(({ food_id, state: state2, grams: grams2 }) => ({ food_id, state: state2, grams: grams2 })), { food_id: selected.id, state: saved.state, grams }];
    pantryBusy = true;
    $3("shop-pantry").disabled = true;
    let d2;
    try {
      d2 = await call2("keto_kitchen", { action: "pantry", values: { items }, expected_revision: getState().revision });
    } finally {
      pantryBusy = false;
      $3("shop-pantry").disabled = false;
    }
    if (selected.generation !== generation || saved?.id !== selected.id) return;
    pantryPending = { proposal: d2.proposal.id, ...selected };
    accept2(d2);
    ;
  });
  $3("shop-record").onclick = () => run2(() => {
    if (saved) openIntake({ food_id: saved.id, name_ru: saved.name, amount: { value: 100, unit: "g" } });
  });
  $3("shop-suggest").onclick = () => {
    if (saved && !$3("shop-suggest").hidden) onPantryPreview(saved.name);
  };
  $3("shop-own").onclick = () => {
    if (!saved) return;
    setView2("recipes");
    const d2 = $3("own-dish-root").querySelector("details");
    if (!d2) return;
    ownHint?.remove();
    onOwnFood(saved);
    ownHint = el2("p", "notice", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0441\u044A\u0435\u0434\u043E\u0431\u043D\u0443\u044E \u043C\u0430\u0441\u0441\u0443 \u0434\u043B\u044F \xAB" + saved.name + "\xBB.");
    d2.prepend(ownHint);
    d2.open = true;
    d2.scrollIntoView({ block: "start" });
  };
  return { afterApplied(d2) {
    if (pantryPending && d2?.receipt?.id === pantryPending.proposal && d2.receipt.type === "kitchen.pantry") {
      const p = pantryPending;
      pantryPending = null;
      if (p.generation === generation && saved?.id === p.id && d2.state?.kitchen?.pantry?.some((i) => i.food_id === p.id)) {
        $3("shop-suggest").hidden = false;
        status.textContent = "\u0417\u0430\u043F\u0430\u0441\u044B \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B. \u041C\u043E\u0436\u043D\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B \u0431\u043B\u044E\u0434.";
      }
    } else if (pantryPending && d2?.state?.pending && !d2.state.pending.some((p) => p.id === pantryPending.proposal)) {
      pantryPending = null;
    }
    if (pending && d2?.receipt?.id === pending.proposal && d2.receipt.type === "catalog.food.add") {
      const p = pending;
      pending = null;
      if (p.generation === generation) {
        saved = p;
        $3("shop-next-options").open = false;
        stage("saved");
        $3("shop-candidate").replaceChildren();
        next.hidden = false;
        $3("shop-saved-name").textContent = "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D \u043F\u0440\u043E\u0434\u0443\u043A\u0442: " + p.name;
        $3("shop-pantry").textContent = "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0437\u0430\u043F\u0430\u0441\u044B";
        status.textContent = "\u041B\u0438\u0447\u043D\u044B\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D.";
        next.scrollIntoView?.({ block: "nearest" });
      }
    } else if (pending && d2?.state?.pending && !d2.state.pending.some((p) => p.id === pending.proposal)) {
      pending = null;
    }
  }, stopScanner, leave, reset() {
    stage("");
    for (const id of ["shop-next-options", "shop-allergen-review", "shop-portion-options"]) $3(id).open = false;
    stopScanner();
    searchToken++;
    $3("shop-search-results").replaceChildren();
    generation++;
    pantryPending = null;
    pantryBusy = false;
    $3("shop-suggest").hidden = true;
    onPantryReset();
    ownHint?.remove();
    ownHint = null;
    abort?.abort();
    image2 = null;
    uncertainLabelAttempt = null;
    pending = null;
    saved = null;
    source = null;
    preparing = false;
    setReady(true);
    preview.removeAttribute("src");
    preview.hidden = true;
    form.hidden = true;
    $3("shop-photo-stage").hidden = true;
    $3("shop-cancel").hidden = true;
    $3("shop-read").disabled = true;
    $3("shop-candidate").replaceChildren();
    status.textContent = "";
    $3("shop-portion-result").textContent = "";
    next.hidden = true;
    form.reset();
    loadedNotice.hidden = true;
    syncBasisHint();
    $3("shop-camera").value = "";
    $3("shop-photo").value = "";
    $3("shop-barcode").value = "";
    $3("shop-query").value = "";
    $3("shop-wide").checked = false;
    $3("shop-search-stage").hidden = true;
    $3("shop-barcode-stage").hidden = true;
  } };
}

// cloudflare-saas/public/recipe-library.js
function createRecipeLibrary({ call: call2, readFilters, render, clear = () => {
}, status, more, epoch }) {
  let token = 0, offset2 = 0, scope2 = null, retry = null;
  const fingerprint = (x) => JSON.stringify(x);
  function invalidate() {
    token++;
    retry = null;
    more(false);
  }
  async function load(append = false) {
    const filters = readFilters(), key = fingerprint(filters);
    if (append && scope2 !== key) append = false;
    const start2 = append ? offset2 : 0, serial = ++token, screen = epoch();
    if (!append) {
      clear();
      scope2 = null;
      offset2 = 0;
    }
    retry = { append, key };
    status("\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026");
    more(false);
    try {
      const d2 = await call2({ ...filters, limit: 24, offset: start2 });
      if (serial !== token || screen !== epoch() || fingerprint(readFilters()) !== key) return;
      render(d2, append);
      scope2 = key;
      offset2 = start2 + d2.recipes.length;
      retry = null;
      status(`\u0412 \u0442\u0435\u043A\u0443\u0449\u0435\u043C \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u043F\u043E \u0432\u0430\u0448\u0438\u043C \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u043C: \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E ${offset2} \u0438\u0437 ${d2.total}`);
      more(d2.has_more, false);
    } catch (e) {
      if (serial === token && screen === epoch() && fingerprint(readFilters()) === key) {
        retry = { append, key };
        status("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0440\u0435\u0446\u0435\u043F\u0442\u044B. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.");
        more(true, true);
      }
      throw e;
    }
  }
  function next() {
    const key = fingerprint(readFilters());
    return load(retry && retry.key === key ? retry.append : true);
  }
  return { load, next, invalidate };
}

// cloudflare-saas/public/own-dish.js
function setupOwnDish({ $: $3, el: el2, call: call2, getState, accept: accept2, run: run2, epoch, foodState: foodState2, numberRu: numberRu2, openIntake, allergens = [] }) {
  const root = $3("own-dish-root");
  root.innerHTML = `<details class="panel"><summary data-icon="recipe">\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0441\u0432\u043E\u0451 \u0431\u043B\u044E\u0434\u043E</summary><div class="own-dish-content"><p class="ux-hint">\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442\u044B \u0441 \u043C\u0430\u0441\u0441\u043E\u0439 \u0441\u044A\u0435\u0434\u043E\u0431\u043D\u043E\u0439 \u0447\u0430\u0441\u0442\u0438, \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0447\u0438\u0441\u043B\u043E \u043F\u043E\u0440\u0446\u0438\u0439 \u0432\u043E \u0432\u0441\u0451\u043C \u0431\u043B\u044E\u0434\u0435 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0442\u044C \u0431\u043B\u044E\u0434\u043E\xBB. \u041F\u043E\u0441\u043B\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u0443\u044E \u0447\u0430\u0441\u0442\u044C \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A.</p><details class="ux-guide"><summary>\u0427\u0435\u043C \xAB\u043F\u043E\u0440\u0446\u0438\u044F\xBB \u043E\u0442\u043B\u0438\u0447\u0430\u0435\u0442\u0441\u044F \u043E\u0442 \xAB\u0434\u043E\u043B\u0438 \u0432\u0441\u0435\u0433\u043E \u0431\u043B\u044E\u0434\u0430\xBB?</summary><div class="ux-guide-body"><p>\u0415\u0441\u043B\u0438 \u0432 \u0431\u043B\u044E\u0434\u0435 4 \u043F\u043E\u0440\u0446\u0438\u0438, \u0442\u043E \xAB1 \u043F\u043E\u0440\u0446\u0438\u044F\xBB \u043F\u0440\u0438 \u0437\u0430\u043F\u0438\u0441\u0438 \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A \u2014 \u044D\u0442\u043E \u0447\u0435\u0442\u0432\u0435\u0440\u0442\u044C \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u044E\u0434\u0430, \u0430 \xAB0,5 \u043F\u043E\u0440\u0446\u0438\u0438\xBB \u2014 \u043F\u043E\u043B\u043E\u0432\u0438\u043D\u0430 \u043E\u0434\u043D\u043E\u0439 \u0442\u0430\u0440\u0435\u043B\u043A\u0438. \u0415\u0441\u043B\u0438 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0435\u0434\u0438\u043D\u0438\u0446\u0443 \xAB\u0434\u043E\u043B\u044F \u0432\u0441\u0435\u0433\u043E \u0431\u043B\u044E\u0434\u0430\xBB \u0438 \u0443\u043A\u0430\u0437\u0430\u0442\u044C 0,5 \u2014 \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A \u0437\u0430\u043F\u0438\u0448\u0435\u0442\u0441\u044F \u043F\u043E\u043B\u043E\u0432\u0438\u043D\u0430 \u0432\u0441\u0435\u0439 \u043A\u0430\u0441\u0442\u0440\u044E\u043B\u0438 (2 \u0438\u0437 4 \u043F\u043E\u0440\u0446\u0438\u0439).</p></div></details><form id="own-form"><label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435<input name="name" maxlength="200" required></label><label>\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F<select name="category"><option value="main">\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0435 \u0431\u043B\u044E\u0434\u043E</option><option value="breakfast">\u0417\u0430\u0432\u0442\u0440\u0430\u043A</option><option value="side">\u0413\u0430\u0440\u043D\u0438\u0440</option><option value="component">\u041A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442</option></select></label><label>\u041F\u043E\u0440\u0446\u0438\u0439 \u0432\u043E \u0432\u0441\u0451\u043C \u0431\u043B\u044E\u0434\u0435<input name="servings" type="text" inputmode="decimal" value="1" required><span id="own-servings-error" role="alert"></span></label><label>\u0412\u0440\u0435\u043C\u044F \u0440\u0430\u0431\u043E\u0442\u044B \u043D\u0430 \u043A\u0443\u0445\u043D\u0435, \u043C\u0438\u043D\u0443\u0442<input name="minutes" type="number" min="1" max="360" value="15" required><span class="ux-hint">\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u043C\u0438\u043D\u0443\u0442 \u0432\u044B \u0433\u043E\u0442\u043E\u0432\u0438\u0442\u0435 \u0441\u0430\u043C\u0438: \u0440\u0435\u0436\u0435\u0442\u0435, \u0441\u043C\u0435\u0448\u0438\u0432\u0430\u0435\u0442\u0435, \u043E\u0431\u0436\u0430\u0440\u0438\u0432\u0430\u0435\u0442\u0435. \u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u0432 \u0434\u0443\u0445\u043E\u0432\u043A\u0435 \u0438\u043B\u0438 \u0445\u043E\u043B\u043E\u0434\u0438\u043B\u044C\u043D\u0438\u043A\u0435 \u0441\u044E\u0434\u0430 \u043D\u0435 \u0432\u0445\u043E\u0434\u0438\u0442.</span></label><label>\u041D\u0430\u0439\u0442\u0438 \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442<input name="search" type="search" autocomplete="off"></label><div id="own-results"></div><p class="ux-hint">\u041F\u0440\u0438 \u0432\u044B\u0431\u043E\u0440\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0431\u0435\u0437 \u0443\u0433\u0430\u0434\u044B\u0432\u0430\u043D\u0438\u044F \u0433\u0440\u0430\u043C\u043C\u043E\u0432 \u2014 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043C\u0430\u0441\u0441\u0443 \u0441\u044A\u0435\u0434\u043E\u0431\u043D\u043E\u0439 \u0447\u0430\u0441\u0442\u0438 \u0434\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442\u0430.</p><div id="own-rows"></div><label>\u041A\u0430\u043A \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C<textarea name="steps" maxlength="5000" required placeholder="\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u043D\u0430\u0440\u0435\u0436\u044C\u0442\u0435 \u043E\u0432\u043E\u0449\u0438, \u0441\u043C\u0435\u0448\u0430\u0439\u0442\u0435 \u0441 \u0441\u044B\u0440\u043E\u043C \u0438 \u0437\u0430\u043F\u0435\u043A\u0430\u0439\u0442\u0435 \u0434\u043E \u0433\u043E\u0442\u043E\u0432\u043D\u043E\u0441\u0442\u0438."></textarea><span class="ux-hint">\u0417\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u0441\u0432\u043E\u0439 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u044F. \u041E\u043D \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0441\u044F \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u0441\u043E\u0441\u0442\u0430\u0432\u043E\u043C \u0431\u043B\u044E\u0434\u0430.</span></label><p id="own-form-error" role="alert"></p><button type="submit">\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0442\u044C \u0431\u043B\u044E\u0434\u043E</button><button id="own-save" type="button" hidden>\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0431\u043B\u044E\u0434\u043E</button></form><div id="own-preview" aria-live="polite"></div><div id="own-intake" hidden><label>\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0435 \u0431\u043B\u044E\u0434\u043E<select id="own-saved"></select></label><button id="own-detail" type="button">\u0421\u043E\u0441\u0442\u0430\u0432 \u0438 \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u0435</button><div id="own-detail-result" aria-live="polite"></div><button id="own-record" class="primary" type="button">\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435</button></div></div></details>`;
  const form = $3("own-form");
  const servingsHint = el2("span", "ux-hint", "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0445 \u043F\u043E\u0440\u0446\u0438\u0439 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0441\u044F \u0438\u0437 \u0432\u0441\u0435\u0445 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u0445 \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442\u043E\u0432 \u2014 \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, 4 \u043F\u043E\u0440\u0446\u0438\u0438 \u0441\u0443\u043F\u0430 \u0438\u043B\u0438 \u0437\u0430\u043F\u0435\u043A\u0430\u043D\u043A\u0438.");
  servingsHint.id = "own-servings-help";
  const servingsField = form.elements.namedItem("servings");
  servingsField.setAttribute("aria-describedby", servingsHint.id);
  servingsField.insertAdjacentElement("afterend", servingsHint);
  let rows = [], id = null, stamp = "", saved = null;
  function decimal(value, label, min, max, near) {
    const raw = String(value ?? "").trim();
    let error = "";
    if (!/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(raw)) error = "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 " + label + " \u0447\u0438\u0441\u043B\u043E\u043C, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 1,5.";
    const n = Number(raw.replace(",", "."));
    if (!error && (!Number.isFinite(n) || n < min || n > max)) error = "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 " + label + ": \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E \u043E\u0442 " + min + " \u0434\u043E " + max + ".";
    if (near) near.textContent = error;
    if (error) throw Error(error);
    return n;
  }
  function reset() {
    foodPicker.reset();
    rows = [];
    id = null;
    stamp = "";
    saved = null;
    form.reset();
    $3("own-rows").replaceChildren();
    $3("own-preview").replaceChildren();
    $3("own-detail-result").replaceChildren();
    $3("own-form-error").textContent = "";
    $3("own-saved").replaceChildren();
    $3("own-saved").value = "";
    $3("own-save").hidden = true;
    $3("own-intake").hidden = true;
  }
  function payload() {
    return { recipe_id: id || (id = "R" + crypto.randomUUID().replaceAll("-", "")), name_ru: form.elements.namedItem("name").value, category: form.elements.namedItem("category").value, base_servings: decimal(form.elements.namedItem("servings").value, "\u0447\u0438\u0441\u043B\u043E \u043F\u043E\u0440\u0446\u0438\u0439", 0.1, 30, $3("own-servings-error")), active_minutes: decimal(form.elements.namedItem("minutes").value, "\u0432\u0440\u0435\u043C\u044F", 1, 360), ingredients: rows.map((x) => ({ food_id: x.food_id, state: x.state, grams_edible: decimal(x.grams, "\u0433\u0440\u0430\u043C\u043C\u044B \u0434\u043B\u044F \xAB" + x.name_ru + "\xBB", 1e-3, 5e3, x.error) })), steps_ru: form.elements.namedItem("steps").value };
  }
  function changed() {
    stamp = "";
    $3("own-save").hidden = true;
    if ($3("own-preview").children.length) $3("own-preview").replaceChildren(el2("p", "muted", "\u0421\u043E\u0441\u0442\u0430\u0432 \u0438\u0437\u043C\u0435\u043D\u0451\u043D \u2014 \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0439\u0442\u0435."));
  }
  function draw() {
    const box = $3("own-rows");
    box.replaceChildren();
    for (const row of rows) {
      const line = el2("div", "own-ingredient");
      line.append(el2("span", "", row.name_ru + " \xB7 " + foodState2(row.state)));
      const gram = el2("input");
      gram.type = "text";
      gram.inputMode = "decimal";
      gram.required = true;
      gram.value = row.grams;
      gram.setAttribute("aria-label", "\u0413\u0440\u0430\u043C\u043C\u044B \u0441\u044A\u0435\u0434\u043E\u0431\u043D\u043E\u0439 \u0447\u0430\u0441\u0442\u0438: " + row.name_ru);
      gram.placeholder = "\u0413\u0440\u0430\u043C\u043C\u044B";
      const unit = el2("span", "own-unit", "\u0433");
      unit.setAttribute("aria-hidden", "true");
      gram.oninput = () => {
        row.grams = gram.value;
        changed();
      };
      const del = el2("button", "secondary icon-only");
      del.type = "button";
      del.setAttribute("data-icon", "trash");
      del.setAttribute("aria-label", "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442: " + row.name_ru);
      del.title = "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442";
      del.onclick = () => {
        rows = rows.filter((x) => x !== row);
        draw();
        changed();
      };
      const error = el2("span", "");
      error.setAttribute("role", "alert");
      row.error = error;
      row.input = gram;
      line.append(gram, unit, del, error);
      box.append(line);
    }
  }
  function preview(box, p) {
    const batch = p.whole_batch;
    box.append(el2("h4", "", batch.name_ru + " \xB7 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0435 \u0431\u043B\u044E\u0434\u043E"), el2("p", "muted", "\u0420\u0430\u0441\u0447\u0451\u0442 \u0434\u043B\u044F \u0444\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u0438 \u043F\u0438\u0442\u0430\u043D\u0438\u044F; \u044D\u0442\u043E \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0435 \u043C\u0435\u043D\u044E."));
    if (p.servings != null) box.append(el2("p", "", `\u041F\u043E\u0440\u0446\u0438\u0439 \u0432\u043E \u0432\u0441\u0451\u043C \u0431\u043B\u044E\u0434\u0435: ${numberRu2(p.servings)}`));
    for (const i of batch.ingredients) box.append(el2("p", "", i.name_ru + " \u2014 " + numberRu2(i.grams_edible) + " \u0433 \xB7 " + foodState2(i.state)));
    if (p.steps_ru) box.append(el2("p", "", "\u041F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u0435: " + p.steps_ru));
    for (const [title, c2] of [["\u0412\u0441\u0451 \u0431\u043B\u044E\u0434\u043E", batch], ["\u041E\u0434\u043D\u0430 \u043F\u043E\u0440\u0446\u0438\u044F", p.per_portion]]) {
      const fields = [["energy_kcal", "\u042D\u043D\u0435\u0440\u0433\u0438\u044F", "\u043A\u043A\u0430\u043B"], ["protein_g", "\u0411\u0435\u043B\u043E\u043A", "\u0433"], ["fat_g", "\u0416\u0438\u0440\u044B", "\u0433"], ["carbohydrate_total_g", "\u041E\u0431\u0449\u0438\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B", "\u0433"], ["fiber_g", "\u041A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430", "\u0433"], ["net_carbohydrate_g", "\u0420\u0430\u0441\u0447\u0451\u0442\u043D\u044B\u0435 \u0447\u0438\u0441\u0442\u044B\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B", "\u0433"]];
      const section = el2("section", "own-nutrition"), list = el2("dl", "intake-nutrients");
      section.append(el2("h4", "", title));
      for (const [k, n, u2] of fields) {
        const value = c2.nutrition[k], known = c2.coverage[k]?.known_subtotal;
        list.append(el2("dt", "", n), el2("dd", "", value == null ? "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E" + (known == null ? "" : ` (\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u0447\u0430\u0441\u0442\u044C ${numberRu2(known, k === "energy_kcal" ? 0 : 1)} ${u2})`) : `${numberRu2(value, k === "energy_kcal" ? 0 : 1)} ${u2}`));
      }
      section.append(list);
      box.append(section);
    }
    if (p.issues?.some((x) => x.startsWith("allergen:"))) box.append(el2("p", "notice", "\u0412 \u0441\u043E\u0441\u0442\u0430\u0432\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D \u0438\u0437 \u0432\u0430\u0448\u0435\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u043E\u0441\u0442\u0430\u0432 \u043F\u0435\u0440\u0435\u0434 \u0443\u043F\u043E\u0442\u0440\u0435\u0431\u043B\u0435\u043D\u0438\u0435\u043C."));
  }
  const foodPicker = createFoodPicker({ root: $3("own-results"), input: form.elements.namedItem("search"), el: el2, call: call2, getState, accept: accept2, run: run2, epoch, foodState: foodState2, allergens, selectionMessage: (food) => "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442: " + food.name_ru + ". \u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0435\u0433\u043E \u043C\u0430\u0441\u0441\u0443 \u0432 \u0433\u0440\u0430\u043C\u043C\u0430\u0445 \u043D\u0438\u0436\u0435, \u0437\u0430\u0442\u0435\u043C \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442\u044B \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0442\u044C \u0431\u043B\u044E\u0434\u043E\xBB.", onSelect: (food) => {
    if (!rows.some((row) => row.food_id === food.food_id)) {
      rows.push({ ...food, grams: "" });
      draw();
      changed();
    }
    return rows.find((row) => row.food_id === food.food_id)?.input;
  } });
  form.addEventListener("input", changed);
  form.onsubmit = (e) => {
    e.preventDefault();
    run2(async () => {
      let data;
      try {
        data = payload();
        $3("own-form-error").textContent = "";
      } catch (e2) {
        $3("own-form-error").textContent = e2.message;
        return;
      }
      const key = JSON.stringify(data), screen = epoch();
      const d2 = await call2("keto_kitchen", { action: "own_dish_calculate", values: data });
      if (screen !== epoch()) return;
      try {
        if (key !== JSON.stringify(payload())) return;
      } catch {
        return;
      }
      stamp = key;
      $3("own-preview").replaceChildren();
      preview($3("own-preview"), d2.preview);
      $3("own-save").hidden = false;
    });
  };
  $3("own-save").onclick = () => run2(async () => {
    const data = payload();
    if (JSON.stringify(data) !== stamp) throw Error("\u041F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0439\u0442\u0435 \u0438\u0437\u043C\u0435\u043D\u0451\u043D\u043D\u043E\u0435 \u0431\u043B\u044E\u0434\u043E.");
    const d2 = await call2("keto_kitchen", { action: "own_dish_save", values: data, expected_revision: getState().revision });
    accept2(d2);
  });
  $3("own-detail").onclick = () => run2(async () => {
    const rid = $3("own-saved").value, screen = epoch();
    const d2 = await call2("keto_kitchen", { action: "own_dish_detail", values: { recipe_id: rid } });
    if (screen !== epoch() || rid !== $3("own-saved").value) return;
    $3("own-detail-result").replaceChildren();
    preview($3("own-detail-result"), d2.preview);
  });
  $3("own-saved").addEventListener("change", () => $3("own-detail-result").replaceChildren());
  $3("own-record").onclick = () => run2(() => {
    const selected = (getState()?.kitchen?.own_recipes || []).find((recipe) => recipe.recipe_id === $3("own-saved").value);
    if (!selected) throw Error("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0435 \u0431\u043B\u044E\u0434\u043E.");
    openIntake({ recipe_id: selected.recipe_id, name_ru: selected.name_ru, amount: { value: 1, unit: "portion" } });
  });
  function update(state2) {
    const list = state2?.kitchen?.own_recipes || [];
    const selected = $3("own-saved").value || saved;
    $3("own-saved").replaceChildren(...list.map((r) => {
      const o2 = el2("option", "", r.name_ru);
      o2.value = r.recipe_id;
      return o2;
    }));
    $3("own-saved").value = list.some((r) => r.recipe_id === selected) ? selected : list[0]?.recipe_id || "";
    if ($3("own-saved").value !== selected) $3("own-detail-result").replaceChildren();
    $3("own-intake").hidden = !list.length;
  }
  function savedReceipt(data) {
    saved = data.recipe_id;
    $3("own-saved").value = saved;
    if ((() => {
      try {
        return JSON.stringify(data) === JSON.stringify(payload());
      } catch {
        return false;
      }
    })()) {
      foodPicker.reset();
      form.reset();
      rows = [];
      id = null;
      stamp = "";
      draw();
      $3("own-preview").replaceChildren();
      $3("own-save").hidden = true;
    } else {
      id = null;
      stamp = "";
      $3("own-save").hidden = true;
    }
    $3("own-intake").hidden = false;
  }
  function addConfirmedFood(food) {
    if (!rows.some((r) => r.food_id === food.id)) {
      rows.push({ food_id: food.id, name_ru: food.name, state: food.state, grams: "" });
      draw();
      changed();
    }
  }
  return { reset, preview, savedReceipt, update, addConfirmedFood, afterApplied: foodPicker.afterApplied };
}

// cloudflare-saas/public/developer-ui.js
var labels = { draft: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043E \xB7 \u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F", generating: "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u043F\u0430\u0442\u0447\u0430", generated: "\u041F\u0430\u0442\u0447 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D \xB7 \u0435\u0449\u0451 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D", testing: "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u0432 \u0438\u0437\u043E\u043B\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u043C \u0440\u0430\u043D\u043D\u0435\u0440\u0435", tested: "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E \xB7 \u043D\u0435 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E", failed: "\u041E\u0448\u0438\u0431\u043A\u0430 \xB7 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0430 \u043D\u0435\u0442", cancelled: "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u043E", expired: "\u0421\u0440\u043E\u043A \u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u0438\u0441\u0442\u0451\u043A" };
function setupDeveloper({ $: $3, el: el2, api, preview, epoch, notify: notify2, setView: setView2, isOwner, hasAttachment }) {
  let job = null, busy2 = false, available = false, enabled = false;
  const status = (text) => $3("dev-status").textContent = text;
  function reset() {
    job = null;
    busy2 = false;
    available = false;
    enabled = false;
    $3("developer-tab").hidden = true;
    $3("developer-mode-controls").hidden = true;
    $3("chat-mode").value = "nutrition";
    $3("dev-approval").hidden = true;
    $3("dev-output").hidden = true;
    $3("dev-preview").hidden = true;
    $3("dev-preview").removeAttribute("srcdoc");
    $3("dev-preview").removeAttribute("src");
    $3("dev-download").removeAttribute("href");
    $3("dev-download").hidden = true;
    $3("dev-exact").textContent = "";
    $3("dev-diff").textContent = "";
    $3("dev-receipt").textContent = "";
    $3("dev-jobs").replaceChildren();
    status("");
  }
  function identity() {
    const owner = isOwner();
    $3("developer-tab").hidden = !owner;
    $3("developer-mode-controls").hidden = !owner;
    if (!owner) reset();
  }
  async function action(fn) {
    if (busy2 || !isOwner()) return;
    busy2 = true;
    const stamp = epoch();
    try {
      await fn(stamp);
    } catch (e) {
      if (stamp === epoch()) status("\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E. " + e.message + " \u0417\u0430\u043F\u0440\u043E\u0441 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043D\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u0451\u043D.");
    } finally {
      if (stamp === epoch()) {
        busy2 = false;
        $3("dev-generate").disabled = false;
        $3("dev-test").disabled = false;
      }
    }
  }
  async function load() {
    identity();
    if (!isOwner()) {
      setView2("more");
      return;
    }
    const stamp = epoch(), d2 = await api("/api/developer");
    if (stamp !== epoch()) return;
    available = d2.readiness.available;
    enabled = d2.enabled_until > Date.now() / 1e3;
    $3("dev-draft").disabled = !available || !enabled;
    $3("dev-enable").disabled = !available;
    status(!available ? "\u0420\u0430\u043D\u043D\u0435\u0440 \u0438\u043B\u0438 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0439 snapshot \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D. \u041F\u0438\u043B\u043E\u0442 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D; \u043F\u0438\u0442\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0435\u0442 \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C." : enabled ? "\u041F\u0438\u043B\u043E\u0442 \u0432\u043A\u043B\u044E\u0447\u0451\u043D \u0434\u043E " + new Date(d2.enabled_until * 1e3).toLocaleTimeString("ru") + ". \u0414\u043E 3 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0439 \u0432 \u0434\u0435\u043D\u044C." : "\u041F\u0438\u043B\u043E\u0442 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D. \u0412\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443.");
    $3("dev-jobs").replaceChildren();
    for (const j2 of d2.jobs) {
      const row = el2("div", "panel");
      row.append(el2("p", "", labels[j2.state] || j2.state));
      if (["draft", "generated", "tested"].includes(j2.state) && j2.expires_at > Date.now() / 1e3) {
        const b2 = el2("button", "", "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u0434\u0430\u0447\u0443");
        b2.type = "button";
        b2.onclick = () => action(async (stamp2) => {
          const data = await api("/api/developer/job?id=" + j2.id);
          if (stamp2 === epoch()) await showJob(data);
        });
        row.append(b2);
      }
      $3("dev-jobs").append(row);
    }
  }
  async function showJob(data) {
    $3("dev-preview").hidden = true;
    $3("dev-preview").removeAttribute("srcdoc");
    $3("dev-preview").removeAttribute("src");
    $3("dev-download").hidden = true;
    $3("dev-download").removeAttribute("href");
    job = data;
    status(labels[data.state] || data.state);
    $3("dev-approval").hidden = data.state !== "draft";
    $3("dev-output").hidden = !["generated", "tested"].includes(data.state);
    $3("dev-exact").textContent = data.task || "";
    $3("dev-diff").textContent = data.diff_text || data.diff || "";
    $3("dev-test").hidden = data.state === "tested";
    $3("dev-receipt").textContent = data.state === "tested" ? "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043A \u044D\u0442\u043E\u043C\u0443 baseline \u0438 \u0445\u0435\u0448\u0443 \u043F\u0430\u0442\u0447\u0430. \u0421\u0435\u043C\u0435\u0439\u043D\u043E\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043D\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u043E." : "";
    if (data.state === "draft") $3("dev-generate").focus();
    if (data.state === "tested") await showPreview(data);
  }
  async function showPreview(data) {
    const stamp = epoch(), id = data.id, document2 = await preview("/api/developer/artifact/preview?id=" + id);
    if (stamp !== epoch() || job?.id !== id) return;
    $3("dev-preview").src = "/api/developer/artifact/preview?id=" + id;
    $3("dev-preview").hidden = false;
    $3("dev-download").href = "/api/developer/artifact/diff?id=" + id;
    $3("dev-download").hidden = false;
    $3("dev-output").hidden = false;
    $3("dev-test").hidden = true;
    $3("dev-receipt").textContent = "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E \xB7 \u043D\u0435 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E. \u0421\u043A\u0430\u0447\u0430\u0442\u044C diff \u0438 \u043F\u0435\u0440\u0435\u0434\u0430\u0442\u044C \u0432 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0439 \u0432\u044B\u043F\u0443\u0441\u043A.";
  }
  $3("chat-mode").onchange = () => {
    if ($3("chat-mode").value !== "developer") return;
    if (!isOwner() || hasAttachment()) {
      $3("chat-mode").value = "nutrition";
      notify2("\u0423\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0451\u043D\u043D\u043E\u0435 \u0444\u043E\u0442\u043E \u0438\u043B\u0438 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u043F\u0435\u0440\u0435\u0434 \u0432\u0445\u043E\u0434\u043E\u043C \u0432 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u043A\u0443. \u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043F\u0438\u0442\u0430\u043D\u0438\u044F \u043D\u0435 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442\u0441\u044F.");
      return;
    }
    setView2("developer");
  };
  $3("dev-back").onclick = () => {
    $3("chat-mode").value = "nutrition";
    setView2("chat");
  };
  $3("dev-refresh").onclick = () => action(load);
  $3("dev-enable").onclick = () => action(async (stamp) => {
    await api("/api/developer/enable", { method: "POST", body: { hours: 1 } });
    if (stamp === epoch()) await load();
  });
  $3("dev-disable").onclick = async () => {
    const stamp = epoch();
    try {
      await api("/api/developer/disable", { method: "POST", body: {} });
      if (stamp !== epoch()) return;
      reset();
      identity();
      status("\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u043E \xB7 \u043F\u0438\u043B\u043E\u0442 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D. \u041F\u043E\u0437\u0434\u043D\u0438\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043D\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442\u0441\u044F.");
    } catch (e) {
      if (stamp === epoch()) status(e.message);
    }
  };
  $3("dev-form").onsubmit = (e) => {
    e.preventDefault();
    void action(async (stamp) => {
      if (!available || !enabled || !$3("dev-technical").checked) throw Error("\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u043F\u0438\u043B\u043E\u0442 \u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435.");
      const task = $3("dev-task").value;
      const data = await api("/api/developer/jobs", { method: "POST", body: { task, technical_only: true, request_id: crypto.randomUUID() } });
      if (stamp === epoch()) await showJob(data);
    });
  };
  $3("dev-generate").onclick = () => action(async (stamp) => {
    if (!job || job.state !== "draft") return;
    const id = job.id;
    $3("dev-generate").disabled = true;
    status("\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \xB7 \u043E\u0434\u0438\u043D \u0432\u044B\u0437\u043E\u0432 Sol high\u2026");
    const data = await api("/api/developer/generate", { method: "POST", body: { id, approved_hash: job.request_hash } });
    if (stamp !== epoch() || job?.id !== id || !isOwner()) return;
    job = data;
    $3("dev-approval").hidden = true;
    $3("dev-output").hidden = false;
    $3("dev-test").hidden = false;
    $3("dev-diff").textContent = data.diff;
    status(labels[data.state]);
  });
  $3("dev-test").onclick = () => action(async (stamp) => {
    if (!job || job.state !== "generated") return;
    const id = job.id;
    $3("dev-test").disabled = true;
    status(labels.testing);
    const data = await api("/api/developer/test", { method: "POST", body: { id } });
    if (stamp !== epoch() || job?.id !== id || !isOwner()) return;
    job = data;
    status(labels.tested);
    await showPreview(data);
  });
  const cancel = () => action(async (stamp) => {
    if (!job) return;
    await api("/api/developer/cancel", { method: "POST", body: { id: job.id } });
    if (stamp !== epoch()) return;
    reset();
    identity();
    await load();
    status("\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u043E \xB7 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u044B \u0443\u0434\u0430\u043B\u0435\u043D\u044B.");
  });
  $3("dev-cancel").onclick = cancel;
  $3("dev-finish").onclick = cancel;
  return { reset, identity, load };
}

// cloudflare-saas/public/developer-extension.js
function mountDeveloperExtension(root) {
  return () => {
  };
}

// cloudflare-saas/public/kitchen-ui.js
var kitchenModes = [["pantry_only", "\u0418\u0437 \u043C\u043E\u0438\u0445 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432", "\u0411\u0435\u0437 \u0441\u043A\u0440\u044B\u0442\u044B\u0445 \u043C\u0430\u0441\u043B\u0430, \u0441\u043E\u043B\u0438 \u0438 \u043F\u043E\u043A\u0443\u043F\u043E\u043A"], ["pantry_plus", "\u041C\u043E\u0436\u043D\u043E \u0434\u043E\u043A\u0443\u043F\u0438\u0442\u044C", "\u041B\u0438\u043C\u0438\u0442 \u0434\u043E\u043A\u0443\u043F\u043A\u0438 \u2014 \u0447\u0438\u0441\u043B\u043E \u0440\u0430\u0437\u043D\u044B\u0445 \u043D\u0435\u0434\u043E\u0441\u0442\u0430\u044E\u0449\u0438\u0445 \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442\u043E\u0432"], ["inspiration", "\u0412\u0441\u0435 \u0440\u0435\u0446\u0435\u043F\u0442\u044B", "\u041C\u043E\u0436\u043D\u043E \u0438\u0441\u043A\u0430\u0442\u044C \u0440\u0435\u0446\u0435\u043F\u0442\u044B \u0434\u0430\u0436\u0435 \u0431\u0435\u0437 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0445 \u0437\u0430\u043F\u0430\u0441\u043E\u0432"]];
var kitchenActionLabels = { own_dish_save: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0441\u0432\u043E\u0451 \u0431\u043B\u044E\u0434\u043E", own_dish_diary: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A", source_import: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043B\u0438\u0447\u043D\u044B\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442", pantry: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0430\u0441\u044B", remember: "\u0417\u0430\u043F\u043E\u043C\u043D\u0438\u0442\u044C \u043F\u0440\u0435\u0434\u043F\u043E\u0447\u0442\u0435\u043D\u0438\u0435", forget: "\u0417\u0430\u0431\u044B\u0442\u044C \u043F\u0440\u0435\u0434\u043F\u043E\u0447\u0442\u0435\u043D\u0438\u0435", save: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0440\u0435\u0446\u0435\u043F\u0442", favorite: "\u0412 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435", rate: "\u041E\u0446\u0435\u043D\u0438\u0442\u044C \u0440\u0435\u0446\u0435\u043F\u0442", diary: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0434\u043E\u043B\u044E \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A", accept_day: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u043E\u0442 \u0434\u0435\u043D\u044C" };
function sourceImportPreview(el2, food, original, allergens, foodState2) {
  const labels2 = food.allergens.map((id) => allergens.find((row) => row[0] === id)?.[1] || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D (" + String(id) + ")");
  return [el2("p", "", food.name_ru + " \xB7 " + foodState2(food.state)), el2("p", "muted", "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: " + original + " \xB7 USDA; \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B: " + (labels2.length ? labels2.join(", ") : "\u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E: \u043D\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u044B")), el2("p", "muted", "\u041F\u043E\u0441\u043B\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u043D\u0430\u0439\u0434\u0438\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u0432 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0435, \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0432 \u0437\u0430\u043F\u0430\u0441\u044B \u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043C\u0430\u0441\u0441\u0443. \u0415\u0433\u043E \u043C\u043E\u0436\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0434\u043B\u044F \u0440\u0430\u0441\u0447\u0451\u0442\u0430 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u044E\u0434\u0430. \u0414\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0445 \u0440\u0435\u0446\u0435\u043F\u0442\u043E\u0432 \u0438 \u043C\u0435\u043D\u044E \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 \u0441\u043F\u043E\u0441\u043E\u0431\u0430\u043C \u0433\u043E\u0442\u043E\u0432\u043A\u0438 \u0435\u0449\u0451 \u043D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E.")];
}
function setupKitchen({ $: $3, el: el2, call: call2, getState, accept: accept2, run: run2, notify: notify2, setView: setView2, epoch, openIntake }) {
  let pantry = [], foods = [], allFoods = [], result = null, busy2 = false, parsing = false, parseNumber = 0, localEpoch = 0, dirty = false, specDirty = false;
  const host = $3("kitchen-studio");
  if (!host) return { render() {
  }, load: async () => {
  }, reset() {
  }, card: () => null };
  const button = (label, fn, cls = "secondary") => {
    const b2 = el2("button", cls, label);
    b2.type = "button";
    b2.onclick = () => run2(fn);
    return b2;
  };
  const decimal = (v2, min, max) => {
    const raw = String(v2).trim().replace(",", ".");
    if (!/^\d+(?:\.\d+)?$/.test(raw)) throw Error("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043B\u043E, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u044072,5");
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max) throw Error(`\u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E \u043E\u0442 ${min} \u0434\u043E ${max}`);
    return n;
  };
  const number2 = (n) => n == null ? "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(n);
  const states = { raw: "\u0441\u044B\u0440\u043E\u0439", ready_to_eat: "\u0433\u043E\u0442\u043E\u0432 \u043A \u0443\u043F\u043E\u0442\u0440\u0435\u0431\u043B\u0435\u043D\u0438\u044E", cooked_roasted: "\u0437\u0430\u043F\u0435\u0447\u0451\u043D\u043D\u044B\u0439", cooked: "\u0433\u043E\u0442\u043E\u0432\u044B\u0439", cooked_dry_heat: "\u0433\u043E\u0442\u043E\u0432\u044B\u0439, \u0441\u0443\u0445\u043E\u0439 \u0436\u0430\u0440", cooked_boiled: "\u0432\u0430\u0440\u0451\u043D\u044B\u0439", frozen: "\u0437\u0430\u043C\u043E\u0440\u043E\u0436\u0435\u043D\u043D\u044B\u0439", dry: "\u0441\u0443\u0445\u043E\u0439", canned: "\u043A\u043E\u043D\u0441\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439", canned_drained: "\u0431\u0435\u0437 \u0436\u0438\u0434\u043A\u043E\u0441\u0442\u0438", ready_to_cook: "\u0434\u043B\u044F \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u044F" };
  const stock = el2("div", "kitchen-composer");
  const form = el2("form", "kitchen-composer");
  form.dataset.testid = "kitchen-composer";
  form.oninput = form.onchange = () => {
    specDirty = true;
  };
  const modes = el2("fieldset", "kitchen-modes");
  modes.append(el2("legend", "", "\u041A\u0430\u043A \u0433\u043E\u0442\u043E\u0432\u0438\u043C?"));
  for (const [id, title, note] of kitchenModes) {
    const label = el2("label", "kitchen-mode"), input = el2("input");
    input.type = "radio";
    input.name = "mode";
    input.value = id;
    input.checked = id === "pantry_only";
    input.dataset.testid = "mode-" + id;
    label.append(input, el2("strong", "", title), el2("span", "ux-hint", note));
    modes.append(label);
  }
  const picker = el2("div", "kitchen-picker"), product = el2("input"), datalist = el2("datalist");
  product.id = "kitchen-product";
  product.setAttribute("list", "kitchen-food-list");
  product.placeholder = "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430";
  product.autocomplete = "off";
  product.dataset.testid = "kitchen-food-input";
  datalist.id = "kitchen-food-list";
  const productLabel = el2("label", "", "\u041D\u0430\u0439\u0442\u0438 \u043F\u0440\u043E\u0434\u0443\u043A\u0442");
  productLabel.htmlFor = product.id;
  const trustedList = el2("div", "kitchen-food-results");
  trustedList.setAttribute("aria-label", "\u041F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0430 \u0438 \u043B\u0438\u0447\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B");
  const sourceResults = el2("div", "kitchen-food-results"), review = el2("div", "panel");
  sourceResults.setAttribute("aria-label", "\u0417\u0430\u043F\u0438\u0441\u0438 USDA \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438");
  review.hidden = true;
  let sourceCursor = null, sourceQuery = "", sourceToken = 0;
  const chips = el2("div", "kitchen-chips");
  chips.dataset.testid = "pantry-chips";
  const pantryHint = el2("p", "ux-hint", "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0435\u0441\u0442\u044C \u0434\u043E\u043C\u0430. \u041C\u0430\u0441\u0441\u0443 \u0441\u044A\u0435\u0434\u043E\u0431\u043D\u043E\u0439 \u0447\u0430\u0441\u0442\u0438 \u043C\u043E\u0436\u043D\u043E \u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043F\u0443\u0441\u0442\u043E\u0439, \u0435\u0441\u043B\u0438 \u0432\u044B \u0435\u0451 \u043D\u0435 \u0437\u043D\u0430\u0435\u0442\u0435 \u2014 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043D\u0435 \u043F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0435 \u0432 0.");
  const unsavedNotice = el2("p", "ux-callout", "\u0421\u043F\u0438\u0441\u043E\u043A \u0437\u0430\u043F\u0430\u0441\u043E\u0432 \u0438\u0437\u043C\u0435\u043D\u0451\u043D \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F\xBB \u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0435\u0433\u043E.");
  unsavedNotice.hidden = true;
  unsavedNotice.setAttribute("role", "status");
  const status = el2("p", "muted");
  status.setAttribute("role", "status");
  status.dataset.testid = "kitchen-status";
  status.textContent = "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B\u2026";
  let searchNumber = 0, selectedFood = null, trustedStart = 0, browsing = false;
  function invalidateSource() {
    sourceToken++;
    sourceCursor = null;
    sourceQuery = "";
    sourceResults.replaceChildren();
    review.hidden = true;
  }
  function renderTrusted() {
    trustedList.replaceChildren();
    if (!browsing && !product.value.trim()) {
      trustedList.hidden = true;
      return;
    }
    trustedList.hidden = false;
    const page = foods.slice(trustedStart, trustedStart + 8);
    trustedList.append(el2("p", "muted", `\u041F\u0440\u043E\u0434\u0443\u043A\u0442\u044B: ${foods.length ? trustedStart + 1 : 0}\u2013${trustedStart + page.length} \u0438\u0437 ${foods.length}`));
    for (const f of page) {
      const row = button("", async () => {
        searchNumber++;
        clearTimeout(product.timer);
        invalidateSource();
        selectedFood = f;
        product.value = f.name_ru + " \xB7 " + (states[f.state] || f.state);
        trustedList.hidden = true;
        add.disabled = false;
        status.textContent = "\u0412\u044B\u0431\u0440\u0430\u043D \u043F\u0440\u043E\u0434\u0443\u043A\u0442: " + f.name_ru;
      });
      row.className = "secondary kitchen-food-row";
      row.append(el2("strong", "", f.name_ru), el2("span", "muted", states[f.state] || f.state));
      trustedList.append(row);
    }
    if (trustedStart > 0) trustedList.append(button("\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B", async () => {
      trustedStart = Math.max(0, trustedStart - 8);
      renderTrusted();
    }));
    if (trustedStart + 8 < foods.length) trustedList.append(button("\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B", async () => {
      trustedStart += 8;
      renderTrusted();
    }));
  }
  function foodOptions() {
    datalist.replaceChildren(...foods.map((f) => {
      const o2 = el2("option");
      o2.value = f.name_ru + " \xB7 " + (states[f.state] || f.state);
      return o2;
    }));
    trustedStart = 0;
    renderTrusted();
  }
  async function searchTrusted(query, token, screen) {
    try {
      const result2 = await call2("keto_kitchen", { action: "foods", query });
      if (token !== searchNumber || screen !== epoch() || query !== product.value.trim() || selectedFood) return;
      foods = result2.foods || [];
      foodOptions();
      status.textContent = (result2.search?.label ? result2.search.label + ". " : "") + (foods.length ? `\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432: ${foods.length}. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435.` : "\u0412 \u0431\u0430\u0437\u043E\u0432\u043E\u043C \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0439 \u043D\u0435\u0442. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A \u043D\u0438\u0436\u0435.");
    } catch (error) {
      if (token === searchNumber && screen === epoch()) status.textContent = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043D\u0430\u0439\u0442\u0438 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0438\u0441\u043A.";
    }
  }
  product.oninput = () => {
    invalidateSource();
    searchNumber++;
    clearTimeout(product.timer);
    selectedFood = allFoods.find((f) => product.value === f.name_ru + " \xB7 " + (states[f.state] || f.state)) || null;
    add.disabled = !selectedFood;
    if (selectedFood) {
      trustedList.hidden = true;
      status.textContent = "\u0412\u044B\u0431\u0440\u0430\u043D \u043F\u0440\u043E\u0434\u0443\u043A\u0442: " + selectedFood.name_ru;
      return;
    }
    browsing = false;
    foods = [];
    foodOptions();
    const query = product.value.trim();
    if (!query) {
      status.textContent = "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438\u043B\u0438 \u043F\u043E\u043A\u0430\u0436\u0438\u0442\u0435 \u0432\u0441\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B.";
      return;
    }
    const token = searchNumber, screen = epoch();
    status.textContent = "\u0418\u0449\u0435\u043C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B\u2026";
    product.timer = setTimeout(() => run2(() => searchTrusted(query, token, screen)), 220);
  };
  function addFood(food) {
    if (pantry.some((i) => i.food_id === food.food_id)) return;
    pantry.push({ food_id: food.food_id, state: food.state, grams: food.grams ?? null, name_ru: food.name_ru });
    dirty = true;
    renderChips();
  }
  const add = button("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0437\u0430\u043F\u0430\u0441\u044B", async () => {
    const food = selectedFood || foods.find((f) => product.value === f.name_ru + " \xB7 " + (states[f.state] || f.state));
    if (!food) {
      status.textContent = "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430. \u0414\u043B\u044F \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0433\u043E \u0441\u043F\u0438\u0441\u043A\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \xAB\u0420\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B\xBB. \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u043C\u0443 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443 \u043D\u0443\u0436\u043D\u0430 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0430.";
      return;
    }
    addFood(food);
    product.value = "";
    selectedFood = null;
    add.disabled = true;
    browsing = false;
    renderTrusted();
  });
  add.disabled = true;
  picker.onkeydown = (e) => {
    if (e.key === "Enter" && e.target.tagName !== "BUTTON") e.preventDefault();
  };
  const browse = button("\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0441\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B", async () => {
    browsing = true;
    selectedFood = null;
    add.disabled = true;
    searchNumber++;
    clearTimeout(product.timer);
    if (product.value.trim()) await searchTrusted(product.value.trim(), searchNumber, epoch());
    else {
      foods = allFoods;
      trustedStart = 0;
      renderTrusted();
    }
  });
  picker.append(productLabel, product, datalist, browse, trustedList, add);
  const sourceSearch = button("\u0418\u0441\u043A\u0430\u0442\u044C \u0432 USDA", async () => {
    invalidateSource();
    sourceQuery = product.value.trim();
    await loadSource(false);
  });
  async function loadSource(more) {
    const e = epoch(), token = ++sourceToken, q2 = sourceQuery, cursor = more ? sourceCursor : null;
    const d2 = await call2("keto_kitchen", { action: "source_search", query: q2, values: { cursor, limit: 20 } });
    if (e !== epoch() || token !== sourceToken || q2 !== sourceQuery || q2 !== product.value.trim()) return;
    if (!more) sourceResults.replaceChildren();
    sourceResults.querySelector("[data-source-more]")?.remove();
    sourceResults.append(el2("p", "muted", `USDA: \u043D\u0430\u0439\u0434\u0435\u043D\u043E ${d2.total}. \u0417\u0430\u043F\u0438\u0441\u0438 \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438.`));
    for (const candidate of d2.candidates) {
      if (candidate.already_imported) {
        sourceResults.append(el2("p", "muted", (candidate.name_ru_unofficial || candidate.name_en) + " \xB7 \u0443\u0436\u0435 \u0432 \u043B\u0438\u0447\u043D\u044B\u0445 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430\u0445"));
        continue;
      }
      sourceResults.append(button((candidate.name_ru_unofficial || candidate.name_en) + " \xB7 USDA \xB7 " + (candidate.category_ru || ""), async () => {
        const ee2 = epoch(), tt = ++sourceToken;
        const detail = await call2("keto_kitchen", { action: "source_detail", values: { candidate_id: candidate.candidate_id } });
        if (ee2 !== epoch() || tt !== sourceToken) return;
        showSource(detail.candidate);
      }));
    }
    sourceCursor = d2.next_cursor;
    if (sourceCursor) {
      const b2 = button("\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0451", () => loadSource(true));
      b2.dataset.sourceMore = "true";
      sourceResults.append(b2);
    }
  }
  function showSource(c2) {
    review.hidden = false;
    review.replaceChildren(el2("h3", "", "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0437\u0430\u043F\u0438\u0441\u0438 USDA"), el2("p", "", c2.name_en), el2("p", "muted", c2.name_ru_unofficial ? "\u041D\u0435\u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u0435\u0440\u0435\u0432\u043E\u0434: " + c2.name_ru_unofficial : "\u041F\u0435\u0440\u0435\u0432\u043E\u0434 \u043D\u0435 \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D"), el2("p", "muted", "USDA FoodData Central \xB7 SR Legacy \xB7 CC0. \u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0438 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B \u0432 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0435 \u043D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u044B. \u0413\u043B\u0438\u043A\u0435\u043C\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0438\u043D\u0434\u0435\u043A\u0441 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D. \u041F\u043E\u0441\u043B\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u043C\u043E\u0436\u043D\u043E \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0432 \u0437\u0430\u043F\u0430\u0441\u044B \u0438 \u0443\u043A\u0430\u0437\u0430\u0442\u044C \u043C\u0430\u0441\u0441\u0443. \u0415\u0433\u043E \u043C\u043E\u0436\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0434\u043B\u044F \u0440\u0430\u0441\u0447\u0451\u0442\u0430 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u044E\u0434\u0430. \u0414\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0445 \u0440\u0435\u0446\u0435\u043F\u0442\u043E\u0432 \u0438 \u043C\u0435\u043D\u044E \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 \u0441\u043F\u043E\u0441\u043E\u0431\u0430\u043C \u0433\u043E\u0442\u043E\u0432\u043A\u0438 \u0435\u0449\u0451 \u043D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E."));
    const a2 = el2("a", "", "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A USDA");
    a2.href = c2.source_url;
    a2.target = "_blank";
    a2.rel = "noopener noreferrer";
    review.append(a2);
    for (const [key, label] of [["energy_kcal", "\u043A\u043A\u0430\u043B"], ["protein_g", "\u0431\u0435\u043B\u043E\u043A, \u0433"], ["fat_g", "\u0436\u0438\u0440\u044B, \u0433"], ["carbohydrate_total_g", "\u043E\u0431\u0449\u0438\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B, \u0433"], ["fiber_g", "\u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430, \u0433"]]) review.append(el2("p", "", label + " \u043D\u0430 100 \u0433: " + number2(c2[key])));
    const nameLabel = el2("label", "", "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043B\u0438\u0447\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430"), name2 = el2("input");
    name2.value = c2.name_ru_unofficial || c2.name_en;
    name2.maxLength = 200;
    nameLabel.append(name2);
    const stateLabel = el2("label", "", "\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430"), state2 = el2("select");
    for (const [v2, t] of [["", "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435"], ...Object.entries(states).filter(([v3]) => v3 !== "frozen")]) {
      const o2 = el2("option", "", t);
      o2.value = v2;
      state2.append(o2);
    }
    stateLabel.append(state2);
    const allergy = el2("fieldset");
    allergy.append(el2("legend", "", "\u041E\u0442\u043C\u0435\u0442\u044C\u0442\u0435 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0435 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B \u043F\u043E\u0441\u043B\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438"));
    const checks = [];
    for (const [v2, t] of [["egg", "\u042F\u0439\u0446\u0430"], ["milk", "\u041C\u043E\u043B\u043E\u043A\u043E"], ["fish", "\u0420\u044B\u0431\u0430"], ["crustacean_shellfish", "\u0420\u0430\u043A\u043E\u043E\u0431\u0440\u0430\u0437\u043D\u044B\u0435"], ["mollusc", "\u041C\u043E\u043B\u043B\u044E\u0441\u043A\u0438"], ["tree_nut", "\u041E\u0440\u0435\u0445\u0438"], ["peanut", "\u0410\u0440\u0430\u0445\u0438\u0441"], ["soy", "\u0421\u043E\u044F"], ["wheat", "\u041F\u0448\u0435\u043D\u0438\u0446\u0430"], ["gluten", "\u0413\u043B\u044E\u0442\u0435\u043D"], ["sesame", "\u041A\u0443\u043D\u0436\u0443\u0442"], ["celery", "\u0421\u0435\u043B\u044C\u0434\u0435\u0440\u0435\u0439"], ["coconut", "\u041A\u043E\u043A\u043E\u0441"], ["mustard", "\u0413\u043E\u0440\u0447\u0438\u0446\u0430"], ["lupin", "\u041B\u044E\u043F\u0438\u043D"], ["sulfite", "\u0421\u0443\u043B\u044C\u0444\u0438\u0442\u044B"]]) {
      const label = el2("label", "check", t), check = el2("input");
      check.type = "checkbox";
      check.value = v2;
      label.prepend(check);
      allergy.append(label);
      checks.push(check);
    }
    const confirmLabel = el2("label", "check", "\u042F \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u043B(\u0430) \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0438 \u0441\u043F\u0438\u0441\u043E\u043A \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u043E\u0432, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0445"), confirmed = el2("input");
    confirmed.type = "checkbox";
    confirmLabel.prepend(confirmed);
    review.append(nameLabel, stateLabel, allergy, confirmLabel, button("\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043B\u0438\u0447\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430", async () => {
      if (!confirmed.checked || !state2.value || !name2.value.trim()) throw Error("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0438 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B.");
      await act("source_import", null, { candidate_id: c2.candidate_id, release_hash: c2.release_hash, name_ru: name2.value.trim(), state: state2.value, allergens: checks.filter((x) => x.checked).map((x) => x.value), source_review_confirmed: true });
    }));
    review.setAttribute("tabindex", "-1");
    review.focus?.({ preventScroll: true });
    review.scrollIntoView?.({ block: "nearest" });
  }
  const sourceDetails = el2("section", "food-reference");
  sourceDetails.append(el2("h3", "", "\u0411\u043E\u043B\u044C\u0448\u043E\u0439 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432"), el2("p", "field-help", "\u0411\u043E\u043B\u044C\u0448\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432 USDA. \u041F\u0435\u0440\u0435\u0434 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435\u043C \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u043E\u0441\u0442\u0430\u0432."), sourceSearch, sourceResults, review);
  picker.append(sourceDetails);
  stock.append(pantryHint, picker);
  const free = el2("textarea");
  free.id = "kitchen-free";
  free.placeholder = "\u0415\u0441\u0442\u044C \u044F\u0439\u0446\u0430, \u043A\u0430\u0431\u0430\u0447\u043E\u043A \u0438 \u0448\u0430\u043C\u043F\u0438\u043D\u044C\u043E\u043D\u044B";
  free.maxLength = 1e3;
  free.rows = 2;
  free.dataset.testid = "kitchen-free-products";
  const freeLabel = el2("label", "", "\u0418\u043B\u0438 \u043F\u0435\u0440\u0435\u0447\u0438\u0441\u043B\u0438\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0441\u0432\u043E\u0438\u043C\u0438 \u0441\u043B\u043E\u0432\u0430\u043C\u0438");
  freeLabel.htmlFor = free.id;
  const questions = el2("div", "kitchen-questions");
  questions.dataset.testid = "product-questions";
  const parseButton = button("\u0420\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B", async () => {
    if (parsing) return;
    const query = free.value.trim();
    if (!query) {
      status.textContent = "\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0434\u043B\u044F \u0440\u0430\u0437\u0431\u043E\u0440\u0430.";
      return;
    }
    const e = epoch(), token = ++parseNumber;
    parsing = true;
    parseButton.disabled = true;
    status.textContent = "\u0420\u0430\u0437\u0431\u0438\u0440\u0430\u044E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B\u2026";
    try {
      const d2 = await call2("keto_kitchen", { action: "parse", query: /^(?:есть|у меня есть|продукты|из продуктов)(?:\s|:|$)/iu.test(query) ? query : "\u0415\u0441\u0442\u044C " + query });
      if (e !== epoch() || token !== parseNumber || free.value.trim() !== query) {
        status.textContent = "\u0422\u0435\u043A\u0441\u0442 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u0420\u0430\u0437\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A.";
        return;
      }
      questions.replaceChildren();
      for (const i of d2.pantry) {
        const existing = pantry.find((x) => x.food_id === i.food_id);
        if (!existing) addFood({ ...i, name_ru: d2.food_names?.[i.food_id] || i.name_ru });
      }
      renderChips();
      for (const q2 of d2.questions) {
        const row = el2("div", "notice");
        row.append(el2("p", "", q2.text));
        for (const f of q2.choices) row.append(button(f.name_ru + " \xB7 " + (states[f.state] || f.state), async () => {
          addFood(f);
          row.remove();
        }));
        row.append(button("\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u0431\u0435\u0437 \u044D\u0442\u043E\u0433\u043E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430", async () => row.remove()));
        questions.append(row);
      }
      status.textContent = `\u041D\u0430\u0439\u0434\u0435\u043D\u043E: ${d2.pantry.length}; \u0443\u0442\u043E\u0447\u043D\u0435\u043D\u0438\u0439: ${d2.questions.length}. \u0420\u0430\u043D\u0435\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B.`;
    } catch (err) {
      status.textContent = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B: " + err.message;
    } finally {
      if (token === parseNumber) {
        parsing = false;
        parseButton.disabled = false;
      }
    }
  });
  const freeDetails = el2("details");
  freeDetails.append(el2("summary", "", "\u041F\u0435\u0440\u0435\u0447\u0438\u0441\u043B\u0438\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0441\u0432\u043E\u0438\u043C\u0438 \u0441\u043B\u043E\u0432\u0430\u043C\u0438"), freeLabel, free, parseButton);
  stock.append(freeDetails, questions, unsavedNotice, chips);
  function renderChips() {
    unsavedNotice.hidden = !dirty;
    chips.replaceChildren();
    for (const item of pantry) {
      const chip = el2("div", "kitchen-chip");
      chip.dataset.foodId = item.food_id;
      chip.append(el2("strong", "", item.name_ru || "\u041F\u0440\u043E\u0434\u0443\u043A\u0442"), el2("span", "muted", states[item.state] || "\u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E"));
      const label = el2("label", "", "\u0417\u0430\u043F\u0430\u0441, \u0433 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)"), input = el2("input");
      input.type = "text";
      input.inputMode = "decimal";
      input.value = item.grams ?? "";
      input.setAttribute("aria-label", (item.name_ru || "\u041F\u0440\u043E\u0434\u0443\u043A\u0442") + ": \u0433\u0440\u0430\u043C\u043C\u044B");
      input.oninput = () => {
        item.grams = input.value === "" ? null : input.value;
        dirty = true;
        unsavedNotice.hidden = false;
      };
      label.append(input);
      chip.append(label, button("\u0423\u0431\u0440\u0430\u0442\u044C", async () => {
        pantry = pantry.filter((i) => i !== item);
        dirty = true;
        renderChips();
      }));
      chips.append(chip);
    }
    if (!pantry.length) chips.append(el2("p", "muted", "\u0417\u0430\u043F\u0430\u0441\u044B \u043F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u044B. \u0412 \u0440\u0435\u0436\u0438\u043C\u0435 \u0438\u0434\u0435\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u043D\u0435 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B."));
  }
  const stockNote = el2("p", "muted", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0441\u044A\u0435\u0434\u043E\u0431\u043D\u0443\u044E \u043C\u0430\u0441\u0441\u0443 \u0432 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u043C \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0438. \u0428\u0442\u0443\u043A\u0438 \u043D\u0435 \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0432 \u0433\u0440\u0430\u043C\u043C\u044B. \u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u0440\u0435\u0446\u0435\u043F\u0442\u0430 \u043D\u0435 \u0441\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442 \u0437\u0430\u043F\u0430\u0441.");
  stock.append(stockNote, button("\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F", () => act("pantry", null, { items: cleanPantry() })), button("\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u043F\u0430\u0441\u044B", async () => {
    if (dirty && !globalThis.confirm("\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u044C \u043D\u0435\u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u043C\u0438 \u0437\u0430\u043F\u0430\u0441\u0430\u043C\u0438?")) return;
    dirty = false;
    pantry = (getState()?.kitchen?.pantry || []).map((i) => ({ ...i }));
    renderChips();
  }));
  const controls = el2("div", "kitchen-controls");
  function field(id, label, type, value, min, max) {
    const box = el2("label", "", label), input = el2("input");
    input.id = "kitchen-" + id;
    input.name = id;
    input.type = type;
    input.value = value;
    if (min != null) input.min = min;
    if (max != null) input.max = max;
    if (type === "number") {
      input.type = "text";
      input.inputMode = "numeric";
      const step = id === "time" ? 5 : 1, wrap2 = el2("div", "number-control");
      for (const [symbol, delta] of [["\u2212", -1], ["+", 1]]) {
        const b2 = button(symbol, async () => {
          input.value = String(Math.max(min, Math.min(max, (input.value.trim() === "" ? Number(value) : decimal(input.value, min, max)) + delta * step)));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
        b2.setAttribute("aria-label", (delta < 0 ? "\u0423\u043C\u0435\u043D\u044C\u0448\u0438\u0442\u044C " : "\u0423\u0432\u0435\u043B\u0438\u0447\u0438\u0442\u044C ") + label);
        if (delta < 0) wrap2.append(b2, input);
        else wrap2.append(b2);
      }
      box.append(wrap2);
    } else box.append(input);
    controls.append(box);
    return input;
  }
  function select(id, label, options) {
    const box = el2("label", "", label), input = el2("select");
    input.name = id;
    input.id = "kitchen-" + id;
    for (const [v2, t] of options) {
      const o2 = el2("option", "", t);
      o2.value = v2;
      input.append(o2);
    }
    box.append(input);
    controls.append(box);
    return input;
  }
  const meal = select("meal", "\u041F\u0440\u0438\u0451\u043C \u043F\u0438\u0449\u0438", [["dinner", "\u0423\u0436\u0438\u043D"], ["breakfast", "\u0417\u0430\u0432\u0442\u0440\u0430\u043A"], ["lunch", "\u041E\u0431\u0435\u0434"], ["snack", "\u041F\u0435\u0440\u0435\u043A\u0443\u0441"], ["day", "\u0417\u0430\u0432\u0442\u0440\u0430\u043A, \u043E\u0431\u0435\u0434, \u0443\u0436\u0438\u043D"]]);
  const servings = field("servings", "\u041F\u043E\u0440\u0446\u0438\u0439 \u0432\u0441\u0435\u0433\u043E", "number", 1, 1, 6), time = field("time", "\u041C\u0438\u043D\u0443\u0442 \u043D\u0430 \u0431\u043B\u044E\u0434\u043E", "number", 20, 5, 120), missing = field("missing", "\u0414\u043E\u043A\u0443\u043F\u043A\u0430: \u0440\u0430\u0437\u043D\u044B\u0445 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432", "number", 2, 0, 5);
  const equipment = select("equipment", "\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435", [["pan", "\u0421\u043A\u043E\u0432\u043E\u0440\u043E\u0434\u0430"], ["stove", "\u041F\u043B\u0438\u0442\u0430"], ["oven", "\u0414\u0443\u0445\u043E\u0432\u043A\u0430"], ["multicooker", "\u041C\u0443\u043B\u044C\u0442\u0438\u0432\u0430\u0440\u043A\u0430 \xB7 \u043F\u0430\u0440 \u0431\u0435\u0437 \u0434\u0430\u0432\u043B\u0435\u043D\u0438\u044F"], ["air_fryer", "\u0410\u044D\u0440\u043E\u0433\u0440\u0438\u043B\u044C"], ["waffle_iron", "\u0412\u0430\u0444\u0435\u043B\u044C\u043D\u0438\u0446\u0430"], ["no_cook", "\u0411\u0435\u0437 \u043D\u0430\u0433\u0440\u0435\u0432\u0430"]]);
  const equipmentHint = el2("p", "muted");
  equipmentHint.id = "kitchen-equipment-help";
  equipment.setAttribute("aria-describedby", equipmentHint.id);
  controls.append(equipmentHint);
  const equipmentNotes = { multicooker: "\u041F\u043E\u043A\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0440\u0435\u0436\u0438\u043C \xAB\u041D\u0430 \u043F\u0430\u0440\u0443\xBB \u0431\u0435\u0437 \u0434\u0430\u0432\u043B\u0435\u043D\u0438\u044F. \u0412\u043E\u0434\u0443, \u0432\u0441\u0442\u0430\u0432\u043A\u0443 \u0438 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0435 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u043D\u0438\u0435 \u043A\u0440\u044B\u0448\u043A\u0438 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u0442 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F \u0432\u0430\u0448\u0435\u0439 \u043C\u043E\u0434\u0435\u043B\u0438.", air_fryer: "\u041D\u0435 \u043F\u0435\u0440\u0435\u043F\u043E\u043B\u043D\u044F\u0439\u0442\u0435 \u043A\u043E\u0440\u0437\u0438\u043D\u0443. \u0420\u0435\u0436\u0438\u043C \u0438 \u0432\u0440\u0435\u043C\u044F \u0437\u0430\u0432\u0438\u0441\u044F\u0442 \u043E\u0442 \u043C\u043E\u0434\u0435\u043B\u0438; \u0433\u043E\u0442\u043E\u0432\u043D\u043E\u0441\u0442\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E.", waffle_iron: "\u041D\u0435\u0441\u043B\u0430\u0434\u043A\u0438\u0435 \u044F\u0438\u0447\u043D\u043E-\u0441\u044B\u0440\u043D\u044B\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B. \u0420\u0430\u0437\u043C\u0435\u0440 \u0437\u0430\u043A\u043B\u0430\u0434\u043A\u0438 \u0438 \u0440\u0435\u0436\u0438\u043C \u0437\u0430\u0432\u0438\u0441\u044F\u0442 \u043E\u0442 \u0432\u0430\u0444\u0435\u043B\u044C\u043D\u0438\u0446\u044B." };
  equipment.onchange = () => {
    equipmentHint.textContent = equipmentNotes[equipment.value] || "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u0438\u0431\u043E\u0440, \u043A\u043E\u0442\u043E\u0440\u044B\u043C \u0431\u0443\u0434\u0435\u0442\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F.";
    if (equipment.value === "multicooker" && Number(time.value) < 25) time.value = "25";
  };
  equipment.onchange();
  const avoid = el2("input");
  avoid.id = "kitchen-avoid";
  avoid.placeholder = "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u0441\u044B\u0440";
  avoid.maxLength = 200;
  const avoidLabel = el2("label", "", "\u0412\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u0431\u0435\u0437 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430 (\u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435)");
  avoidLabel.htmlFor = avoid.id;
  const avoidList = el2("datalist");
  avoidList.id = "kitchen-avoid-list";
  let avoidFoods = [], selectedAvoid = null, avoidSearchNumber = 0;
  avoid.setAttribute("list", avoidList.id);
  avoid.oninput = () => {
    clearTimeout(avoid.timer);
    const value = avoid.value, token = ++avoidSearchNumber;
    selectedAvoid = avoidFoods.find((f) => value === f.name_ru + " \xB7 " + (states[f.state] || f.state)) || null;
    if (selectedAvoid) return;
    avoid.timer = setTimeout(() => run2(async () => {
      const e = epoch(), d2 = await call2("keto_kitchen", { action: "foods", query: value.slice(0, 200) });
      if (e !== epoch() || token !== avoidSearchNumber || value !== avoid.value) return;
      avoidFoods = d2.foods;
      avoidList.replaceChildren(...avoidFoods.map((f) => {
        const o2 = el2("option");
        o2.value = f.name_ru + " \xB7 " + (states[f.state] || f.state);
        return o2;
      }));
    }), 250);
  };
  controls.append(avoidList);
  const avoidHint = el2("p", "ux-hint", "\u0418\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u043F\u043E\u0434\u0431\u043E\u0440\u0430. \u041F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u044B\u0435 \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u0438 \u0438 \u043F\u0440\u0435\u0434\u043F\u043E\u0447\u0442\u0435\u043D\u0438\u044F \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0432 \u041F\u0440\u043E\u0444\u0438\u043B\u0435.");
  avoidHint.id = "kitchen-avoid-help";
  avoid.setAttribute("aria-describedby", avoidHint.id);
  controls.append(avoidLabel, avoid, avoidHint);
  form.append(modes, controls);
  const guide = el2("details", "ux-guide"), guideBody = el2("div", "ux-guide-body");
  guideBody.append(el2("p", "", "\u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0441\u0432\u0435\u0440\u044F\u0435\u0442 \u0441\u043E\u0441\u0442\u0430\u0432, \u0432\u0430\u0448\u0438 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F, \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B \u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0435 \u043A\u0443\u0445\u043E\u043D\u043D\u043E\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435. \u042D\u0442\u043E \u0440\u0430\u0441\u0447\u0451\u0442\u043D\u0430\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u043E \u0431\u0430\u0437\u0435 \u0434\u0430\u043D\u043D\u044B\u0445, \u0430 \u043D\u0435 \u043B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0439 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0438."));
  guide.append(el2("summary", "", "\u0427\u0442\u043E \u0437\u0434\u0435\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u043F\u043E\u0434\u0431\u043E\u0440\u0435?"), guideBody);
  form.append(guide);
  const generate = el2("button", "primary", "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C \u0431\u043B\u044E\u0434\u0430");
  generate.type = "submit";
  generate.dataset.testid = "kitchen-generate";
  const generateStatus = el2("p", "muted");
  generateStatus.setAttribute("role", "status");
  form.append(generate, generateStatus);
  stock.append(status);
  const results = el2("div");
  results.dataset.testid = "kitchen-results";
  const savedPreview = el2("section", "panel");
  savedPreview.hidden = true;
  savedPreview.dataset.testid = "confirmed-pantry-preview";
  let savedToken = 0;
  const recipeHost = $3("recipe-kitchen-slot");
  if (recipeHost) {
    host.replaceChildren(stock);
    recipeHost.replaceChildren(savedPreview, form, results);
  } else host.replaceChildren(stock, savedPreview, form, results);
  const cleanPantry = () => pantry.map(({ food_id, state: state2, grams }) => ({ food_id, state: state2, grams: grams === null || grams === "" ? null : decimal(grams, 0.1, 3e4) }));
  async function act(action, rid, values2 = {}) {
    const state2 = getState();
    const d2 = await call2("keto_kitchen", { action, thread_id: state2.active_thread || "main", expected_revision: state2.revision, ...rid ? { recipe_id: rid } : {}, values: values2 });
    accept2(d2);
    return d2;
  }
  form.onsubmit = (e) => {
    e.preventDefault();
    if (busy2) return;
    run2(async () => {
      busy2 = true;
      generate.disabled = true;
      if (parsing || questions.children.length) {
        busy2 = false;
        generate.disabled = false;
        throw Error(parsing ? "\u0414\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F \u0440\u0430\u0437\u0431\u043E\u0440\u0430 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432." : "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0438\u043B\u0438 \u044F\u0432\u043D\u043E \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u0435 \u0431\u0435\u0437 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0445.");
      }
      const e2 = epoch(), token = ++localEpoch;
      generateStatus.textContent = "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u044E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0438 \u0441\u043F\u043E\u0441\u043E\u0431\u044B \u0433\u043E\u0442\u043E\u0432\u043A\u0438\u2026";
      try {
        const selected = selectedAvoid || avoidFoods.find((f) => avoid.value === f.name_ru + " \xB7 " + (states[f.state] || f.state));
        if (avoid.value && !selected) throw Error("\u0414\u043B\u044F \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435.");
        const fid = selected?.food_id;
        const spec = { mode: new FormData(form).get("mode"), meal: meal.value, servings: decimal(servings.value, 1, 6), time_budget: decimal(time.value, 5, 120), equipment: equipment.value, max_missing_items: decimal(missing.value, 0, 5), pantry: cleanPantry(), avoid: fid ? [fid] : [] };
        const d2 = await call2("keto_kitchen", { action: "generate", spec, thread_id: getState().active_thread || "main", expected_revision: getState().revision, request_id: crypto.randomUUID().replaceAll("-", "") });
        if (e2 !== epoch() || token !== localEpoch) return;
        accept2(d2);
        show(d2);
        generateStatus.textContent = d2.message || "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D\u043D\u044B\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B.";
      } catch (error) {
        if (e2 === epoch() && token === localEpoch) generateStatus.textContent = error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u043E\u0431\u0440\u0430\u0442\u044C \u0431\u043B\u044E\u0434\u0430. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F.";
        throw error;
      } finally {
        if (e2 === epoch() && token === localEpoch) {
          busy2 = false;
          generate.disabled = false;
        }
      }
    });
  };
  function listItems(items) {
    const list = el2("ul", "ingredient-list");
    for (const i of items) list.append(el2("li", "", i.name_ru + " \xB7 " + (i.stock_quantity_unknown ? "\u043D\u0443\u0436\u043D\u043E " + number2(i.required_grams) + " \u0433; \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0437\u0430\u043F\u0430\u0441" : number2(i.grams_edible) + " \u0433") + " \xB7 " + (states[i.state] || i.state)));
    return list;
  }
  function card(r, { source: originSource } = {}) {
    const thread = originSource?.thread_id || getState()?.active_thread || "main";
    const c2 = el2("article", "panel kitchen-candidate");
    c2.dataset.testid = "kitchen-candidate";
    c2.dataset.recipeId = r.recipe_id;
    c2.append(el2("span", "tag", r.draft_label || "\u0421\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u044B\u0439 \u0440\u0435\u0446\u0435\u043F\u0442"), el2("h3", "", r.name_ru), el2("p", "muted", r.ingredients.map((i) => i.name_ru).slice(0, 3).join(" \xB7 ")), el2("p", "muted", r.active_minutes + " \u043C\u0438\u043D \xB7 " + number2(r.servings || 1) + " \u043F\u043E\u0440\u0446\u0438\u0439 \u0432\u0441\u0435\u0433\u043E"));
    if (r.equipment_note) c2.append(el2("p", "notice", r.equipment_note));
    const fit = el2("details"), fitSummary = el2("summary", "", "\u041F\u043E\u0447\u0435\u043C\u0443 \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442");
    fit.append(fitSummary, el2("p", "", r.fit_note || "\u0421\u043E\u0441\u0442\u0430\u0432 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D \u043F\u043E \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0443."));
    c2.append(fit);
    if (r.meal_role === "side_or_light") c2.append(el2("p", "notice", "\u041D\u0435\u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0431\u043B\u044E\u0434\u043E / \u0433\u0430\u0440\u043D\u0438\u0440 \u2014 \u043D\u0435 \u0432\u0435\u0441\u044C \u043F\u0440\u0438\u0451\u043C \u043F\u0438\u0449\u0438."));
    const n = r.nutrition;
    c2.append(el2("p", "nutrition", "\u041D\u0430 \u043F\u043E\u0440\u0446\u0438\u044E: " + number2(n.energy_kcal) + " \u043A\u043A\u0430\u043B \xB7 \u0431\u0435\u043B\u043E\u043A " + number2(n.protein_g) + " \u0433 \xB7 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B \u043E\u0431\u0449\u0438\u0435 " + number2(n.carbohydrate_total_g) + " \u0433 \xB7 \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430 " + number2(n.fiber_g) + " \u0433"));
    const batch = r.whole_batch;
    if (batch) c2.append(el2("p", "nutrition", "\u0412\u0441\u0451 \u0431\u043B\u044E\u0434\u043E: " + number2(batch.nutrition.energy_kcal) + " \u043A\u043A\u0430\u043B \xB7 \u0431\u0435\u043B\u043E\u043A " + number2(batch.nutrition.protein_g) + " \u0433 \xB7 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B " + number2(batch.nutrition.carbohydrate_total_g) + " \u0433"));
    c2.append(el2("h4", "", "\u041D\u0430 \u043E\u0434\u043D\u0443 \u043F\u043E\u0440\u0446\u0438\u044E"), listItems(r.ingredients));
    if (batch) {
      const b2 = el2("details");
      b2.append(el2("summary", "", "\u0413\u0440\u0430\u043C\u043C\u044B \u043D\u0430 \u0432\u0441\u0451 \u0431\u043B\u044E\u0434\u043E"), listItems(batch.ingredients));
      c2.append(b2);
    }
    const steps = el2("details");
    steps.append(el2("summary", "", "\u041F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u0435"));
    for (const step of String(r.steps_ru).split("\n")) steps.append(el2("p", "", step));
    c2.append(steps);
    c2.append(el2("h4", "", "\u0414\u043E\u043A\u0443\u043F\u043A\u0430 \u0438 \u0437\u0430\u043F\u0430\u0441 \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438"), r.missing?.length ? listItems(r.missing) : el2("p", "muted", "\u0414\u043E\u043A\u0443\u043F\u043A\u0430 \u043D\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u043E \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u043C\u0443 \u0437\u0430\u043F\u0430\u0441\u0443. \u041D\u0435\u0443\u043A\u0430\u0437\u0430\u043D\u043D\u0443\u044E \u043C\u0430\u0441\u0441\u0443 \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C."));
    const source = el2("details");
    source.append(el2("summary", "", "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0438 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F"));
    source.append(el2("p", "muted", r.quantity_note || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043D\u0435 \u0440\u0430\u0432\u043D\u044B \u043D\u0443\u043B\u044E."));
    for (const s2 of r.sources || []) {
      const a2 = el2("a", "", s2.source_id);
      a2.href = s2.url;
      a2.target = "_blank";
      a2.rel = "noopener noreferrer";
      source.append(a2, el2("br"));
    }
    c2.append(source);
    const actions = el2("div", "kitchen-actions");
    if (typeof openIntake === "function") actions.append(button("\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435", () => openIntake({ recipe_id: r.recipe_id, name_ru: r.name_ru, amount: { value: 1, unit: "portion" }, thread_id: thread, origin: originSource?.origin, generation_id: originSource?.generation_id || r.generation_id }), "primary"));
    actions.append(button("\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0434\u043B\u044F \u0447\u0430\u0442\u0430", async () => {
      accept2(await call2("keto_kitchen", { action: "select", recipe_id: r.recipe_id, thread_id: getState().active_thread || "main", expected_revision: getState().revision }));
      notify2("\u0412\u044B\u0431\u0440\u0430\u043D\u043E. \u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0447\u0430\u0442\u0430 \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u043A \u044D\u0442\u043E\u043C\u0443 \u0440\u0435\u0446\u0435\u043F\u0442\u0443.");
    }));
    for (const a2 of ["save", "favorite"]) actions.append(button(kitchenActionLabels[a2], () => act(a2, r.recipe_id)));
    const rating = el2("select");
    rating.setAttribute("aria-label", "\u041E\u0446\u0435\u043D\u043A\u0430 \u0440\u0435\u0446\u0435\u043F\u0442\u0430");
    for (let n2 = 1; n2 <= 5; n2++) {
      const o2 = el2("option", "", String(n2));
      o2.value = n2;
      rating.append(o2);
    }
    rating.value = "5";
    actions.append(rating, button("\u041E\u0446\u0435\u043D\u0438\u0442\u044C", () => act("rate", r.recipe_id, { rating: Number(rating.value) })));
    c2.append(actions);
    return c2;
  }
  function show(data, target = results) {
    if (target === results) result = data;
    target.replaceChildren();
    if (data.fallback_reason) target.append(el2("p", "notice", "\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u0440\u0435\u0446\u0435\u043F\u0442\u044B \u043F\u043E \u0433\u043E\u0442\u043E\u0432\u044B\u043C \u0448\u0430\u0431\u043B\u043E\u043D\u0430\u043C. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u043E\u0441\u0442\u0430\u0432 \u043F\u0435\u0440\u0435\u0434 \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u0435\u043C."));
    for (const q2 of data.questions || []) target.append(el2("p", "notice", q2));
    if (!(data.recipes || []).length) target.append(el2("p", "notice", "\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0445 \u0431\u043B\u044E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E. \u041B\u0438\u0447\u043D\u044B\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u043C\u043E\u0436\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0432 \u0441\u0432\u043E\u0451\u043C \u0431\u043B\u044E\u0434\u0435."), el2("p", "ux-hint", "\u0423\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0437\u0430\u043F\u0430\u0441\u044B, \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0440\u0435\u0436\u0438\u043C \u043D\u0430 \xAB\u041C\u043E\u0436\u043D\u043E \u0434\u043E\u043A\u0443\u043F\u0438\u0442\u044C\xBB \u0438\u043B\u0438 \xAB\u0412\u0441\u0435 \u0440\u0435\u0446\u0435\u043F\u0442\u044B\xBB \u043B\u0438\u0431\u043E \u0441\u043E\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0432\u043E\u0451 \u0431\u043B\u044E\u0434\u043E."));
    const grid = el2("div", "recipe-grid kitchen-grid");
    grid.append(...(data.recipes || []).map(card));
    target.append(grid);
    if (data.day) target.append(dayCard(data));
  }
  function dayCard(data) {
    const box = el2("div", "panel");
    box.dataset.testid = "kitchen-day";
    box.append(el2("h2", "", "\u0414\u0435\u043D\u044C \u043F\u0438\u0442\u0430\u043D\u0438\u044F"), el2("p", "", data.day.status === "calculated_draft" ? "\u041F\u043E\u043B\u043D\u044B\u0435 \u0434\u043D\u0435\u0432\u043D\u044B\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u044B; \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435." : "\u0414\u0435\u043D\u044C \u043F\u043E\u043A\u0430 \u043D\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442: " + data.day.issues.map((x) => ({ "three_meals_unavailable": "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0431\u0440\u0430\u0442\u044C \u0442\u0440\u0438 \u043F\u0440\u0438\u0451\u043C\u0430 \u043F\u0438\u0449\u0438", "global_inventory_shortfall": "\u0437\u0430\u043F\u0430\u0441\u0430 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u043D\u0430 \u0432\u0435\u0441\u044C \u0434\u0435\u043D\u044C", "global_missing_item_limit": "\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432 \u0434\u043B\u044F \u0434\u043E\u043A\u0443\u043F\u043A\u0438", "confirmed_targets_required": "\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B", "safety_or_screening": "\u043D\u0443\u0436\u043D\u043E \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0439", "stale_targets": "\u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u043D\u0443\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C", "outside_target:energy_kcal": "\u044D\u043D\u0435\u0440\u0433\u0438\u044F \u0432\u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430", "outside_target:protein_g": "\u0431\u0435\u043B\u043E\u043A \u0432\u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430", "fiber_below_target": "\u043D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0438", "saturated_fat_excess": "\u043C\u043D\u043E\u0433\u043E \u043D\u0430\u0441\u044B\u0449\u0435\u043D\u043D\u044B\u0445 \u0436\u0438\u0440\u043E\u0432", "carb_limit:net_carbohydrate_g": "\u043F\u0440\u0435\u0432\u044B\u0448\u0435\u043D \u043B\u0438\u043C\u0438\u0442 net-\u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432", "carb_limit:carbohydrate_total_g": "\u043F\u0440\u0435\u0432\u044B\u0448\u0435\u043D \u043B\u0438\u043C\u0438\u0442 \u043E\u0431\u0449\u0438\u0445 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432" })[x] || "\u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0443\u0442\u043E\u0447\u043D\u0435\u043D\u0438\u0435 \u0441\u043E\u0441\u0442\u0430\u0432\u0430").join("; ")), el2("h3", "", "\u041E\u0431\u0449\u0430\u044F \u0434\u043E\u043A\u0443\u043F\u043A\u0430"), listItems(data.day.shopping || []));
    if (data.day.status === "calculated_draft") box.append(button("\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u043E\u0442 \u0434\u0435\u043D\u044C", () => act("accept_day", data.recipes[0].recipe_id)));
    return box;
  }
  const memory = $3("kitchen-memory");
  function renderMemory() {
    if (!memory) return;
    const state2 = getState(), info = state2?.kitchen;
    memory.replaceChildren(el2("h1", "", "\u0427\u0442\u043E \u044F \u043F\u043E\u043C\u043D\u044E"));
    if (!info) return;
    memory.append(el2("p", "muted", info.memory_limits));
    const profile = state2.profile, baseline = profile.baseline || {}, identity = el2("article", "panel");
    identity.append(el2("h2", "", profile.display_name || "\u0412\u0430\u0448 \u043F\u0440\u043E\u0444\u0438\u043B\u044C"));
    for (const [label, value] of [["\u0426\u0435\u043B\u044C", profile.goal], ["\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441", profile.timezone], ["\u0420\u043E\u0441\u0442", baseline.height_cm == null ? null : baseline.height_cm + " \u0441\u043C"], ["\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0439 \u0432\u0435\u0441", baseline.weight_kg == null ? null : baseline.weight_kg + " \u043A\u0433" + (baseline.measured_at ? " \xB7 " + baseline.measured_at : "")]]) if (value) identity.append(el2("p", "", label + ": " + value));
    identity.append(button("\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044C", async () => setView2("setup")));
    memory.append(identity);
    for (const fact of info.preferences) {
      const row = el2("article", "panel");
      row.dataset.testid = "memory-fact";
      row.append(el2("h3", "", fact.text), el2("p", "muted", "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E \u0432\u0430\u043C\u0438 \xB7 " + fact.at), button("\u0417\u0430\u0431\u044B\u0442\u044C", () => act("forget", null, { fact_id: fact.id })));
      memory.append(row);
    }
    for (const fact of info.legacy_disliked || []) {
      const row = el2("article", "panel");
      row.append(el2("h3", "", "\u041D\u0435 \u043B\u044E\u0431\u043B\u044E: " + fact.name_ru), el2("p", "muted", "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438. \u0414\u0430\u0442\u0430 \u0441\u0442\u0430\u0440\u043E\u0433\u043E \u0444\u0430\u043A\u0442\u0430 \u043D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430."), button("\u0417\u0430\u0431\u044B\u0442\u044C", async () => {
        accept2(await call2("keto_propose_change", { event_type: "settings.update", payload: { disliked_food_ids: getState().profile.settings.disliked_food_ids.filter((id) => id !== fact.food_id) }, expected_revision: getState().revision }));
      }));
      memory.append(row);
    }
    for (const favorite of info.favorites_details || []) {
      const row = el2("article", "panel");
      row.append(el2("h3", "", "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435: " + favorite.name_ru), button("\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E", async () => {
        accept2(await call2("keto_propose_change", { event_type: "settings.update", payload: { favorites: getState().profile.settings.favorites.filter((id) => id !== favorite.recipe_id) }, expected_revision: getState().revision }));
      }));
      memory.append(row);
    }
    if (info.pantry_origin) memory.append(el2("p", "muted", "\u041C\u043E\u0438 \u0437\u0430\u043F\u0430\u0441\u044B \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u044B \u0432\u0430\u043C\u0438: " + info.pantry_origin.at));
    const pref = el2("input");
    pref.placeholder = "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u0440\u044B\u0431\u0443";
    pref.setAttribute("aria-label", "\u041A\u0430\u043A\u043E\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u043D\u0435 \u043B\u044E\u0431\u0438\u0442\u0435");
    memory.append(pref, button("\u0417\u0430\u043F\u043E\u043C\u043D\u0438\u0442\u044C: \u043D\u0435 \u043B\u044E\u0431\u043B\u044E", async () => {
      const d2 = await call2("keto_chat", { message: "\u0417\u0430\u043F\u043E\u043C\u043D\u0438, \u043D\u0435 \u043B\u044E\u0431\u043B\u044E " + pref.value, request_id: crypto.randomUUID().replaceAll("-", ""), thread_id: state2.active_thread || "main" });
      accept2(d2);
    }));
    for (const [title, value, view2] of [["\u041F\u0438\u0449\u0435\u0432\u044B\u0435 \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u0438", state2.profile.allergies.map((id) => ({ milk: "\u043C\u043E\u043B\u043E\u043A\u043E", egg: "\u044F\u0439\u0446\u0430", fish: "\u0440\u044B\u0431\u0430", crustacean_shellfish: "\u0440\u0430\u043A\u043E\u043E\u0431\u0440\u0430\u0437\u043D\u044B\u0435", mollusc: "\u043C\u043E\u043B\u043B\u044E\u0441\u043A\u0438", wheat: "\u043F\u0448\u0435\u043D\u0438\u0446\u0430", gluten: "\u0433\u043B\u044E\u0442\u0435\u043D", soy: "\u0441\u043E\u044F", peanut: "\u0430\u0440\u0430\u0445\u0438\u0441", tree_nut: "\u043E\u0440\u0435\u0445\u0438", sesame: "\u043A\u0443\u043D\u0436\u0443\u0442", celery: "\u0441\u0435\u043B\u044C\u0434\u0435\u0440\u0435\u0439", mustard: "\u0433\u043E\u0440\u0447\u0438\u0446\u0430", lupin: "\u043B\u044E\u043F\u0438\u043D", sulfite: "\u0441\u0443\u043B\u044C\u0444\u0438\u0442\u044B", coconut: "\u043A\u043E\u043A\u043E\u0441" })[id] || "\u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435: " + id).join(", ") || "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B", "setup"], ["\u041E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u043F\u0438\u0442\u0430\u043D\u0438\u044F", state2.guidance?.targets_stale ? "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B, \u043D\u043E \u043D\u0443\u0436\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u043E\u0441\u043B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u043F\u0440\u043E\u0444\u0438\u043B\u044F" : state2.profile.targets?.status === "agreed" ? "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B" : "\u041D\u0435 \u0437\u0430\u0434\u0430\u043D\u044B", "targets"], ["\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435", state2.profile.settings.favorites.length + " \u0440\u0435\u0446\u0435\u043F\u0442\u043E\u0432", "recipes"], ["\u041C\u043E\u0438 \u0437\u0430\u043F\u0430\u0441\u044B", info.pantry.length + " \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432", "recipes"]]) {
      const row = el2("article", "panel");
      row.append(el2("h3", "", title), el2("p", "", value), el2("p", "muted", "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C; \u0434\u0430\u0442\u0430 \u043F\u0440\u0435\u0436\u043D\u0438\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043C\u043E\u0436\u0435\u0442 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C."), button("\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C / \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C", async () => setView2(view2)));
      memory.append(row);
    }
  }
  function invalidatePageLookups() {
    searchNumber++;
    avoidSearchNumber++;
    sourceToken++;
    parseNumber++;
    clearTimeout(product.timer);
    clearTimeout(avoid.timer);
    parsing = false;
    parseButton.disabled = false;
  }
  function cancelSavedPreview() {
    savedToken++;
    savedPreview.hidden = true;
    savedPreview.replaceChildren();
  }
  function previewSavedPantry(name2) {
    const state2 = getState(), stock2 = state2?.kitchen?.pantry;
    if (!Array.isArray(stock2)) throw Error("\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u043F\u0430\u0441\u044B \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B.");
    const stamp = state2.revision, token = ++savedToken;
    savedPreview.hidden = false;
    savedPreview.replaceChildren();
    savedPreview.append(el2("h2", "", "\u041F\u043E\u0434\u0431\u043E\u0440 \u043F\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u043C \u0437\u0430\u043F\u0430\u0441\u0430\u043C"), el2("p", "", `\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \xAB${name2}\xBB. \u041B\u0438\u0447\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0441 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0438 \u043F\u043E\u043A\u0430 \u043D\u0435 \u0434\u043E\u043F\u0443\u0449\u0435\u043D\u044B \u043A \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u043C \u0441\u043F\u043E\u0441\u043E\u0431\u0430\u043C \u0433\u043E\u0442\u043E\u0432\u043A\u0438; \u0438\u0445 \u043C\u043E\u0436\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0432 \u0441\u0432\u043E\u0451\u043C \u0431\u043B\u044E\u0434\u0435.`), el2("p", "muted", dirty ? "\u0412\u0430\u0448 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043A\u0443\u0445\u043D\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435. \u041F\u043E\u0434\u0431\u043E\u0440 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u043F\u0430\u0441\u044B \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E." : "\u041F\u043E\u0434\u0431\u043E\u0440 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u043F\u0430\u0441\u044B \u0438 \u0442\u0435\u043A\u0443\u0449\u0438\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043D\u0438\u0436\u0435."));
    const list = el2("ul");
    for (const i of stock2) list.append(el2("li", "", (i.name_ru || "\u041F\u0440\u043E\u0434\u0443\u043A\u0442") + " \xB7 " + (i.grams == null ? "\u043C\u0430\u0441\u0441\u0430 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430" : number2(i.grams) + " \u0433")));
    savedPreview.append(list);
    const output = el2("div");
    const start2 = button("\u041D\u0430\u0447\u0430\u0442\u044C \u043F\u043E\u0434\u0431\u043E\u0440 \u043F\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u043C \u0437\u0430\u043F\u0430\u0441\u0430\u043C", async () => {
      if (busy2) return;
      const now = getState();
      if (now?.revision !== stamp) {
        previewSavedPantry(name2);
        throw Error("\u0417\u0430\u043F\u0430\u0441\u044B \u0438\u043B\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0438 \u043D\u0430\u0447\u043D\u0438\u0442\u0435 \u043F\u043E\u0434\u0431\u043E\u0440 \u0435\u0449\u0451 \u0440\u0430\u0437.");
      }
      const chosen = selectedAvoid || avoidFoods.find((f) => avoid.value === f.name_ru + " \xB7 " + (states[f.state] || f.state));
      if (avoid.value && !chosen) throw Error("\u0414\u043B\u044F \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435.");
      const spec = { mode: "pantry_only", meal: meal.value, servings: decimal(servings.value, 1, 6), time_budget: decimal(time.value, 5, 120), equipment: equipment.value, max_missing_items: decimal(missing.value, 0, 5), pantry: now.kitchen.pantry.map(({ food_id, state: state3, grams }) => ({ food_id, state: state3, grams })), avoid: chosen ? [chosen.food_id] : [] };
      const e = epoch();
      busy2 = true;
      start2.disabled = true;
      generate.disabled = true;
      output.replaceChildren(el2("p", "muted", "\u041F\u043E\u0434\u0431\u0438\u0440\u0430\u044E \u0431\u043B\u044E\u0434\u0430\u2026"));
      try {
        const d2 = await call2("keto_kitchen", { action: "generate", spec, thread_id: now.active_thread || "main", expected_revision: now.revision, request_id: crypto.randomUUID().replaceAll("-", "") });
        if (e !== epoch() || token !== savedToken) return;
        accept2(d2);
        show(d2, output);
      } catch (error) {
        if (e === epoch() && token === savedToken) output.replaceChildren(el2("p", "notice", error.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u043E\u0431\u0440\u0430\u0442\u044C \u0431\u043B\u044E\u0434\u0430. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F."));
        throw error;
      } finally {
        if (e === epoch()) {
          busy2 = false;
          generate.disabled = false;
          if (token === savedToken) start2.disabled = false;
        }
      }
    });
    savedPreview.append(start2, output);
    savedPreview.scrollIntoView?.({ block: "nearest" });
  }
  return { chooseMode(mode) {
    if (!kitchenModes.some(([id]) => id === mode)) throw Error("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043F\u043E\u0441\u043E\u0431 \u043F\u043E\u0434\u0431\u043E\u0440\u0430.");
    form.elements.namedItem("mode").value = mode;
    specDirty = true;
    generateStatus.textContent = "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C \u0431\u043B\u044E\u0434\u0430\xBB.";
  }, previewSavedPantry, cancelSavedPreview, invalidatePageLookups, render() {
    const state2 = getState();
    if (!dirty) {
      pantry = (state2?.kitchen?.pantry || []).map((i) => ({ ...i }));
      renderChips();
    }
    renderMemory();
  }, async load(isCurrent = () => true) {
    const e = epoch(), searchAtStart = searchNumber, draft = () => JSON.stringify([meal.value, servings.value, time.value, missing.value, equipment.value, avoid.value, free.value, product.value, ...Array.from(modes.children, (x) => Boolean(x.children[0]?.checked))]), draftAtStart = draft();
    try {
      let d2 = {};
      try {
        d2 = await call2("keto_kitchen", { action: "status", thread_id: getState()?.active_thread || "main" });
      } catch {
      }
      if (e !== epoch() || !isCurrent()) return false;
      const f = await call2("keto_kitchen", { action: "foods" });
      if (e !== epoch() || !isCurrent()) return false;
      allFoods = f.foods;
      if (searchNumber === searchAtStart) {
        if (!product.value.trim() && !selectedFood) {
          foods = allFoods;
          foodOptions();
          status.textContent = "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438\u043B\u0438 \u043F\u043E\u043A\u0430\u0436\u0438\u0442\u0435 \u0432\u0441\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B.";
        }
      }
      const unchanged = !dirty && !specDirty && draft() === draftAtStart;
      if (d2.spec && unchanged) {
        for (const name2 of ["meal", "servings", "equipment"]) {
          const node = form.elements.namedItem(name2);
          if (node) node.value = d2.spec[name2];
        }
        time.value = d2.spec.time_budget;
        missing.value = d2.spec.max_missing_items;
        form.elements.namedItem("mode").value = d2.spec.mode;
        equipmentHint.textContent = equipmentNotes[equipment.value] || "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u0438\u0431\u043E\u0440, \u043A\u043E\u0442\u043E\u0440\u044B\u043C \u0431\u0443\u0434\u0435\u0442\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F.";
        pantry = d2.spec.pantry.map((i) => ({ ...i, name_ru: foods.find((f2) => f2.food_id === i.food_id)?.name_ru || getState().kitchen.pantry.find((f2) => f2.food_id === i.food_id)?.name_ru || "\u041F\u0440\u043E\u0434\u0443\u043A\u0442" }));
        renderChips();
      }
      if (d2.recipes && unchanged) show(d2);
      return true;
    } catch (err) {
      if (e === epoch() && isCurrent()) status.textContent = err.message;
      return false;
    }
  }, reset() {
    cancelSavedPreview();
    pantry = [];
    foods = [];
    allFoods = [];
    trustedStart = 0;
    datalist.replaceChildren();
    trustedList.replaceChildren();
    trustedList.hidden = true;
    status.textContent = "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B\u2026";
    result = null;
    dirty = false;
    specDirty = false;
    busy2 = false;
    generate.disabled = false;
    parsing = false;
    parseButton.disabled = false;
    parseNumber++;
    searchNumber++;
    sourceToken++;
    sourceResults.replaceChildren();
    review.replaceChildren();
    review.hidden = true;
    avoidSearchNumber++;
    selectedFood = null;
    add.disabled = true;
    browsing = false;
    selectedAvoid = null;
    avoidFoods = [];
    avoidList.replaceChildren();
    avoid.value = "";
    localEpoch++;
    servings.value = "1";
    time.value = "20";
    missing.value = "2";
    clearTimeout(product.timer);
    clearTimeout(avoid.timer);
    results.replaceChildren();
    generateStatus.textContent = "";
    questions.replaceChildren();
    product.value = "";
    free.value = "";
    if (memory) memory.replaceChildren();
    renderChips();
  }, card, show, dayCard };
}

// cloudflare-saas/public/knowledge-data.js
var knowledge = { "version": "starter-v1", "checked": "2026-11-08", "topics": [{ "id": "energy", "title": "\u042D\u043D\u0435\u0440\u0433\u0438\u044F", "text": "Mifflin \u043E\u0446\u0435\u043D\u0438\u0432\u0430\u0435\u0442 \u0440\u0430\u0441\u0445\u043E\u0434 \u0432 \u043F\u043E\u043A\u043E\u0435. \u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C \u2014 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0435 \u043F\u0440\u0438\u0431\u043B\u0438\u0437\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0434\u043E\u043F\u0443\u0449\u0435\u043D\u0438\u0435; \u044D\u0442\u043E \u043D\u0435 \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C NIDDK. \u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D \xB110%, \u043C\u044F\u0433\u043A\u043E\u0435 \u0441\u043D\u0438\u0436\u0435\u043D\u0438\u0435 10%/\u0434\u043E 300 \u043A\u043A\u0430\u043B \u0438 \u0433\u0440\u0430\u043D\u0438\u0446\u044B \u043F\u0438\u043B\u043E\u0442\u0430 \u2014 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432\u0430\u044F \u043F\u043E\u043B\u0438\u0442\u0438\u043A\u0430.", "sources": ["ENGINE01", "S_ENERGY", "START_ENERGY_2013", "START_USDA_DRI"], "evidence": [{ "source_ids": ["S01", "S04", "S07", "S10"] }] }, { "id": "protein", "title": "\u0411\u0435\u043B\u043E\u043A", "text": "\u041F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 1,2\u20131,6 \u0433/\u043A\u0433 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u043C\u0430\u0441\u0441\u044B \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u044B \u043D\u0430 \u043E\u0431\u0437\u043E\u0440\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u043E \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044E \u0432\u0435\u0441\u0430. \u041F\u0435\u0440\u0435\u043D\u043E\u0441 \u043D\u0430 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u043C\u0430\u0441\u0441\u044B \u2014 \u0434\u043E\u043F\u0443\u0449\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430, \u043D\u0435 \u0443\u043D\u0438\u0432\u0435\u0440\u0441\u0430\u043B\u044C\u043D\u0430\u044F \u043D\u043E\u0440\u043C\u0430. \u041F\u0440\u0438 \u043F\u043E\u0447\u0435\u0447\u043D\u044B\u0445 \u0438 \u0434\u0440\u0443\u0433\u0438\u0445 \u0444\u043B\u0430\u0433\u0430\u0445 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0440\u0430\u0441\u0447\u0451\u0442 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D.", "sources": ["START_PROTEIN", "S20", "S11"], "evidence": [{ "source_ids": ["S01", "S05", "S11"] }] }, { "id": "carbs", "title": "\u0423\u0433\u043B\u0435\u0432\u043E\u0434\u044B \u0438 net", "text": "\u0420\u0435\u0436\u0438\u043C\u044B 100 \u0438 50 \u0433 \u043E\u0431\u0449\u0438\u0445 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432 \u2014 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430, \u043D\u0435 \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u044F \u043A\u0435\u0442\u043E\u0437\u0430. Net \u2014 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0430\u044F \u043E\u0446\u0435\u043D\u043A\u0430; \u043F\u043E\u043B\u0438\u043E\u043B\u044B \u043D\u0435 \u0432\u044B\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438. \u041C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0430\u044F \u0441\u0445\u0435\u043C\u0430 4:1 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F.", "sources": ["S11", "S_NET", "S_LABEL", "S_USDA"], "evidence": [{ "source_ids": ["S_NET", "S_LABEL", "S_USDA"] }] }, { "id": "fat", "title": "\u041A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u0436\u0438\u0440\u043E\u0432 \u0438 LDL", "text": "\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u043D\u0430\u0441\u044B\u0449\u0435\u043D\u043D\u044B\u0445 \u0436\u0438\u0440\u043E\u0432 10% \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u043E\u0431\u0449\u0443\u044E \u043F\u043E\u043B\u0438\u0442\u0438\u043A\u0443 \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0438. \u042D\u0442\u043E \u043D\u0435 \u0446\u0435\u043B\u044C \u0441\u044A\u0435\u0441\u0442\u044C \u043C\u0430\u0441\u043B\u043E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E. \u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u0430\u044F \u0440\u0435\u0430\u043A\u0446\u0438\u044F \u043B\u0438\u043F\u0438\u0434\u043E\u0432 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043E\u0446\u0435\u043D\u043A\u0438, \u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u0430 \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u043D\u0435 \u043E\u0431\u0435\u0449\u0430\u044E\u0442\u0441\u044F.", "sources": ["S06", "S17", "S11"], "evidence": [{ "source_ids": ["S03", "S06", "S17"] }] }, { "id": "fiber", "title": "\u041A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430", "text": "\u0421\u0442\u0430\u0440\u0442\u043E\u0432\u044B\u0439 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440 14 \u0433/1000 \u043A\u043A\u0430\u043B \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u0432 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u043A\u0430\u043A \u043F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0446\u0435\u043B\u044C. \u0423\u0432\u0435\u043B\u0438\u0447\u0438\u0432\u0430\u0439\u0442\u0435 \u043F\u043E\u0441\u0442\u0435\u043F\u0435\u043D\u043D\u043E \u0441 \u0443\u0447\u0451\u0442\u043E\u043C \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u043C\u043E\u0441\u0442\u0438; \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u043E\u0441\u0442\u0430\u0432 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430 \u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u043D\u0443\u043B\u0451\u043C.", "sources": ["S11"], "evidence": [{ "source_ids": ["S01", "S05", "S11"] }] }, { "id": "safety", "title": "\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438", "text": "\u0411\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0441\u0442\u044C, \u043A\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435, SGLT2, \u0434\u0438\u0430\u0431\u0435\u0442 1 \u0442\u0438\u043F\u0430, \u043F\u043E\u0447\u0435\u0447\u043D\u044B\u0435 \u0438 \u0434\u0440\u0443\u0433\u0438\u0435 \u0444\u043B\u0430\u0433\u0438, \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0435 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0430 \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u0440\u0430\u0437\u0431\u043E\u0440\u0430. \u0420\u0435\u0446\u0435\u043F\u0442\u044B \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u044B\u043C\u0438; \u0430\u043D\u043A\u0435\u0442\u0430 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u043C \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435\u043C.", "sources": ["S11", "S12", "S13", "S14", "S20"], "evidence": [{ "source_ids": ["S11", "S12", "S13"] }] }, { "id": "monitoring", "title": "\u041A\u043E\u0433\u0434\u0430 \u043F\u0435\u0440\u0435\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C", "text": "\u0421\u0442\u0430\u0440\u043E\u0435 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435 30 \u0434\u043D\u0435\u0439 \u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u043C\u0430\u0441\u0441\u044B \u043D\u0430 5% \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u044E\u0442 \u043E \u043F\u0435\u0440\u0435\u0441\u043C\u043E\u0442\u0440\u0435. \u042D\u0442\u043E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432\u044B\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u0430, \u0431\u0435\u0437 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u043A\u0430\u043B\u043E\u0440\u0438\u0439 \u0438 \u0431\u0435\u0437 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u043E\u0433\u043E \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F.", "sources": ["S11", "START_USDA_DRI"], "evidence": [{ "source_ids": ["S_OPENAI2", "S_OPENAI3"] }] }], "sources": [{ "id": "S01", "title": "Low-carbohydrate versus balanced-carbohydrate diets for reducing weight and cardiovascular risk", "url": "https://www.cochrane.org/evidence/CD013334_low-carbohydrate-diets-or-balanced-carbohydrate-diets-which-works-better-weight-loss-and-heart", "year": 2022, "date": "2026-11-07", "status": "included", "scope": "\u0420\u0430\u0437\u043D\u044B\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u044F low-carb; \u044D\u0442\u043E \u043D\u0435 \u043E\u0431\u0437\u043E\u0440 \u0438\u0441\u043A\u043B\u044E\u0447\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u043E\u0433\u043E \u043A\u0435\u0442\u043E\u0437\u0430. \u041F\u043E \u043D\u0435\u0436\u0435\u043B\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C \u044F\u0432\u043B\u0435\u043D\u0438\u044F\u043C \u0434\u0430\u043D\u043D\u044B\u0445 \u043C\u0435\u043D\u044C\u0448\u0435." }, { "id": "S02", "title": "Efficacy and safety of low and very low carbohydrate diets for type 2 diabetes remission", "url": "https://pubmed.ncbi.nlm.nih.gov/33441384/", "year": 2021, "date": "2026-11-07", "status": "included", "scope": "\u041F\u043E\u0440\u043E\u0433 HbA1c \u0441 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043D\u043D\u044B\u043C\u0438 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0430\u043C\u0438 \u043D\u0435\u043B\u044C\u0437\u044F \u043D\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0440\u0435\u043C\u0438\u0441\u0441\u0438\u0435\u0439 \u0431\u0435\u0437 \u0442\u0435\u0440\u0430\u043F\u0438\u0438. \u0414\u0430\u043D\u043D\u044B\u0435 12 \u043C\u0435\u0441\u044F\u0446\u0435\u0432 \u043C\u0435\u043D\u0435\u0435 \u0443\u0431\u0435\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u044B." }, { "id": "S03", "title": "Effect of a ketogenic diet versus Mediterranean diet on glycated hemoglobin: the Keto-Med randomized crossover trial", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9437985/", "year": 2022, "date": "2026-11-07", "status": "included", "scope": "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0435 \u043F\u0435\u0440\u0438\u043E\u0434\u044B, \u043D\u0435\u0431\u043E\u043B\u044C\u0448\u0430\u044F \u0432\u044B\u0431\u043E\u0440\u043A\u0430, \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u044B\u0439 \u044D\u0444\u0444\u0435\u043A\u0442 \u043F\u043E\u0440\u044F\u0434\u043A\u0430; \u0435\u0441\u0442\u044C \u0441\u0432\u044F\u0437\u0430\u043D\u043D\u043E\u0435 \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 S03E, \u0435\u0433\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u043D\u0435 \u0438\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u043E." }, { "id": "S03E", "title": "Erratum to Keto-Med randomized crossover trial", "url": "https://pubmed.ncbi.nlm.nih.gov/36349565/", "year": 2022, "date": "2026-11-07", "status": "correction_pending_full_review", "scope": "\u041F\u043E\u043B\u043D\u043E\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E; \u043F\u0435\u0440\u0435\u0434 \u043A\u043B\u0438\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u043C \u0432\u043D\u0435\u0434\u0440\u0435\u043D\u0438\u0435\u043C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u0437\u0434\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0443\u044E \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0443\u044E \u0432\u0435\u0440\u0441\u0438\u044E." }, { "id": "S04", "title": "Effect of Low-Fat vs Low-Carbohydrate Diet on 12-Month Weight Loss: DIETFITS", "url": "https://pubmed.ncbi.nlm.nih.gov/29466592/", "year": 2018, "date": "2026-11-07", "status": "included", "scope": "\u041A 12 \u043C\u0435\u0441\u044F\u0446\u0430\u043C low-carb \u043E\u043A\u043E\u043B\u043E 30% \u044D\u043D\u0435\u0440\u0433\u0438\u0438 \u0438\u0437 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432: \u044D\u0442\u043E \u043D\u0435 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u0441\u0442\u0440\u043E\u0433\u043E\u0433\u043E \u043A\u0435\u0442\u043E." }, { "id": "S05", "title": "Effect of a plant-based, low-fat diet versus an animal-based, ketogenic diet on ad libitum energy intake", "url": "https://pubmed.ncbi.nlm.nih.gov/33479499/", "year": 2021, "date": "2026-11-07", "status": "included", "scope": "\u0412\u0441\u0435\u0433\u043E 2 \u043D\u0435\u0434\u0435\u043B\u0438 \u043D\u0430 \u0444\u0430\u0437\u0443, \u0431\u0435\u0437 washout; \u0441\u043E\u0441\u0442\u0430\u0432 \u0438 \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432 \u0442\u043E\u0436\u0435 \u0440\u0430\u0437\u043B\u0438\u0447\u0430\u043B\u0438\u0441\u044C. \u041D\u0435 \u0434\u043E\u043B\u0433\u043E\u0441\u0440\u043E\u0447\u043D\u044B\u0439 \u0442\u0435\u0441\u0442 \u043F\u043E\u0445\u0443\u0434\u0435\u043D\u0438\u044F." }, { "id": "S06", "title": "A Ketogenic Low-Carbohydrate High-Fat Diet Increases LDL Cholesterol in Healthy, Young, Normal-Weight Women", "url": "https://pubmed.ncbi.nlm.nih.gov/33801247/", "year": 2021, "date": "2026-11-07", "status": "included", "scope": "\u041C\u0430\u043B\u0430\u044F \u0432\u044B\u0431\u043E\u0440\u043A\u0430, 4 \u043D\u0435\u0434\u0435\u043B\u0438, \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0439 \u0441\u043E\u0441\u0442\u0430\u0432 \u0436\u0438\u0440\u043E\u0432. \u041D\u0435\u043B\u044C\u0437\u044F \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442\u044C \u0440\u0430\u0437\u043C\u0435\u0440 \u044D\u0444\u0444\u0435\u043A\u0442\u0430 \u043D\u0430 \u043B\u044E\u0431\u043E\u0439 \u043A\u0435\u0442\u043E\u0433\u0435\u043D\u043D\u044B\u0439 \u0440\u0430\u0446\u0438\u043E\u043D." }, { "id": "S07", "title": "Effects of an energy-restricted low-carbohydrate, high unsaturated fat/low saturated fat diet versus a high-carbohydrate diet in type 2 diabetes: 2-year trial", "url": "https://pubmed.ncbi.nlm.nih.gov/29178536/", "year": 2018, "date": "2026-11-07", "status": "included", "scope": "61 \u0438\u0437 115 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0438; low-carb 14% \u044D\u043D\u0435\u0440\u0433\u0438\u0438 \u0438\u0437 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432, \u043D\u0435 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E \u043F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u043E\u0433\u043E \u043A\u0435\u0442\u043E\u0437\u0430. \u041D\u0430\u0441\u044B\u0449\u0435\u043D\u043D\u044B\u0435 \u0436\u0438\u0440\u044B \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u0432\u0430\u043B\u0438\u0441\u044C." }, { "id": "S08", "title": "5-Year Effects of a Novel Continuous Remote Care Model With Carbohydrate Restriction in Type 2 Diabetes", "url": "https://pubmed.ncbi.nlm.nih.gov/39433217/", "year": 2024, "date": "2026-11-07", "status": "included", "scope": "\u0418\u0437 262 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0445 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u043D\u0430 5-\u043B\u0435\u0442\u043D\u0435\u0439 \u0442\u043E\u0447\u043A\u0435 122. \u041D\u0435 \u0440\u0430\u043D\u0434\u043E\u043C\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043E, \u0431\u0435\u0437 \u0441\u043E\u043F\u043E\u0441\u0442\u0430\u0432\u0438\u043C\u043E\u0433\u043E 5-\u043B\u0435\u0442\u043D\u0435\u0433\u043E \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044F; \u044D\u0444\u0444\u0435\u043A\u0442 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B \u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0436\u0434\u0435\u043D\u0438\u044F \u043D\u0435 \u043E\u0442\u0434\u0435\u043B\u0451\u043D \u043E\u0442 \u043F\u0438\u0442\u0430\u043D\u0438\u044F." }, { "id": "S09", "title": "Effects of ketogenic diet on health outcomes: an umbrella review of meta-analyses of randomized clinical trials", "url": "https://pubmed.ncbi.nlm.nih.gov/37231411/", "year": 2023, "date": "2026-11-07", "status": "included", "scope": "\u041C\u0435\u0434\u0438\u0430\u043D\u043D\u0430\u044F \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0445 \u0438\u0441\u043F\u044B\u0442\u0430\u043D\u0438\u0439 13 \u043D\u0435\u0434\u0435\u043B\u044C; \u043F\u0435\u0440\u0435\u043A\u0440\u044B\u0432\u0430\u044E\u0449\u0438\u0435\u0441\u044F \u043C\u0435\u0442\u0430\u0430\u043D\u0430\u043B\u0438\u0437\u044B \u043D\u0435 \u0434\u0430\u044E\u0442 \u043D\u043E\u0432\u044B\u0445 \u043D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u044B\u0445 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432." }, { "id": "S10", "title": "Ketogenic versus non-ketogenic diets with comparable energy prescriptions: systematic review and meta-analysis", "url": "https://pubmed.ncbi.nlm.nih.gov/42588148/", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "6 \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u0451\u043D\u043D\u044B\u0445 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0439, 259 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432; \u043D\u0438\u0437\u043A\u0430\u044F \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C. \u041F\u0440\u0435\u0434\u043F\u0438\u0441\u0430\u043D\u043D\u0430\u044F \u044D\u043D\u0435\u0440\u0433\u0438\u044F \u043D\u0435 \u0440\u0430\u0432\u043D\u0430 \u0440\u0435\u0430\u043B\u044C\u043D\u043E \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0439; \u0432 protein-matched \u043F\u043E\u0434\u0433\u0440\u0443\u043F\u043F\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043D\u0435\u0442\u043E\u0447\u0435\u043D." }, { "id": "S11", "title": "Facilitating Positive Health Behaviors and Well-being to Improve Health Outcomes: Standards of Care in Diabetes\u20142026", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12690188/", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u041D\u0435 \u0443\u043D\u0438\u0432\u0435\u0440\u0441\u0430\u043B\u044C\u043D\u043E\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0438\u043B\u0438 \u0437\u0430\u043F\u0440\u0435\u0442 \u043A\u0435\u0442\u043E \u0434\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0432\u0437\u0440\u043E\u0441\u043B\u043E\u0433\u043E; \u0434\u0438\u0430\u0431\u0435\u0442 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043A\u043B\u0438\u043D\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u0432\u0435\u0434\u0435\u043D\u0438\u044F." }, { "id": "S12", "title": "Pharmacologic Approaches to Glycemic Treatment: Standards of Care in Diabetes\u20142026", "url": "https://doi.org/10.2337/dc26-S009", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u041D\u0435 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435 \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u0440\u0430\u0441\u0447\u0451\u0442\u0430 \u0434\u043E\u0437 \u0438\u043D\u0441\u0443\u043B\u0438\u043D\u0430 \u0447\u0430\u0442-\u0431\u043E\u0442\u043E\u043C." }, { "id": "S13", "title": "SEGLUROMET prescribing information: ketoacidosis warning", "url": "https://www.dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=a6aeb99a-ce49-4125-90ce-642df3f1ebad&type=display", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u041A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0439 \u043F\u0440\u0435\u043F\u0430\u0440\u0430\u0442; \u0434\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0430 \u043D\u0443\u0436\u043D\u0430 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u0430\u044F \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F." }, { "id": "S14", "title": "International Recommendations for the Management of Adults Treated With Ketogenic Diet Therapies", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC8610544/", "year": 2021, "date": "2026-11-07", "status": "included", "scope": "\u042D\u043A\u0441\u043F\u0435\u0440\u0442\u043D\u044B\u0439 \u043A\u043E\u043D\u0441\u0435\u043D\u0441\u0443\u0441 \u0446\u0435\u043D\u0442\u0440\u043E\u0432 \u043B\u0435\u0447\u0435\u043D\u0438\u044F, \u043D\u0435 \u0420\u041A\u0418; \u0435\u0433\u043E \u0440\u0435\u0436\u0438\u043C \u0430\u043D\u0430\u043B\u0438\u0437\u043E\u0432 \u043D\u0435\u043B\u044C\u0437\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043D\u0430\u0437\u043D\u0430\u0447\u0430\u0442\u044C \u0432\u0441\u0435\u043C \u0445\u0443\u0434\u0435\u044E\u0449\u0438\u043C." }, { "id": "S15", "title": "Ketogenic diets for drug-resistant epilepsy", "url": "https://pubmed.ncbi.nlm.nih.gov/32588435/", "year": 2020, "date": "2026-11-07", "status": "included", "scope": "\u0420\u041A\u0418 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u044B, \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u043D\u0438\u0437\u043A\u0430\u044F/\u043E\u0447\u0435\u043D\u044C \u043D\u0438\u0437\u043A\u0430\u044F \u0434\u043B\u044F \u0440\u044F\u0434\u0430 \u0438\u0441\u0445\u043E\u0434\u043E\u0432. \u041D\u0435\u043B\u044C\u0437\u044F \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442\u044C \u043B\u0435\u0447\u0435\u0431\u043D\u043E\u0435 \u0441\u043E\u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u0435 4:1 \u0432 \u0431\u044B\u0442\u043E\u0432\u043E\u0435 \u043F\u043E\u0445\u0443\u0434\u0435\u043D\u0438\u0435." }, { "id": "S16", "title": "Popular Dietary Patterns: Alignment With American Heart Association 2021 Dietary Guidance", "url": "https://professional.heart.org/en/science-news/popular-dietary-patterns-alignment-with-american-heart-association-2021-dietary-guidance/top-things-to-know", "year": 2023, "date": "2026-11-07", "status": "included", "scope": "\u042D\u0442\u043E \u043E\u0446\u0435\u043D\u043A\u0430 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u044F \u043F\u0438\u0449\u0435\u0432\u043E\u0433\u043E \u0448\u0430\u0431\u043B\u043E\u043D\u0430 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F\u043C, \u043D\u0435 \u043F\u0440\u044F\u043C\u043E\u0435 \u0440\u0430\u043D\u0434\u043E\u043C\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0435 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0441\u043C\u0435\u0440\u0442\u043D\u043E\u0441\u0442\u0438." }, { "id": "S17", "title": "2026 Guideline on the Management of Dyslipidemia", "url": "https://professional.heart.org/en/science-news/2026-guideline-on-the-management-of-dyslipidemia", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0420\u0435\u0448\u0435\u043D\u0438\u0435 \u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u043E\u0431\u0449\u0435\u0433\u043E \u0440\u0438\u0441\u043A\u0430 \u0438 \u0432\u0442\u043E\u0440\u0438\u0447\u043D\u044B\u0445 \u043F\u0440\u0438\u0447\u0438\u043D; \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442 \u043D\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043B\u0438\u043F\u0438\u0434\u0441\u043D\u0438\u0436\u0430\u044E\u0449\u0438\u0435 \u043F\u0440\u0435\u043F\u0430\u0440\u0430\u0442\u044B." }, { "id": "S18", "title": "Longitudinal Data From the KETO-CTA Study: Plaque Predicts Plaque, ApoB Does Not", "url": "https://pubmed.ncbi.nlm.nih.gov/40192608/", "year": 2025, "date": "2026-11-07", "status": "excluded_retracted", "scope": "\u0418\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u0438\u0437 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0449\u0435\u0433\u043E \u043A\u043E\u0440\u043F\u0443\u0441\u0430. \u0421\u0432\u044F\u0437\u0430\u043D\u043D\u043E\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 S19." }, { "id": "S19", "title": "Retraction notice: Longitudinal Data from the KETO-CTA Study", "url": "https://pubmed.ncbi.nlm.nih.gov/42206798/", "year": 2026, "date": "2026-11-07", "status": "integrity_control", "scope": "\u041E\u0442\u0437\u044B\u0432 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u043A \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0439 \u0441\u0442\u0430\u0442\u044C\u0435 2025 \u0433\u043E\u0434\u0430, \u0430 \u043D\u0435 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043A\u043E \u0432\u0441\u0435\u043C \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u044F\u043C KETO." }, { "id": "S20", "title": "Incidence and Characteristics of Kidney Stones in Patients on Ketogenic Diet: A Systematic Review and Meta-Analysis", "url": "https://pubmed.ncbi.nlm.nih.gov/34070285/", "year": 2021, "date": "2026-11-07", "status": "included", "scope": "\u0421\u0440\u0435\u0434\u043D\u0435\u0435 \u043D\u0430\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u0435 \u043E\u043A\u043E\u043B\u043E 3.7 \u0433\u043E\u0434\u0430; \u043C\u043D\u043E\u0433\u043E \u043B\u0435\u0447\u0435\u0431\u043D\u044B\u0445/\u044D\u043F\u0438\u043B\u0435\u043F\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u043F\u043E\u043F\u0443\u043B\u044F\u0446\u0438\u0439. \u041D\u0435 \u0433\u043E\u0434\u043E\u0432\u043E\u0439 \u0440\u0438\u0441\u043A \u0434\u043B\u044F \u0437\u0434\u043E\u0440\u043E\u0432\u043E\u0439 \u0436\u0435\u043D\u0449\u0438\u043D\u044B." }, { "id": "S21", "title": "KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease", "url": "https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf", "year": 2024, "date": "2026-11-07", "status": "included", "scope": "\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442\u044C \u0432\u044B\u0441\u043E\u043A\u043E\u0431\u0435\u043B\u043A\u043E\u0432\u043E\u0435 \u0431\u044B\u0442\u043E\u0432\u043E\u0435 \u043C\u0435\u043D\u044E \u043D\u0430 \u0425\u0411\u041F. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 S157, \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u0430\u044F \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u043C." }, { "id": "S22", "title": "EASL\u2013EASD\u2013EASO Clinical Practice Guidelines on the management of MASLD", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11299976/", "year": 2024, "date": "2026-11-07", "status": "included", "scope": "\u0415\u0441\u0442\u044C \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 DOI 10.1159/000541386, \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u043D\u0435 \u0438\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u043E; \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438." }, { "id": "S23", "title": "Recommendations from the 2023 International Evidence-based Guideline for the Assessment and Management of PCOS", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10477934/", "year": 2023, "date": "2026-11-07", "status": "included", "scope": "\u041D\u0435 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442, \u0447\u0442\u043E \u043F\u0438\u0442\u0430\u043D\u0438\u0435 \u043D\u0435 \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442; \u0430\u043A\u0446\u0435\u043D\u0442 \u043D\u0430 \u0443\u0441\u0442\u043E\u0439\u0447\u0438\u0432\u043E\u043C \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u043E\u043C \u043F\u043E\u0434\u0445\u043E\u0434\u0435." }, { "id": "S24", "title": "Ketogenic dietary intervention in women with polycystic ovary syndrome: randomized trial", "url": "https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2026.1920489/full", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u041E\u0442\u043A\u0440\u044B\u0442\u043E\u0435 \u043E\u0434\u043D\u043E\u0446\u0435\u043D\u0442\u0440\u043E\u0432\u043E\u0435 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435, \u043E\u0447\u0435\u043D\u044C \u0431\u043E\u043B\u044C\u0448\u0438\u0435 \u044D\u0444\u0444\u0435\u043A\u0442\u044B \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u043E\u0439 \u0440\u0435\u043F\u043B\u0438\u043A\u0430\u0446\u0438\u0438; \u043D\u0435 \u0434\u043E\u043A\u0430\u0437\u0430\u043D\u043E \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0435 \u0436\u0438\u0432\u043E\u0440\u043E\u0436\u0434\u0435\u043D\u0438\u0439. \u041D\u0435 \u0437\u0430\u043C\u0435\u043D\u044F\u0435\u0442 \u043E\u0431\u0449\u0438\u0439 guideline." }, { "id": "S25", "title": "International society of sports nutrition position stand: ketogenic diets", "url": "https://pubmed.ncbi.nlm.nih.gov/38934469/", "year": 2024, "date": "2026-11-07", "status": "included", "scope": "\u0420\u0430\u0437\u043B\u0438\u0447\u0430\u044E\u0442\u0441\u044F \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0441\u0442\u044C, \u0432\u0438\u0434 \u0441\u043F\u043E\u0440\u0442\u0430, \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0430\u0434\u0430\u043F\u0442\u0430\u0446\u0438\u0438 \u0438 \u044D\u043D\u0435\u0440\u0433\u0435\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0441\u0442\u044C." }, { "id": "S26", "title": "Ketogenic Diets Alter the Gut Microbiome Resulting in Decreased Intestinal Th17 Cells", "url": "https://pubmed.ncbi.nlm.nih.gov/32437658/", "year": 2020, "date": "2026-11-07", "status": "included", "scope": "\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u0442\u044C \u043C\u0438\u043A\u0440\u043E\u0431\u0438\u043E\u043C\u043D\u044B\u0435 \u0441\u0434\u0432\u0438\u0433\u0438 \u0432 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E \u043B\u0435\u0447\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u044F \u043A\u0438\u0448\u0435\u0447\u043D\u0438\u043A\u0430 \u0443 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0433\u043E \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430." }, { "id": "S_USDA", "title": "FoodData Central API Guide and SR Legacy food records", "url": "https://fdc.nal.usda.gov/api-guide/", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D \u0438\u0441\u0442\u043E\u0440\u0438\u0447\u0435\u0441\u043A\u0438\u0439 SR Legacy, \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F 2019, \u0430 \u043D\u0435 \u043D\u043E\u0432\u0435\u0439\u0448\u0430\u044F Foundation. API-\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043E\u043A\u0440\u0443\u0433\u043B\u0435\u043D\u044B; \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0435 \u0431\u0440\u0435\u043D\u0434\u044B \u043C\u043E\u0433\u0443\u0442 \u043E\u0442\u043B\u0438\u0447\u0430\u0442\u044C\u0441\u044F." }, { "id": "S_LABEL", "title": "How to Understand and Use the Nutrition Facts Label", "url": "https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0410\u043C\u0435\u0440\u0438\u043A\u0430\u043D\u0441\u043A\u0430\u044F \u043C\u0430\u0440\u043A\u0438\u0440\u043E\u0432\u043A\u0430; \u043D\u0435 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442\u044C \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u0432\u044B\u0447\u0438\u0442\u0430\u043D\u0438\u044F \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0438 \u043D\u0430 \u0438\u043D\u0443\u044E \u044E\u0440\u0438\u0441\u0434\u0438\u043A\u0446\u0438\u044E." }, { "id": "S_NET", "title": "Get to Know Carbs", "url": "https://diabetes.org/food-nutrition/understanding-carbs/get-to-know-carbs", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u041D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043C\u0435\u0445\u0430\u043D\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u0432\u044B\u0447\u0438\u0442\u0430\u043D\u0438\u0435 \u0432\u0441\u0435\u0445 \u0441\u0430\u0445\u0430\u0440\u043D\u044B\u0445 \u0441\u043F\u0438\u0440\u0442\u043E\u0432 \u0434\u043B\u044F \u0438\u043D\u0441\u0443\u043B\u0438\u043D\u0430 \u0438\u043B\u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u043A\u0435\u0442\u043E\u0437\u0430." }, { "id": "S_FOODSAFE", "title": "Safe Food Handling", "url": "https://www.fda.gov/food/buy-store-serve-safe-food/safe-food-handling", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0420\u0435\u0446\u0435\u043F\u0442\u044B \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0438 \u043D\u0435 \u043F\u0440\u043E\u0448\u043B\u0438 \u043A\u0443\u0445\u043E\u043D\u043D\u043E\u0435 \u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435; \u0432\u0440\u0435\u043C\u044F \u043F\u0440\u0438\u0431\u043B\u0438\u0437\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435." }, { "id": "S_FISH", "title": "Advice about Eating Fish", "url": "https://www.fda.gov/food/consumers/advice-about-eating-fish", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0421\u043F\u0435\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0435 \u0447\u0430\u0441\u0442\u043E\u0442\u043D\u044B\u0435 \u043D\u043E\u0440\u043C\u044B \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u043F\u0440\u0435\u0436\u0434\u0435 \u0432\u0441\u0435\u0433\u043E \u043A \u0431\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0441\u0442\u0438/\u0434\u0435\u0442\u044F\u043C; \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0430 \u043D\u0435 \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0435\u0442 \u0431\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u043C \u043A\u0435\u0442\u043E." }, { "id": "S_ENERGY", "title": "Body Weight Planner", "url": "https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 \u0434\u043B\u044F \u0432\u0437\u0440\u043E\u0441\u043B\u044B\u0445, \u043D\u0435 \u0431\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0441\u0442\u0438/\u043A\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u044F; \u043D\u0435 \u0442\u043E\u0447\u043D\u043E\u0435 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435 \u043C\u0435\u0442\u0430\u0431\u043E\u043B\u0438\u0437\u043C\u0430." }, { "id": "S_CA", "title": "Calcium \u2014 Health Professional Fact Sheet", "url": "https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0413\u043E\u0434 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438, \u043D\u0435 \u0433\u043E\u0434 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u043D\u043E\u0440\u043C\u044B; \u043D\u043E\u0440\u043C\u044B \u043D\u0435 \u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u043C \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\u043C." }, { "id": "S_MG", "title": "Magnesium \u2014 Health Professional Fact Sheet", "url": "https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0413\u043E\u0434 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438, \u043D\u0435 \u0433\u043E\u0434 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u043D\u043E\u0440\u043C\u044B; \u043D\u043E\u0440\u043C\u044B \u043D\u0435 \u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u043C \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\u043C." }, { "id": "S_K", "title": "Potassium \u2014 Health Professional Fact Sheet", "url": "https://ods.od.nih.gov/factsheets/Potassium-HealthProfessional/", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0413\u043E\u0434 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438, \u043D\u0435 \u0433\u043E\u0434 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u043D\u043E\u0440\u043C\u044B; \u043D\u043E\u0440\u043C\u044B \u043D\u0435 \u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u043C \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\u043C." }, { "id": "S_FE", "title": "Iron \u2014 Health Professional Fact Sheet", "url": "https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0413\u043E\u0434 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438, \u043D\u0435 \u0433\u043E\u0434 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u043D\u043E\u0440\u043C\u044B; \u043D\u043E\u0440\u043C\u044B \u043D\u0435 \u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u043C \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\u043C." }, { "id": "S_D", "title": "Vitamin D \u2014 Health Professional Fact Sheet", "url": "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0413\u043E\u0434 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438, \u043D\u0435 \u0433\u043E\u0434 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u043D\u043E\u0440\u043C\u044B; \u043D\u043E\u0440\u043C\u044B \u043D\u0435 \u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u043C \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\u043C." }, { "id": "S_FOL", "title": "Folate \u2014 Health Professional Fact Sheet", "url": "https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0413\u043E\u0434 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438, \u043D\u0435 \u0433\u043E\u0434 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u043D\u043E\u0440\u043C\u044B; \u043D\u043E\u0440\u043C\u044B \u043D\u0435 \u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u043C \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\u043C." }, { "id": "S_B12", "title": "Vitamin B12 \u2014 Health Professional Fact Sheet", "url": "https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0413\u043E\u0434 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438, \u043D\u0435 \u0433\u043E\u0434 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u043D\u043E\u0440\u043C\u044B; \u043D\u043E\u0440\u043C\u044B \u043D\u0435 \u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u043C \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\u043C." }, { "id": "S_OPENAI1", "title": "Creating and editing GPTs", "url": "https://help.openai.com/en/articles/8554397-creating-and-editing-gpts", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F \u0438 \u0437\u0430\u0432\u0438\u0441\u044F\u0442 \u043E\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430/workspace. \u041F\u0435\u0440\u0435\u0434 \u0440\u0435\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0435\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E." }, { "id": "S_OPENAI2", "title": "GPTs in ChatGPT", "url": "https://help.openai.com/en/articles/8554407-gpts-in-chatgpt", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u041E\u0431\u0441\u0443\u0436\u0434\u0430\u0435\u0442\u0441\u044F \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439 \u043F\u0435\u0440\u0435\u0445\u043E\u0434 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430; \u043D\u0435 \u043E\u0441\u043D\u043E\u0432\u0430 \u0434\u043B\u044F \u043E\u0431\u0435\u0449\u0430\u043D\u0438\u044F \u043F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u043E\u0439 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0439 \u043F\u0430\u043C\u044F\u0442\u0438." }, { "id": "S_OPENAI3", "title": "Projects in ChatGPT", "url": "https://help.openai.com/en/articles/10169521-projects-in-chatgpt", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u041F\u0430\u043C\u044F\u0442\u044C \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u043D\u0435 \u0437\u0430\u043C\u0435\u043D\u044F\u0435\u0442 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0443\u044E \u0431\u0430\u0437\u0443, \u0436\u0443\u0440\u043D\u0430\u043B \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439 \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0447\u0438\u0441\u0435\u043B." }, { "id": "S_OPENAI4", "title": "Your data \u2014 API documentation", "url": "https://developers.openai.com/api/docs/guides/your-data", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u041D\u0435 \u043E\u0431\u0435\u0449\u0430\u0442\u044C zero retention, \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u043C \u0442\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F\u043C \u0438\u043B\u0438 \u043F\u043E\u043B\u043D\u043E\u0435 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u0431\u0435\u0437 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0439 \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438." }, { "id": "S_OPENAI5", "title": "Data Controls FAQ", "url": "https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u043E\u0433\u043E ChatGPT, API \u0438 \u0431\u0438\u0437\u043D\u0435\u0441-\u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 \u0440\u0430\u0437\u043B\u0438\u0447\u0430\u044E\u0442\u0441\u044F." }, { "id": "S_STORAGE", "title": "How do I handle leftovers safely?", "url": "https://ask.fsis.usda.gov/article/How-do-I-handle-leftovers-safely/", "year": 2024, "date": "2026-11-07", "status": "included", "scope": "\u041D\u0435 \u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0433\u043E\u0442\u043E\u0432\u0443\u044E \u043F\u0442\u0438\u0446\u0443 \u0432\u0441\u044E \u043D\u0435\u0434\u0435\u043B\u044E \u0432 \u0445\u043E\u043B\u043E\u0434\u0438\u043B\u044C\u043D\u0438\u043A\u0435; \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 2 \u0447\u0430\u0441\u0430 \u0432\u043D\u0435 \u0445\u043E\u043B\u043E\u0434\u0430, 1 \u0447\u0430\u0441 \u043F\u0440\u0438 \u0436\u0430\u0440\u0435 \u0432\u044B\u0448\u0435 32 \xB0C." }, { "id": "S_ALLERGY", "title": "Food Allergies", "url": "https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies", "year": 2026, "date": "2026-11-07", "status": "included", "scope": "\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u0441\u043B\u043E\u0432\u0430 \u0432 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0438 \u0440\u0435\u0446\u0435\u043F\u0442\u0430 \u043D\u0435 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u0430. \u041F\u0435\u0440\u0435\u0447\u0435\u043D\u044C \u0432 \u0431\u0430\u0437\u0435 \u043D\u0435 \u0437\u0430\u043C\u0435\u043D\u044F\u0435\u0442 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0443." }, { "id": "ENGINE01", "title": "A new predictive equation for resting energy expenditure in healthy individuals", "url": "https://pubmed.ncbi.nlm.nih.gov/2305711/", "year": 1990, "date": "2026-11-08", "status": "included", "scope": "resting energy estimate only; 498 healthy adults19\u201378; activity multiplier separate assumption; no deficit prescription" }, { "id": "S_ENERGY", "title": "NIDDK Body Weight Planner \u2014 activity context, not this algorithm", "url": "https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner", "year": null, "date": "2026-11-08", "status": "included", "scope": "PAL context only; this product does not implement Hall's dynamic model." }, { "id": "START_PROTEIN", "title": "Leidy et al. The role of protein in weight loss and maintenance", "url": "https://pubmed.ncbi.nlm.nih.gov/25926512/", "year": 2015, "date": "2026-11-08", "status": "included", "scope": "Review of 1.2\u20131.6 g/kg in weight management; adherence and heterogeneous populations limit generalization. Maintenance carryover is product policy." }, { "id": "START_ENERGY_2013", "title": "2013 AHA/ACC/TOS Guideline for the Management of Overweight and Obesity in Adults", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5819889/", "year": 2013, "date": "2026-11-08", "status": "included", "scope": "Historical energy ranges, not a current 2026 guideline or our 10%/300 rule." }, { "id": "START_USDA_DRI", "title": "USDA DRI Calculator for Healthcare Professionals", "url": "https://www.nal.usda.gov/human-nutrition-and-food-safety/dri-calculator", "year": null, "date": "2026-11-08", "status": "included", "scope": "Individual requirements vary; this product does not implement the DRI calculator." }], "excluded": [{ "id": "S03E", "title": "Erratum to Keto-Med randomized crossover trial", "url": "https://pubmed.ncbi.nlm.nih.gov/36349565/", "year": 2022, "date": "2026-11-07", "status": "correction_pending_full_review", "scope": "\u041F\u043E\u043B\u043D\u043E\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E; \u043F\u0435\u0440\u0435\u0434 \u043A\u043B\u0438\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u043C \u0432\u043D\u0435\u0434\u0440\u0435\u043D\u0438\u0435\u043C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u0437\u0434\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0443\u044E \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0443\u044E \u0432\u0435\u0440\u0441\u0438\u044E." }, { "id": "S18", "title": "Longitudinal Data From the KETO-CTA Study: Plaque Predicts Plaque, ApoB Does Not", "url": "https://pubmed.ncbi.nlm.nih.gov/40192608/", "year": 2025, "date": "2026-11-07", "status": "excluded_retracted", "scope": "\u0418\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u0438\u0437 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0449\u0435\u0433\u043E \u043A\u043E\u0440\u043F\u0443\u0441\u0430. \u0421\u0432\u044F\u0437\u0430\u043D\u043D\u043E\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 S19." }, { "id": "S19", "title": "Retraction notice: Longitudinal Data from the KETO-CTA Study", "url": "https://pubmed.ncbi.nlm.nih.gov/42206798/", "year": 2026, "date": "2026-11-07", "status": "integrity_control", "scope": "\u041E\u0442\u0437\u044B\u0432 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u043A \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0439 \u0441\u0442\u0430\u0442\u044C\u0435 2025 \u0433\u043E\u0434\u0430, \u0430 \u043D\u0435 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043A\u043E \u0432\u0441\u0435\u043C \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u044F\u043C KETO." }], "assumptions": ["Activity choices 1.4/1.6/1.8 are approximate product mappings, separate from Mifflin RMR.", "Maintenance \xB110% is an interface uncertainty illustration, not a confidence interval.", "Gentle loss min(300 kcal,10% maintenance), \xB15% target band, rounding to 10 kcal: product policy.", "Female 1200/male 1500 lower-intake safeguard and BMI/age eligibility are product scope, not universal safe thresholds.", "100/50 g TOTAL carbohydrate modes do not guarantee ketosis; no automatic polyol subtraction.", "30 days/5% weight change prompts review only; no automatic calorie adaptation."] };

// cloudflare-saas/vendor/nouislider-15.8.1/nouislider.mjs
var PipsMode;
(function(PipsMode2) {
  PipsMode2["Range"] = "range";
  PipsMode2["Steps"] = "steps";
  PipsMode2["Positions"] = "positions";
  PipsMode2["Count"] = "count";
  PipsMode2["Values"] = "values";
})(PipsMode || (PipsMode = {}));
var PipsType;
(function(PipsType2) {
  PipsType2[PipsType2["None"] = -1] = "None";
  PipsType2[PipsType2["NoValue"] = 0] = "NoValue";
  PipsType2[PipsType2["LargeValue"] = 1] = "LargeValue";
  PipsType2[PipsType2["SmallValue"] = 2] = "SmallValue";
})(PipsType || (PipsType = {}));
function isValidFormatter(entry) {
  return isValidPartialFormatter(entry) && typeof entry.from === "function";
}
function isValidPartialFormatter(entry) {
  return typeof entry === "object" && typeof entry.to === "function";
}
function removeElement(el2) {
  el2.parentElement.removeChild(el2);
}
function isSet(value) {
  return value !== null && value !== void 0;
}
function preventDefault(e) {
  e.preventDefault();
}
function unique(array) {
  return array.filter(function(a2) {
    return !this[a2] ? this[a2] = true : false;
  }, {});
}
function closest(value, to) {
  return Math.round(value / to) * to;
}
function offset(elem, orientation) {
  var rect = elem.getBoundingClientRect();
  var doc = elem.ownerDocument;
  var docElem = doc.documentElement;
  var pageOffset = getPageOffset(doc);
  if (/webkit.*Chrome.*Mobile/i.test(navigator.userAgent)) {
    pageOffset.x = 0;
  }
  return orientation ? rect.top + pageOffset.y - docElem.clientTop : rect.left + pageOffset.x - docElem.clientLeft;
}
function isNumeric(a2) {
  return typeof a2 === "number" && !isNaN(a2) && isFinite(a2);
}
function addClassFor(element, className, duration) {
  if (duration > 0) {
    addClass(element, className);
    setTimeout(function() {
      removeClass(element, className);
    }, duration);
  }
}
function limit(a2) {
  return Math.max(Math.min(a2, 100), 0);
}
function asArray(a2) {
  return Array.isArray(a2) ? a2 : [a2];
}
function countDecimals(numStr) {
  numStr = String(numStr);
  var pieces = numStr.split(".");
  return pieces.length > 1 ? pieces[1].length : 0;
}
function addClass(el2, className) {
  if (el2.classList && !/\s/.test(className)) {
    el2.classList.add(className);
  } else {
    el2.className += " " + className;
  }
}
function removeClass(el2, className) {
  if (el2.classList && !/\s/.test(className)) {
    el2.classList.remove(className);
  } else {
    el2.className = el2.className.replace(new RegExp("(^|\\b)" + className.split(" ").join("|") + "(\\b|$)", "gi"), " ");
  }
}
function hasClass(el2, className) {
  return el2.classList ? el2.classList.contains(className) : new RegExp("\\b" + className + "\\b").test(el2.className);
}
function getPageOffset(doc) {
  var supportPageOffset = window.pageXOffset !== void 0;
  var isCSS1Compat = (doc.compatMode || "") === "CSS1Compat";
  var x = supportPageOffset ? window.pageXOffset : isCSS1Compat ? doc.documentElement.scrollLeft : doc.body.scrollLeft;
  var y2 = supportPageOffset ? window.pageYOffset : isCSS1Compat ? doc.documentElement.scrollTop : doc.body.scrollTop;
  return {
    x,
    y: y2
  };
}
function getActions() {
  return window.navigator.pointerEnabled ? {
    start: "pointerdown",
    move: "pointermove",
    end: "pointerup"
  } : window.navigator.msPointerEnabled ? {
    start: "MSPointerDown",
    move: "MSPointerMove",
    end: "MSPointerUp"
  } : {
    start: "mousedown touchstart",
    move: "mousemove touchmove",
    end: "mouseup touchend"
  };
}
function getSupportsPassive() {
  var supportsPassive = false;
  try {
    var opts = Object.defineProperty({}, "passive", {
      get: function() {
        supportsPassive = true;
      }
    });
    window.addEventListener("test", null, opts);
  } catch (e) {
  }
  return supportsPassive;
}
function getSupportsTouchActionNone() {
  return window.CSS && CSS.supports && CSS.supports("touch-action", "none");
}
function subRangeRatio(pa, pb) {
  return 100 / (pb - pa);
}
function fromPercentage(range, value, startRange) {
  return value * 100 / (range[startRange + 1] - range[startRange]);
}
function toPercentage(range, value) {
  return fromPercentage(range, range[0] < 0 ? value + Math.abs(range[0]) : value - range[0], 0);
}
function isPercentage(range, value) {
  return value * (range[1] - range[0]) / 100 + range[0];
}
function getJ(value, arr) {
  var j2 = 1;
  while (value >= arr[j2]) {
    j2 += 1;
  }
  return j2;
}
function toStepping(xVal, xPct, value) {
  if (value >= xVal.slice(-1)[0]) {
    return 100;
  }
  var j2 = getJ(value, xVal);
  var va = xVal[j2 - 1];
  var vb = xVal[j2];
  var pa = xPct[j2 - 1];
  var pb = xPct[j2];
  return pa + toPercentage([va, vb], value) / subRangeRatio(pa, pb);
}
function fromStepping(xVal, xPct, value) {
  if (value >= 100) {
    return xVal.slice(-1)[0];
  }
  var j2 = getJ(value, xPct);
  var va = xVal[j2 - 1];
  var vb = xVal[j2];
  var pa = xPct[j2 - 1];
  var pb = xPct[j2];
  return isPercentage([va, vb], (value - pa) * subRangeRatio(pa, pb));
}
function getStep(xPct, xSteps, snap, value) {
  if (value === 100) {
    return value;
  }
  var j2 = getJ(value, xPct);
  var a2 = xPct[j2 - 1];
  var b2 = xPct[j2];
  if (snap) {
    if (value - a2 > (b2 - a2) / 2) {
      return b2;
    }
    return a2;
  }
  if (!xSteps[j2 - 1]) {
    return value;
  }
  return xPct[j2 - 1] + closest(value - xPct[j2 - 1], xSteps[j2 - 1]);
}
var Spectrum = (
  /** @class */
  (function() {
    function Spectrum2(entry, snap, singleStep) {
      this.xPct = [];
      this.xVal = [];
      this.xSteps = [];
      this.xNumSteps = [];
      this.xHighestCompleteStep = [];
      this.xSteps = [singleStep || false];
      this.xNumSteps = [false];
      this.snap = snap;
      var index;
      var ordered = [];
      Object.keys(entry).forEach(function(index2) {
        ordered.push([asArray(entry[index2]), index2]);
      });
      ordered.sort(function(a2, b2) {
        return a2[0][0] - b2[0][0];
      });
      for (index = 0; index < ordered.length; index++) {
        this.handleEntryPoint(ordered[index][1], ordered[index][0]);
      }
      this.xNumSteps = this.xSteps.slice(0);
      for (index = 0; index < this.xNumSteps.length; index++) {
        this.handleStepPoint(index, this.xNumSteps[index]);
      }
    }
    Spectrum2.prototype.getDistance = function(value) {
      var distances = [];
      for (var index = 0; index < this.xNumSteps.length - 1; index++) {
        distances[index] = fromPercentage(this.xVal, value, index);
      }
      return distances;
    };
    Spectrum2.prototype.getAbsoluteDistance = function(value, distances, direction) {
      var xPct_index = 0;
      if (value < this.xPct[this.xPct.length - 1]) {
        while (value > this.xPct[xPct_index + 1]) {
          xPct_index++;
        }
      } else if (value === this.xPct[this.xPct.length - 1]) {
        xPct_index = this.xPct.length - 2;
      }
      if (!direction && value === this.xPct[xPct_index + 1]) {
        xPct_index++;
      }
      if (distances === null) {
        distances = [];
      }
      var start_factor;
      var rest_factor = 1;
      var rest_rel_distance = distances[xPct_index];
      var range_pct = 0;
      var rel_range_distance = 0;
      var abs_distance_counter = 0;
      var range_counter = 0;
      if (direction) {
        start_factor = (value - this.xPct[xPct_index]) / (this.xPct[xPct_index + 1] - this.xPct[xPct_index]);
      } else {
        start_factor = (this.xPct[xPct_index + 1] - value) / (this.xPct[xPct_index + 1] - this.xPct[xPct_index]);
      }
      while (rest_rel_distance > 0) {
        range_pct = this.xPct[xPct_index + 1 + range_counter] - this.xPct[xPct_index + range_counter];
        if (distances[xPct_index + range_counter] * rest_factor + 100 - start_factor * 100 > 100) {
          rel_range_distance = range_pct * start_factor;
          rest_factor = (rest_rel_distance - 100 * start_factor) / distances[xPct_index + range_counter];
          start_factor = 1;
        } else {
          rel_range_distance = distances[xPct_index + range_counter] * range_pct / 100 * rest_factor;
          rest_factor = 0;
        }
        if (direction) {
          abs_distance_counter = abs_distance_counter - rel_range_distance;
          if (this.xPct.length + range_counter >= 1) {
            range_counter--;
          }
        } else {
          abs_distance_counter = abs_distance_counter + rel_range_distance;
          if (this.xPct.length - range_counter >= 1) {
            range_counter++;
          }
        }
        rest_rel_distance = distances[xPct_index + range_counter] * rest_factor;
      }
      return value + abs_distance_counter;
    };
    Spectrum2.prototype.toStepping = function(value) {
      value = toStepping(this.xVal, this.xPct, value);
      return value;
    };
    Spectrum2.prototype.fromStepping = function(value) {
      return fromStepping(this.xVal, this.xPct, value);
    };
    Spectrum2.prototype.getStep = function(value) {
      value = getStep(this.xPct, this.xSteps, this.snap, value);
      return value;
    };
    Spectrum2.prototype.getDefaultStep = function(value, isDown, size) {
      var j2 = getJ(value, this.xPct);
      if (value === 100 || isDown && value === this.xPct[j2 - 1]) {
        j2 = Math.max(j2 - 1, 1);
      }
      return (this.xVal[j2] - this.xVal[j2 - 1]) / size;
    };
    Spectrum2.prototype.getNearbySteps = function(value) {
      var j2 = getJ(value, this.xPct);
      return {
        stepBefore: {
          startValue: this.xVal[j2 - 2],
          step: this.xNumSteps[j2 - 2],
          highestStep: this.xHighestCompleteStep[j2 - 2]
        },
        thisStep: {
          startValue: this.xVal[j2 - 1],
          step: this.xNumSteps[j2 - 1],
          highestStep: this.xHighestCompleteStep[j2 - 1]
        },
        stepAfter: {
          startValue: this.xVal[j2],
          step: this.xNumSteps[j2],
          highestStep: this.xHighestCompleteStep[j2]
        }
      };
    };
    Spectrum2.prototype.countStepDecimals = function() {
      var stepDecimals = this.xNumSteps.map(countDecimals);
      return Math.max.apply(null, stepDecimals);
    };
    Spectrum2.prototype.hasNoSize = function() {
      return this.xVal[0] === this.xVal[this.xVal.length - 1];
    };
    Spectrum2.prototype.convert = function(value) {
      return this.getStep(this.toStepping(value));
    };
    Spectrum2.prototype.handleEntryPoint = function(index, value) {
      var percentage;
      if (index === "min") {
        percentage = 0;
      } else if (index === "max") {
        percentage = 100;
      } else {
        percentage = parseFloat(index);
      }
      if (!isNumeric(percentage) || !isNumeric(value[0])) {
        throw new Error("noUiSlider: 'range' value isn't numeric.");
      }
      this.xPct.push(percentage);
      this.xVal.push(value[0]);
      var value1 = Number(value[1]);
      if (!percentage) {
        if (!isNaN(value1)) {
          this.xSteps[0] = value1;
        }
      } else {
        this.xSteps.push(isNaN(value1) ? false : value1);
      }
      this.xHighestCompleteStep.push(0);
    };
    Spectrum2.prototype.handleStepPoint = function(i, n) {
      if (!n) {
        return;
      }
      if (this.xVal[i] === this.xVal[i + 1]) {
        this.xSteps[i] = this.xHighestCompleteStep[i] = this.xVal[i];
        return;
      }
      this.xSteps[i] = fromPercentage([this.xVal[i], this.xVal[i + 1]], n, 0) / subRangeRatio(this.xPct[i], this.xPct[i + 1]);
      var totalSteps = (this.xVal[i + 1] - this.xVal[i]) / this.xNumSteps[i];
      var highestStep = Math.ceil(Number(totalSteps.toFixed(3)) - 1);
      var step = this.xVal[i] + this.xNumSteps[i] * highestStep;
      this.xHighestCompleteStep[i] = step;
    };
    return Spectrum2;
  })()
);
var defaultFormatter = {
  to: function(value) {
    return value === void 0 ? "" : value.toFixed(2);
  },
  from: Number
};
var cssClasses = {
  target: "target",
  base: "base",
  origin: "origin",
  handle: "handle",
  handleLower: "handle-lower",
  handleUpper: "handle-upper",
  touchArea: "touch-area",
  horizontal: "horizontal",
  vertical: "vertical",
  background: "background",
  connect: "connect",
  connects: "connects",
  ltr: "ltr",
  rtl: "rtl",
  textDirectionLtr: "txt-dir-ltr",
  textDirectionRtl: "txt-dir-rtl",
  draggable: "draggable",
  drag: "state-drag",
  tap: "state-tap",
  active: "active",
  tooltip: "tooltip",
  pips: "pips",
  pipsHorizontal: "pips-horizontal",
  pipsVertical: "pips-vertical",
  marker: "marker",
  markerHorizontal: "marker-horizontal",
  markerVertical: "marker-vertical",
  markerNormal: "marker-normal",
  markerLarge: "marker-large",
  markerSub: "marker-sub",
  value: "value",
  valueHorizontal: "value-horizontal",
  valueVertical: "value-vertical",
  valueNormal: "value-normal",
  valueLarge: "value-large",
  valueSub: "value-sub"
};
var INTERNAL_EVENT_NS = {
  tooltips: ".__tooltips",
  aria: ".__aria"
};
function testStep(parsed, entry) {
  if (!isNumeric(entry)) {
    throw new Error("noUiSlider: 'step' is not numeric.");
  }
  parsed.singleStep = entry;
}
function testKeyboardPageMultiplier(parsed, entry) {
  if (!isNumeric(entry)) {
    throw new Error("noUiSlider: 'keyboardPageMultiplier' is not numeric.");
  }
  parsed.keyboardPageMultiplier = entry;
}
function testKeyboardMultiplier(parsed, entry) {
  if (!isNumeric(entry)) {
    throw new Error("noUiSlider: 'keyboardMultiplier' is not numeric.");
  }
  parsed.keyboardMultiplier = entry;
}
function testKeyboardDefaultStep(parsed, entry) {
  if (!isNumeric(entry)) {
    throw new Error("noUiSlider: 'keyboardDefaultStep' is not numeric.");
  }
  parsed.keyboardDefaultStep = entry;
}
function testRange(parsed, entry) {
  if (typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("noUiSlider: 'range' is not an object.");
  }
  if (entry.min === void 0 || entry.max === void 0) {
    throw new Error("noUiSlider: Missing 'min' or 'max' in 'range'.");
  }
  parsed.spectrum = new Spectrum(entry, parsed.snap || false, parsed.singleStep);
}
function testStart(parsed, entry) {
  entry = asArray(entry);
  if (!Array.isArray(entry) || !entry.length) {
    throw new Error("noUiSlider: 'start' option is incorrect.");
  }
  parsed.handles = entry.length;
  parsed.start = entry;
}
function testSnap(parsed, entry) {
  if (typeof entry !== "boolean") {
    throw new Error("noUiSlider: 'snap' option must be a boolean.");
  }
  parsed.snap = entry;
}
function testAnimate(parsed, entry) {
  if (typeof entry !== "boolean") {
    throw new Error("noUiSlider: 'animate' option must be a boolean.");
  }
  parsed.animate = entry;
}
function testAnimationDuration(parsed, entry) {
  if (typeof entry !== "number") {
    throw new Error("noUiSlider: 'animationDuration' option must be a number.");
  }
  parsed.animationDuration = entry;
}
function testConnect(parsed, entry) {
  var connect = [false];
  var i;
  if (entry === "lower") {
    entry = [true, false];
  } else if (entry === "upper") {
    entry = [false, true];
  }
  if (entry === true || entry === false) {
    for (i = 1; i < parsed.handles; i++) {
      connect.push(entry);
    }
    connect.push(false);
  } else if (!Array.isArray(entry) || !entry.length || entry.length !== parsed.handles + 1) {
    throw new Error("noUiSlider: 'connect' option doesn't match handle count.");
  } else {
    connect = entry;
  }
  parsed.connect = connect;
}
function testOrientation(parsed, entry) {
  switch (entry) {
    case "horizontal":
      parsed.ort = 0;
      break;
    case "vertical":
      parsed.ort = 1;
      break;
    default:
      throw new Error("noUiSlider: 'orientation' option is invalid.");
  }
}
function testMargin(parsed, entry) {
  if (!isNumeric(entry)) {
    throw new Error("noUiSlider: 'margin' option must be numeric.");
  }
  if (entry === 0) {
    return;
  }
  parsed.margin = parsed.spectrum.getDistance(entry);
}
function testLimit(parsed, entry) {
  if (!isNumeric(entry)) {
    throw new Error("noUiSlider: 'limit' option must be numeric.");
  }
  parsed.limit = parsed.spectrum.getDistance(entry);
  if (!parsed.limit || parsed.handles < 2) {
    throw new Error("noUiSlider: 'limit' option is only supported on linear sliders with 2 or more handles.");
  }
}
function testPadding(parsed, entry) {
  var index;
  if (!isNumeric(entry) && !Array.isArray(entry)) {
    throw new Error("noUiSlider: 'padding' option must be numeric or array of exactly 2 numbers.");
  }
  if (Array.isArray(entry) && !(entry.length === 2 || isNumeric(entry[0]) || isNumeric(entry[1]))) {
    throw new Error("noUiSlider: 'padding' option must be numeric or array of exactly 2 numbers.");
  }
  if (entry === 0) {
    return;
  }
  if (!Array.isArray(entry)) {
    entry = [entry, entry];
  }
  parsed.padding = [parsed.spectrum.getDistance(entry[0]), parsed.spectrum.getDistance(entry[1])];
  for (index = 0; index < parsed.spectrum.xNumSteps.length - 1; index++) {
    if (parsed.padding[0][index] < 0 || parsed.padding[1][index] < 0) {
      throw new Error("noUiSlider: 'padding' option must be a positive number(s).");
    }
  }
  var totalPadding = entry[0] + entry[1];
  var firstValue = parsed.spectrum.xVal[0];
  var lastValue = parsed.spectrum.xVal[parsed.spectrum.xVal.length - 1];
  if (totalPadding / (lastValue - firstValue) > 1) {
    throw new Error("noUiSlider: 'padding' option must not exceed 100% of the range.");
  }
}
function testDirection(parsed, entry) {
  switch (entry) {
    case "ltr":
      parsed.dir = 0;
      break;
    case "rtl":
      parsed.dir = 1;
      break;
    default:
      throw new Error("noUiSlider: 'direction' option was not recognized.");
  }
}
function testBehaviour(parsed, entry) {
  if (typeof entry !== "string") {
    throw new Error("noUiSlider: 'behaviour' must be a string containing options.");
  }
  var tap = entry.indexOf("tap") >= 0;
  var drag = entry.indexOf("drag") >= 0;
  var fixed = entry.indexOf("fixed") >= 0;
  var snap = entry.indexOf("snap") >= 0;
  var hover = entry.indexOf("hover") >= 0;
  var unconstrained = entry.indexOf("unconstrained") >= 0;
  var invertConnects = entry.indexOf("invert-connects") >= 0;
  var dragAll = entry.indexOf("drag-all") >= 0;
  var smoothSteps = entry.indexOf("smooth-steps") >= 0;
  if (fixed) {
    if (parsed.handles !== 2) {
      throw new Error("noUiSlider: 'fixed' behaviour must be used with 2 handles");
    }
    testMargin(parsed, parsed.start[1] - parsed.start[0]);
  }
  if (invertConnects && parsed.handles !== 2) {
    throw new Error("noUiSlider: 'invert-connects' behaviour must be used with 2 handles");
  }
  if (unconstrained && (parsed.margin || parsed.limit)) {
    throw new Error("noUiSlider: 'unconstrained' behaviour cannot be used with margin or limit");
  }
  parsed.events = {
    tap: tap || snap,
    drag,
    dragAll,
    smoothSteps,
    fixed,
    snap,
    hover,
    unconstrained,
    invertConnects
  };
}
function testTooltips(parsed, entry) {
  if (entry === false) {
    return;
  }
  if (entry === true || isValidPartialFormatter(entry)) {
    parsed.tooltips = [];
    for (var i = 0; i < parsed.handles; i++) {
      parsed.tooltips.push(entry);
    }
  } else {
    entry = asArray(entry);
    if (entry.length !== parsed.handles) {
      throw new Error("noUiSlider: must pass a formatter for all handles.");
    }
    entry.forEach(function(formatter) {
      if (typeof formatter !== "boolean" && !isValidPartialFormatter(formatter)) {
        throw new Error("noUiSlider: 'tooltips' must be passed a formatter or 'false'.");
      }
    });
    parsed.tooltips = entry;
  }
}
function testHandleAttributes(parsed, entry) {
  if (entry.length !== parsed.handles) {
    throw new Error("noUiSlider: must pass a attributes for all handles.");
  }
  parsed.handleAttributes = entry;
}
function testAriaFormat(parsed, entry) {
  if (!isValidPartialFormatter(entry)) {
    throw new Error("noUiSlider: 'ariaFormat' requires 'to' method.");
  }
  parsed.ariaFormat = entry;
}
function testFormat(parsed, entry) {
  if (!isValidFormatter(entry)) {
    throw new Error("noUiSlider: 'format' requires 'to' and 'from' methods.");
  }
  parsed.format = entry;
}
function testKeyboardSupport(parsed, entry) {
  if (typeof entry !== "boolean") {
    throw new Error("noUiSlider: 'keyboardSupport' option must be a boolean.");
  }
  parsed.keyboardSupport = entry;
}
function testDocumentElement(parsed, entry) {
  parsed.documentElement = entry;
}
function testCssPrefix(parsed, entry) {
  if (typeof entry !== "string" && entry !== false) {
    throw new Error("noUiSlider: 'cssPrefix' must be a string or `false`.");
  }
  parsed.cssPrefix = entry;
}
function testCssClasses(parsed, entry) {
  if (typeof entry !== "object") {
    throw new Error("noUiSlider: 'cssClasses' must be an object.");
  }
  if (typeof parsed.cssPrefix === "string") {
    parsed.cssClasses = {};
    Object.keys(entry).forEach(function(key) {
      parsed.cssClasses[key] = parsed.cssPrefix + entry[key];
    });
  } else {
    parsed.cssClasses = entry;
  }
}
function testOptions(options) {
  var parsed = {
    margin: null,
    limit: null,
    padding: null,
    animate: true,
    animationDuration: 300,
    ariaFormat: defaultFormatter,
    format: defaultFormatter
  };
  var tests = {
    step: { r: false, t: testStep },
    keyboardPageMultiplier: { r: false, t: testKeyboardPageMultiplier },
    keyboardMultiplier: { r: false, t: testKeyboardMultiplier },
    keyboardDefaultStep: { r: false, t: testKeyboardDefaultStep },
    start: { r: true, t: testStart },
    connect: { r: true, t: testConnect },
    direction: { r: true, t: testDirection },
    snap: { r: false, t: testSnap },
    animate: { r: false, t: testAnimate },
    animationDuration: { r: false, t: testAnimationDuration },
    range: { r: true, t: testRange },
    orientation: { r: false, t: testOrientation },
    margin: { r: false, t: testMargin },
    limit: { r: false, t: testLimit },
    padding: { r: false, t: testPadding },
    behaviour: { r: true, t: testBehaviour },
    ariaFormat: { r: false, t: testAriaFormat },
    format: { r: false, t: testFormat },
    tooltips: { r: false, t: testTooltips },
    keyboardSupport: { r: true, t: testKeyboardSupport },
    documentElement: { r: false, t: testDocumentElement },
    cssPrefix: { r: true, t: testCssPrefix },
    cssClasses: { r: true, t: testCssClasses },
    handleAttributes: { r: false, t: testHandleAttributes }
  };
  var defaults = {
    connect: false,
    direction: "ltr",
    behaviour: "tap",
    orientation: "horizontal",
    keyboardSupport: true,
    cssPrefix: "noUi-",
    cssClasses,
    keyboardPageMultiplier: 5,
    keyboardMultiplier: 1,
    keyboardDefaultStep: 10
  };
  if (options.format && !options.ariaFormat) {
    options.ariaFormat = options.format;
  }
  Object.keys(tests).forEach(function(name2) {
    if (!isSet(options[name2]) && defaults[name2] === void 0) {
      if (tests[name2].r) {
        throw new Error("noUiSlider: '" + name2 + "' is required.");
      }
      return;
    }
    tests[name2].t(parsed, !isSet(options[name2]) ? defaults[name2] : options[name2]);
  });
  parsed.pips = options.pips;
  var d2 = document.createElement("div");
  var msPrefix = d2.style.msTransform !== void 0;
  var noPrefix = d2.style.transform !== void 0;
  parsed.transformRule = noPrefix ? "transform" : msPrefix ? "msTransform" : "webkitTransform";
  var styles = [
    ["left", "top"],
    ["right", "bottom"]
  ];
  parsed.style = styles[parsed.dir][parsed.ort];
  return parsed;
}
function scope(target, options, originalOptions) {
  var actions = getActions();
  var supportsTouchActionNone = getSupportsTouchActionNone();
  var supportsPassive = supportsTouchActionNone && getSupportsPassive();
  var scope_Target = target;
  var scope_Base;
  var scope_ConnectBase;
  var scope_Handles;
  var scope_Connects;
  var scope_Pips;
  var scope_Tooltips;
  var scope_Spectrum = options.spectrum;
  var scope_Values = [];
  var scope_Locations = [];
  var scope_HandleNumbers = [];
  var scope_ActiveHandlesCount = 0;
  var scope_Events = {};
  var scope_ConnectsInverted = false;
  var scope_Document = target.ownerDocument;
  var scope_DocumentElement = options.documentElement || scope_Document.documentElement;
  var scope_Body = scope_Document.body;
  var scope_DirOffset = scope_Document.dir === "rtl" || options.ort === 1 ? 0 : 100;
  function addNodeTo(addTarget, className) {
    var div = scope_Document.createElement("div");
    if (className) {
      addClass(div, className);
    }
    addTarget.appendChild(div);
    return div;
  }
  function addOrigin(base, handleNumber) {
    var origin = addNodeTo(base, options.cssClasses.origin);
    var handle = addNodeTo(origin, options.cssClasses.handle);
    addNodeTo(handle, options.cssClasses.touchArea);
    handle.setAttribute("data-handle", String(handleNumber));
    if (options.keyboardSupport) {
      handle.setAttribute("tabindex", "0");
      handle.addEventListener("keydown", function(event) {
        return eventKeydown(event, handleNumber);
      });
    }
    if (options.handleAttributes !== void 0) {
      var attributes_1 = options.handleAttributes[handleNumber];
      Object.keys(attributes_1).forEach(function(attribute) {
        handle.setAttribute(attribute, attributes_1[attribute]);
      });
    }
    handle.setAttribute("role", "slider");
    handle.setAttribute("aria-orientation", options.ort ? "vertical" : "horizontal");
    if (handleNumber === 0) {
      addClass(handle, options.cssClasses.handleLower);
    } else if (handleNumber === options.handles - 1) {
      addClass(handle, options.cssClasses.handleUpper);
    }
    origin.handle = handle;
    return origin;
  }
  function addConnect(base, add) {
    if (!add) {
      return false;
    }
    return addNodeTo(base, options.cssClasses.connect);
  }
  function addElements(connectOptions, base) {
    scope_ConnectBase = addNodeTo(base, options.cssClasses.connects);
    scope_Handles = [];
    scope_Connects = [];
    scope_Connects.push(addConnect(scope_ConnectBase, connectOptions[0]));
    for (var i = 0; i < options.handles; i++) {
      scope_Handles.push(addOrigin(base, i));
      scope_HandleNumbers[i] = i;
      scope_Connects.push(addConnect(scope_ConnectBase, connectOptions[i + 1]));
    }
  }
  function addSlider(addTarget) {
    addClass(addTarget, options.cssClasses.target);
    if (options.dir === 0) {
      addClass(addTarget, options.cssClasses.ltr);
    } else {
      addClass(addTarget, options.cssClasses.rtl);
    }
    if (options.ort === 0) {
      addClass(addTarget, options.cssClasses.horizontal);
    } else {
      addClass(addTarget, options.cssClasses.vertical);
    }
    var textDirection = getComputedStyle(addTarget).direction;
    if (textDirection === "rtl") {
      addClass(addTarget, options.cssClasses.textDirectionRtl);
    } else {
      addClass(addTarget, options.cssClasses.textDirectionLtr);
    }
    return addNodeTo(addTarget, options.cssClasses.base);
  }
  function addTooltip(handle, handleNumber) {
    if (!options.tooltips || !options.tooltips[handleNumber]) {
      return false;
    }
    return addNodeTo(handle.firstChild, options.cssClasses.tooltip);
  }
  function isSliderDisabled() {
    return scope_Target.hasAttribute("disabled");
  }
  function isHandleDisabled(handleNumber) {
    var handleOrigin = scope_Handles[handleNumber];
    return handleOrigin.hasAttribute("disabled");
  }
  function disable(handleNumber) {
    if (handleNumber !== null && handleNumber !== void 0) {
      scope_Handles[handleNumber].setAttribute("disabled", "");
      scope_Handles[handleNumber].handle.removeAttribute("tabindex");
    } else {
      scope_Target.setAttribute("disabled", "");
      scope_Handles.forEach(function(handle) {
        handle.handle.removeAttribute("tabindex");
      });
    }
  }
  function enable(handleNumber) {
    if (handleNumber !== null && handleNumber !== void 0) {
      scope_Handles[handleNumber].removeAttribute("disabled");
      scope_Handles[handleNumber].handle.setAttribute("tabindex", "0");
    } else {
      scope_Target.removeAttribute("disabled");
      scope_Handles.forEach(function(handle) {
        handle.removeAttribute("disabled");
        handle.handle.setAttribute("tabindex", "0");
      });
    }
  }
  function removeTooltips() {
    if (scope_Tooltips) {
      removeEvent("update" + INTERNAL_EVENT_NS.tooltips);
      scope_Tooltips.forEach(function(tooltip) {
        if (tooltip) {
          removeElement(tooltip);
        }
      });
      scope_Tooltips = null;
    }
  }
  function tooltips() {
    removeTooltips();
    scope_Tooltips = scope_Handles.map(addTooltip);
    bindEvent("update" + INTERNAL_EVENT_NS.tooltips, function(values2, handleNumber, unencoded) {
      if (!scope_Tooltips || !options.tooltips) {
        return;
      }
      if (scope_Tooltips[handleNumber] === false) {
        return;
      }
      var formattedValue = values2[handleNumber];
      if (options.tooltips[handleNumber] !== true) {
        formattedValue = options.tooltips[handleNumber].to(unencoded[handleNumber]);
      }
      scope_Tooltips[handleNumber].innerHTML = formattedValue;
    });
  }
  function aria() {
    removeEvent("update" + INTERNAL_EVENT_NS.aria);
    bindEvent("update" + INTERNAL_EVENT_NS.aria, function(values2, handleNumber, unencoded, tap, positions) {
      scope_HandleNumbers.forEach(function(index) {
        var handle = scope_Handles[index];
        var min = checkHandlePosition(scope_Locations, index, 0, true, true, true);
        var max = checkHandlePosition(scope_Locations, index, 100, true, true, true);
        var now = positions[index];
        var text = String(options.ariaFormat.to(unencoded[index]));
        min = scope_Spectrum.fromStepping(min).toFixed(1);
        max = scope_Spectrum.fromStepping(max).toFixed(1);
        now = scope_Spectrum.fromStepping(now).toFixed(1);
        handle.children[0].setAttribute("aria-valuemin", min);
        handle.children[0].setAttribute("aria-valuemax", max);
        handle.children[0].setAttribute("aria-valuenow", now);
        handle.children[0].setAttribute("aria-valuetext", text);
      });
    });
  }
  function getGroup(pips2) {
    if (pips2.mode === PipsMode.Range || pips2.mode === PipsMode.Steps) {
      return scope_Spectrum.xVal;
    }
    if (pips2.mode === PipsMode.Count) {
      if (pips2.values < 2) {
        throw new Error("noUiSlider: 'values' (>= 2) required for mode 'count'.");
      }
      var interval = pips2.values - 1;
      var spread = 100 / interval;
      var values2 = [];
      while (interval--) {
        values2[interval] = interval * spread;
      }
      values2.push(100);
      return mapToRange(values2, pips2.stepped);
    }
    if (pips2.mode === PipsMode.Positions) {
      return mapToRange(pips2.values, pips2.stepped);
    }
    if (pips2.mode === PipsMode.Values) {
      if (pips2.stepped) {
        return pips2.values.map(function(value) {
          return scope_Spectrum.fromStepping(scope_Spectrum.getStep(scope_Spectrum.toStepping(value)));
        });
      }
      return pips2.values;
    }
    return [];
  }
  function mapToRange(values2, stepped) {
    return values2.map(function(value) {
      return scope_Spectrum.fromStepping(stepped ? scope_Spectrum.getStep(value) : value);
    });
  }
  function generateSpread(pips2) {
    function safeIncrement(value, increment) {
      return Number((value + increment).toFixed(7));
    }
    var group = getGroup(pips2);
    var indexes = {};
    var firstInRange = scope_Spectrum.xVal[0];
    var lastInRange = scope_Spectrum.xVal[scope_Spectrum.xVal.length - 1];
    var ignoreFirst = false;
    var ignoreLast = false;
    var prevPct = 0;
    group = unique(group.slice().sort(function(a2, b2) {
      return a2 - b2;
    }));
    if (group[0] !== firstInRange) {
      group.unshift(firstInRange);
      ignoreFirst = true;
    }
    if (group[group.length - 1] !== lastInRange) {
      group.push(lastInRange);
      ignoreLast = true;
    }
    group.forEach(function(current, index) {
      var step;
      var i;
      var q2;
      var low = current;
      var high = group[index + 1];
      var newPct;
      var pctDifference;
      var pctPos;
      var type;
      var steps;
      var realSteps;
      var stepSize;
      var isSteps = pips2.mode === PipsMode.Steps;
      if (isSteps) {
        step = scope_Spectrum.xNumSteps[index];
      }
      if (!step) {
        step = high - low;
      }
      if (high === void 0) {
        high = low;
      }
      step = Math.max(step, 1e-7);
      for (i = low; i <= high; i = safeIncrement(i, step)) {
        newPct = scope_Spectrum.toStepping(i);
        pctDifference = newPct - prevPct;
        steps = pctDifference / (pips2.density || 1);
        realSteps = Math.round(steps);
        stepSize = pctDifference / realSteps;
        for (q2 = 1; q2 <= realSteps; q2 += 1) {
          pctPos = prevPct + q2 * stepSize;
          indexes[pctPos.toFixed(5)] = [scope_Spectrum.fromStepping(pctPos), 0];
        }
        type = group.indexOf(i) > -1 ? PipsType.LargeValue : isSteps ? PipsType.SmallValue : PipsType.NoValue;
        if (!index && ignoreFirst && i !== high) {
          type = 0;
        }
        if (!(i === high && ignoreLast)) {
          indexes[newPct.toFixed(5)] = [i, type];
        }
        prevPct = newPct;
      }
    });
    return indexes;
  }
  function addMarking(spread, filterFunc, formatter) {
    var _a, _b;
    var element = scope_Document.createElement("div");
    var valueSizeClasses = (_a = {}, _a[PipsType.None] = "", _a[PipsType.NoValue] = options.cssClasses.valueNormal, _a[PipsType.LargeValue] = options.cssClasses.valueLarge, _a[PipsType.SmallValue] = options.cssClasses.valueSub, _a);
    var markerSizeClasses = (_b = {}, _b[PipsType.None] = "", _b[PipsType.NoValue] = options.cssClasses.markerNormal, _b[PipsType.LargeValue] = options.cssClasses.markerLarge, _b[PipsType.SmallValue] = options.cssClasses.markerSub, _b);
    var valueOrientationClasses = [options.cssClasses.valueHorizontal, options.cssClasses.valueVertical];
    var markerOrientationClasses = [options.cssClasses.markerHorizontal, options.cssClasses.markerVertical];
    addClass(element, options.cssClasses.pips);
    addClass(element, options.ort === 0 ? options.cssClasses.pipsHorizontal : options.cssClasses.pipsVertical);
    function getClasses(type, source) {
      var a2 = source === options.cssClasses.value;
      var orientationClasses = a2 ? valueOrientationClasses : markerOrientationClasses;
      var sizeClasses = a2 ? valueSizeClasses : markerSizeClasses;
      return source + " " + orientationClasses[options.ort] + " " + sizeClasses[type];
    }
    function addSpread(offset2, value, type) {
      type = filterFunc ? filterFunc(value, type) : type;
      if (type === PipsType.None) {
        return;
      }
      var node = addNodeTo(element, false);
      node.className = getClasses(type, options.cssClasses.marker);
      node.style[options.style] = offset2 + "%";
      if (type > PipsType.NoValue) {
        node = addNodeTo(element, false);
        node.className = getClasses(type, options.cssClasses.value);
        node.setAttribute("data-value", String(value));
        node.style[options.style] = offset2 + "%";
        node.innerHTML = String(formatter.to(value));
      }
    }
    Object.keys(spread).forEach(function(offset2) {
      addSpread(offset2, spread[offset2][0], spread[offset2][1]);
    });
    return element;
  }
  function removePips() {
    if (scope_Pips) {
      removeElement(scope_Pips);
      scope_Pips = null;
    }
  }
  function pips(pips2) {
    removePips();
    var spread = generateSpread(pips2);
    var filter = pips2.filter;
    var format2 = pips2.format || {
      to: function(value) {
        return String(Math.round(value));
      }
    };
    scope_Pips = scope_Target.appendChild(addMarking(spread, filter, format2));
    return scope_Pips;
  }
  function baseSize() {
    var rect = scope_Base.getBoundingClientRect();
    var alt = "offset" + ["Width", "Height"][options.ort];
    return options.ort === 0 ? rect.width || scope_Base[alt] : rect.height || scope_Base[alt];
  }
  function attachEvent(events, element, callback, data) {
    var method = function(event) {
      var e = fixEvent(event, data.pageOffset, data.target || element);
      if (!e) {
        return false;
      }
      if (isSliderDisabled() && !data.doNotReject) {
        return false;
      }
      if (hasClass(scope_Target, options.cssClasses.tap) && !data.doNotReject) {
        return false;
      }
      if (events === actions.start && e.buttons !== void 0 && e.buttons > 1) {
        return false;
      }
      if (data.hover && e.buttons) {
        return false;
      }
      if (!supportsPassive) {
        e.preventDefault();
      }
      e.calcPoint = e.points[options.ort];
      callback(e, data);
      return;
    };
    var methods = [];
    events.split(" ").forEach(function(eventName) {
      element.addEventListener(eventName, method, supportsPassive ? { passive: true } : false);
      methods.push([eventName, method]);
    });
    return methods;
  }
  function fixEvent(e, pageOffset, eventTarget) {
    var touch = e.type.indexOf("touch") === 0;
    var mouse = e.type.indexOf("mouse") === 0;
    var pointer = e.type.indexOf("pointer") === 0;
    var x = 0;
    var y2 = 0;
    if (e.type.indexOf("MSPointer") === 0) {
      pointer = true;
    }
    if (e.type === "mousedown" && !e.buttons && !e.touches) {
      return false;
    }
    if (touch) {
      var isTouchOnTarget = function(checkTouch) {
        var target2 = checkTouch.target;
        return target2 === eventTarget || eventTarget.contains(target2) || e.composed && e.composedPath().shift() === eventTarget;
      };
      if (e.type === "touchstart") {
        var targetTouches = Array.prototype.filter.call(e.touches, isTouchOnTarget);
        if (targetTouches.length > 1) {
          return false;
        }
        x = targetTouches[0].pageX;
        y2 = targetTouches[0].pageY;
      } else {
        var targetTouch = Array.prototype.find.call(e.changedTouches, isTouchOnTarget);
        if (!targetTouch) {
          return false;
        }
        x = targetTouch.pageX;
        y2 = targetTouch.pageY;
      }
    }
    pageOffset = pageOffset || getPageOffset(scope_Document);
    if (mouse || pointer) {
      x = e.clientX + pageOffset.x;
      y2 = e.clientY + pageOffset.y;
    }
    e.pageOffset = pageOffset;
    e.points = [x, y2];
    e.cursor = mouse || pointer;
    return e;
  }
  function calcPointToPercentage(calcPoint) {
    var location2 = calcPoint - offset(scope_Base, options.ort);
    var proposal = location2 * 100 / baseSize();
    proposal = limit(proposal);
    return options.dir ? 100 - proposal : proposal;
  }
  function getClosestHandle(clickedPosition) {
    var smallestDifference = 100;
    var handleNumber = false;
    scope_Handles.forEach(function(handle, index) {
      if (isHandleDisabled(index)) {
        return;
      }
      var handlePosition = scope_Locations[index];
      var differenceWithThisHandle = Math.abs(handlePosition - clickedPosition);
      var clickAtEdge = differenceWithThisHandle === 100 && smallestDifference === 100;
      var isCloser = differenceWithThisHandle < smallestDifference;
      var isCloserAfter = differenceWithThisHandle <= smallestDifference && clickedPosition > handlePosition;
      if (isCloser || isCloserAfter || clickAtEdge) {
        handleNumber = index;
        smallestDifference = differenceWithThisHandle;
      }
    });
    return handleNumber;
  }
  function documentLeave(event, data) {
    if (event.type === "mouseout" && event.target.nodeName === "HTML" && event.relatedTarget === null) {
      eventEnd(event, data);
    }
  }
  function eventMove(event, data) {
    if (navigator.appVersion.indexOf("MSIE 9") === -1 && event.buttons === 0 && data.buttonsProperty !== 0) {
      return eventEnd(event, data);
    }
    var movement = (options.dir ? -1 : 1) * (event.calcPoint - data.startCalcPoint);
    var proposal = movement * 100 / data.baseSize;
    moveHandles(movement > 0, proposal, data.locations, data.handleNumbers, data.connect);
  }
  function eventEnd(event, data) {
    if (data.handle) {
      removeClass(data.handle, options.cssClasses.active);
      scope_ActiveHandlesCount -= 1;
    }
    data.listeners.forEach(function(c2) {
      scope_DocumentElement.removeEventListener(c2[0], c2[1]);
    });
    if (scope_ActiveHandlesCount === 0) {
      removeClass(scope_Target, options.cssClasses.drag);
      setZindex();
      if (event.cursor) {
        scope_Body.style.cursor = "";
        scope_Body.removeEventListener("selectstart", preventDefault);
      }
    }
    if (options.events.smoothSteps) {
      data.handleNumbers.forEach(function(handleNumber) {
        setHandle(handleNumber, scope_Locations[handleNumber], true, true, false, false);
      });
      data.handleNumbers.forEach(function(handleNumber) {
        fireEvent("update", handleNumber);
      });
    }
    data.handleNumbers.forEach(function(handleNumber) {
      fireEvent("change", handleNumber);
      fireEvent("set", handleNumber);
      fireEvent("end", handleNumber);
    });
  }
  function eventStart(event, data) {
    if (data.handleNumbers.some(isHandleDisabled)) {
      return;
    }
    var handle;
    if (data.handleNumbers.length === 1) {
      var handleOrigin = scope_Handles[data.handleNumbers[0]];
      handle = handleOrigin.children[0];
      scope_ActiveHandlesCount += 1;
      addClass(handle, options.cssClasses.active);
    }
    event.stopPropagation();
    var listeners = [];
    var moveEvent = attachEvent(actions.move, scope_DocumentElement, eventMove, {
      // The event target has changed so we need to propagate the original one so that we keep
      // relying on it to extract target touches.
      target: event.target,
      handle,
      connect: data.connect,
      listeners,
      startCalcPoint: event.calcPoint,
      baseSize: baseSize(),
      pageOffset: event.pageOffset,
      handleNumbers: data.handleNumbers,
      buttonsProperty: event.buttons,
      locations: scope_Locations.slice()
    });
    var endEvent = attachEvent(actions.end, scope_DocumentElement, eventEnd, {
      target: event.target,
      handle,
      listeners,
      doNotReject: true,
      handleNumbers: data.handleNumbers
    });
    var outEvent = attachEvent("mouseout", scope_DocumentElement, documentLeave, {
      target: event.target,
      handle,
      listeners,
      doNotReject: true,
      handleNumbers: data.handleNumbers
    });
    listeners.push.apply(listeners, moveEvent.concat(endEvent, outEvent));
    if (event.cursor) {
      scope_Body.style.cursor = getComputedStyle(event.target).cursor;
      if (scope_Handles.length > 1) {
        addClass(scope_Target, options.cssClasses.drag);
      }
      scope_Body.addEventListener("selectstart", preventDefault, false);
    }
    data.handleNumbers.forEach(function(handleNumber) {
      fireEvent("start", handleNumber);
    });
  }
  function eventTap(event) {
    event.stopPropagation();
    var proposal = calcPointToPercentage(event.calcPoint);
    var handleNumber = getClosestHandle(proposal);
    if (handleNumber === false) {
      return;
    }
    if (!options.events.snap) {
      addClassFor(scope_Target, options.cssClasses.tap, options.animationDuration);
    }
    setHandle(handleNumber, proposal, true, true);
    setZindex();
    fireEvent("slide", handleNumber, true);
    fireEvent("update", handleNumber, true);
    if (!options.events.snap) {
      fireEvent("change", handleNumber, true);
      fireEvent("set", handleNumber, true);
    } else {
      eventStart(event, { handleNumbers: [handleNumber] });
    }
  }
  function eventHover(event) {
    var proposal = calcPointToPercentage(event.calcPoint);
    var to = scope_Spectrum.getStep(proposal);
    var value = scope_Spectrum.fromStepping(to);
    Object.keys(scope_Events).forEach(function(targetEvent) {
      if ("hover" === targetEvent.split(".")[0]) {
        scope_Events[targetEvent].forEach(function(callback) {
          callback.call(scope_Self, value);
        });
      }
    });
  }
  function eventKeydown(event, handleNumber) {
    if (isSliderDisabled() || isHandleDisabled(handleNumber)) {
      return false;
    }
    var horizontalKeys = ["Left", "Right"];
    var verticalKeys = ["Down", "Up"];
    var largeStepKeys = ["PageDown", "PageUp"];
    var edgeKeys = ["Home", "End"];
    if (options.dir && !options.ort) {
      horizontalKeys.reverse();
    } else if (options.ort && !options.dir) {
      verticalKeys.reverse();
      largeStepKeys.reverse();
    }
    var key = event.key.replace("Arrow", "");
    var isLargeDown = key === largeStepKeys[0];
    var isLargeUp = key === largeStepKeys[1];
    var isDown = key === verticalKeys[0] || key === horizontalKeys[0] || isLargeDown;
    var isUp = key === verticalKeys[1] || key === horizontalKeys[1] || isLargeUp;
    var isMin = key === edgeKeys[0];
    var isMax = key === edgeKeys[1];
    if (!isDown && !isUp && !isMin && !isMax) {
      return true;
    }
    event.preventDefault();
    var to;
    if (isUp || isDown) {
      var direction = isDown ? 0 : 1;
      var steps = getNextStepsForHandle(handleNumber);
      var step = steps[direction];
      if (step === null) {
        return false;
      }
      if (step === false) {
        step = scope_Spectrum.getDefaultStep(scope_Locations[handleNumber], isDown, options.keyboardDefaultStep);
      }
      if (isLargeUp || isLargeDown) {
        step *= options.keyboardPageMultiplier;
      } else {
        step *= options.keyboardMultiplier;
      }
      step = Math.max(step, 1e-7);
      step = (isDown ? -1 : 1) * step;
      to = scope_Values[handleNumber] + step;
    } else if (isMax) {
      to = options.spectrum.xVal[options.spectrum.xVal.length - 1];
    } else {
      to = options.spectrum.xVal[0];
    }
    setHandle(handleNumber, scope_Spectrum.toStepping(to), true, true);
    fireEvent("slide", handleNumber);
    fireEvent("update", handleNumber);
    fireEvent("change", handleNumber);
    fireEvent("set", handleNumber);
    return false;
  }
  function bindSliderEvents(behaviour) {
    if (!behaviour.fixed) {
      scope_Handles.forEach(function(handle, index) {
        attachEvent(actions.start, handle.children[0], eventStart, {
          handleNumbers: [index]
        });
      });
    }
    if (behaviour.tap) {
      attachEvent(actions.start, scope_Base, eventTap, {});
    }
    if (behaviour.hover) {
      attachEvent(actions.move, scope_Base, eventHover, {
        hover: true
      });
    }
    if (behaviour.drag) {
      scope_Connects.forEach(function(connect, index) {
        if (connect === false || index === 0 || index === scope_Connects.length - 1) {
          return;
        }
        var handleBefore = scope_Handles[index - 1];
        var handleAfter = scope_Handles[index];
        var eventHolders = [connect];
        var handlesToDrag = [handleBefore, handleAfter];
        var handleNumbersToDrag = [index - 1, index];
        addClass(connect, options.cssClasses.draggable);
        if (behaviour.fixed) {
          eventHolders.push(handleBefore.children[0]);
          eventHolders.push(handleAfter.children[0]);
        }
        if (behaviour.dragAll) {
          handlesToDrag = scope_Handles;
          handleNumbersToDrag = scope_HandleNumbers;
        }
        eventHolders.forEach(function(eventHolder) {
          attachEvent(actions.start, eventHolder, eventStart, {
            handles: handlesToDrag,
            handleNumbers: handleNumbersToDrag,
            connect
          });
        });
      });
    }
  }
  function bindEvent(namespacedEvent, callback) {
    scope_Events[namespacedEvent] = scope_Events[namespacedEvent] || [];
    scope_Events[namespacedEvent].push(callback);
    if (namespacedEvent.split(".")[0] === "update") {
      scope_Handles.forEach(function(a2, index) {
        fireEvent("update", index);
      });
    }
  }
  function isInternalNamespace(namespace) {
    return namespace === INTERNAL_EVENT_NS.aria || namespace === INTERNAL_EVENT_NS.tooltips;
  }
  function removeEvent(namespacedEvent) {
    var event = namespacedEvent && namespacedEvent.split(".")[0];
    var namespace = event ? namespacedEvent.substring(event.length) : namespacedEvent;
    Object.keys(scope_Events).forEach(function(bind) {
      var tEvent = bind.split(".")[0];
      var tNamespace = bind.substring(tEvent.length);
      if ((!event || event === tEvent) && (!namespace || namespace === tNamespace)) {
        if (!isInternalNamespace(tNamespace) || namespace === tNamespace) {
          delete scope_Events[bind];
        }
      }
    });
  }
  function fireEvent(eventName, handleNumber, tap) {
    Object.keys(scope_Events).forEach(function(targetEvent) {
      var eventType = targetEvent.split(".")[0];
      if (eventName === eventType) {
        scope_Events[targetEvent].forEach(function(callback) {
          callback.call(
            // Use the slider public API as the scope ('this')
            scope_Self,
            // Return values as array, so arg_1[arg_2] is always valid.
            scope_Values.map(options.format.to),
            // Handle index, 0 or 1
            handleNumber,
            // Un-formatted slider values
            scope_Values.slice(),
            // Event is fired by tap, true or false
            tap || false,
            // Left offset of the handle, in relation to the slider
            scope_Locations.slice(),
            // add the slider public API to an accessible parameter when this is unavailable
            scope_Self
          );
        });
      }
    });
  }
  function checkHandlePosition(reference, handleNumber, to, lookBackward, lookForward, getValue, smoothSteps) {
    var distance;
    if (scope_Handles.length > 1 && !options.events.unconstrained) {
      if (lookBackward && handleNumber > 0) {
        distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber - 1], options.margin, false);
        to = Math.max(to, distance);
      }
      if (lookForward && handleNumber < scope_Handles.length - 1) {
        distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber + 1], options.margin, true);
        to = Math.min(to, distance);
      }
    }
    if (scope_Handles.length > 1 && options.limit) {
      if (lookBackward && handleNumber > 0) {
        distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber - 1], options.limit, false);
        to = Math.min(to, distance);
      }
      if (lookForward && handleNumber < scope_Handles.length - 1) {
        distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber + 1], options.limit, true);
        to = Math.max(to, distance);
      }
    }
    if (options.padding) {
      if (handleNumber === 0) {
        distance = scope_Spectrum.getAbsoluteDistance(0, options.padding[0], false);
        to = Math.max(to, distance);
      }
      if (handleNumber === scope_Handles.length - 1) {
        distance = scope_Spectrum.getAbsoluteDistance(100, options.padding[1], true);
        to = Math.min(to, distance);
      }
    }
    if (!smoothSteps) {
      to = scope_Spectrum.getStep(to);
    }
    to = limit(to);
    if (to === reference[handleNumber] && !getValue) {
      return false;
    }
    return to;
  }
  function inRuleOrder(v2, a2) {
    var o2 = options.ort;
    return (o2 ? a2 : v2) + ", " + (o2 ? v2 : a2);
  }
  function moveHandles(upward, proposal, locations, handleNumbers, connect) {
    var proposals = locations.slice();
    var firstHandle = handleNumbers[0];
    var smoothSteps = options.events.smoothSteps;
    var b2 = [!upward, upward];
    var f = [upward, !upward];
    handleNumbers = handleNumbers.slice();
    if (upward) {
      handleNumbers.reverse();
    }
    if (handleNumbers.length > 1) {
      handleNumbers.forEach(function(handleNumber, o2) {
        var to = checkHandlePosition(proposals, handleNumber, proposals[handleNumber] + proposal, b2[o2], f[o2], false, smoothSteps);
        if (to === false) {
          proposal = 0;
        } else {
          proposal = to - proposals[handleNumber];
          proposals[handleNumber] = to;
        }
      });
    } else {
      b2 = f = [true];
    }
    var state2 = false;
    handleNumbers.forEach(function(handleNumber, o2) {
      state2 = setHandle(handleNumber, locations[handleNumber] + proposal, b2[o2], f[o2], false, smoothSteps) || state2;
    });
    if (state2) {
      handleNumbers.forEach(function(handleNumber) {
        fireEvent("update", handleNumber);
        fireEvent("slide", handleNumber);
      });
      if (connect != void 0) {
        fireEvent("drag", firstHandle);
      }
    }
  }
  function transformDirection(a2, b2) {
    return options.dir ? 100 - a2 - b2 : a2;
  }
  function updateHandlePosition(handleNumber, to) {
    scope_Locations[handleNumber] = to;
    scope_Values[handleNumber] = scope_Spectrum.fromStepping(to);
    var translation = transformDirection(to, 0) - scope_DirOffset;
    var translateRule = "translate(" + inRuleOrder(translation + "%", "0") + ")";
    scope_Handles[handleNumber].style[options.transformRule] = translateRule;
    if (options.events.invertConnects && scope_Locations.length > 1) {
      var handlesAreInOrder = scope_Locations.every(function(position, index, locations) {
        return index === 0 || position >= locations[index - 1];
      });
      if (scope_ConnectsInverted !== !handlesAreInOrder) {
        invertConnects();
        return;
      }
    }
    updateConnect(handleNumber);
    updateConnect(handleNumber + 1);
    if (scope_ConnectsInverted) {
      updateConnect(handleNumber - 1);
      updateConnect(handleNumber + 2);
    }
  }
  function setZindex() {
    scope_HandleNumbers.forEach(function(handleNumber) {
      var dir = scope_Locations[handleNumber] > 50 ? -1 : 1;
      var zIndex = 3 + (scope_Handles.length + dir * handleNumber);
      scope_Handles[handleNumber].style.zIndex = String(zIndex);
    });
  }
  function setHandle(handleNumber, to, lookBackward, lookForward, exactInput, smoothSteps) {
    if (!exactInput) {
      to = checkHandlePosition(scope_Locations, handleNumber, to, lookBackward, lookForward, false, smoothSteps);
    }
    if (to === false) {
      return false;
    }
    updateHandlePosition(handleNumber, to);
    return true;
  }
  function updateConnect(index) {
    if (!scope_Connects[index]) {
      return;
    }
    var locations = scope_Locations.slice();
    if (scope_ConnectsInverted) {
      locations.sort(function(a2, b2) {
        return a2 - b2;
      });
    }
    var l2 = 0;
    var h = 100;
    if (index !== 0) {
      l2 = locations[index - 1];
    }
    if (index !== scope_Connects.length - 1) {
      h = locations[index];
    }
    var connectWidth = h - l2;
    var translateRule = "translate(" + inRuleOrder(transformDirection(l2, connectWidth) + "%", "0") + ")";
    var scaleRule = "scale(" + inRuleOrder(connectWidth / 100, "1") + ")";
    scope_Connects[index].style[options.transformRule] = translateRule + " " + scaleRule;
  }
  function resolveToValue(to, handleNumber) {
    if (to === null || to === false || to === void 0) {
      return scope_Locations[handleNumber];
    }
    if (typeof to === "number") {
      to = String(to);
    }
    to = options.format.from(to);
    if (to !== false) {
      to = scope_Spectrum.toStepping(to);
    }
    if (to === false || isNaN(to)) {
      return scope_Locations[handleNumber];
    }
    return to;
  }
  function valueSet(input, fireSetEvent, exactInput) {
    var values2 = asArray(input);
    var isInit = scope_Locations[0] === void 0;
    fireSetEvent = fireSetEvent === void 0 ? true : fireSetEvent;
    if (options.animate && !isInit) {
      addClassFor(scope_Target, options.cssClasses.tap, options.animationDuration);
    }
    scope_HandleNumbers.forEach(function(handleNumber) {
      setHandle(handleNumber, resolveToValue(values2[handleNumber], handleNumber), true, false, exactInput);
    });
    var i = scope_HandleNumbers.length === 1 ? 0 : 1;
    if (isInit && scope_Spectrum.hasNoSize()) {
      exactInput = true;
      scope_Locations[0] = 0;
      if (scope_HandleNumbers.length > 1) {
        var space_1 = 100 / (scope_HandleNumbers.length - 1);
        scope_HandleNumbers.forEach(function(handleNumber) {
          scope_Locations[handleNumber] = handleNumber * space_1;
        });
      }
    }
    for (; i < scope_HandleNumbers.length; ++i) {
      scope_HandleNumbers.forEach(function(handleNumber) {
        setHandle(handleNumber, scope_Locations[handleNumber], true, true, exactInput);
      });
    }
    setZindex();
    scope_HandleNumbers.forEach(function(handleNumber) {
      fireEvent("update", handleNumber);
      if (values2[handleNumber] !== null && fireSetEvent) {
        fireEvent("set", handleNumber);
      }
    });
  }
  function valueReset(fireSetEvent) {
    valueSet(options.start, fireSetEvent);
  }
  function valueSetHandle(handleNumber, value, fireSetEvent, exactInput) {
    handleNumber = Number(handleNumber);
    if (!(handleNumber >= 0 && handleNumber < scope_HandleNumbers.length)) {
      throw new Error("noUiSlider: invalid handle number, got: " + handleNumber);
    }
    setHandle(handleNumber, resolveToValue(value, handleNumber), true, true, exactInput);
    fireEvent("update", handleNumber);
    if (fireSetEvent) {
      fireEvent("set", handleNumber);
    }
  }
  function valueGet(unencoded) {
    if (unencoded === void 0) {
      unencoded = false;
    }
    if (unencoded) {
      return scope_Values.length === 1 ? scope_Values[0] : scope_Values.slice(0);
    }
    var values2 = scope_Values.map(options.format.to);
    if (values2.length === 1) {
      return values2[0];
    }
    return values2;
  }
  function destroy() {
    removeEvent(INTERNAL_EVENT_NS.aria);
    removeEvent(INTERNAL_EVENT_NS.tooltips);
    Object.keys(options.cssClasses).forEach(function(key) {
      removeClass(scope_Target, options.cssClasses[key]);
    });
    while (scope_Target.firstChild) {
      scope_Target.removeChild(scope_Target.firstChild);
    }
    delete scope_Target.noUiSlider;
  }
  function getNextStepsForHandle(handleNumber) {
    var location2 = scope_Locations[handleNumber];
    var nearbySteps = scope_Spectrum.getNearbySteps(location2);
    var value = scope_Values[handleNumber];
    var increment = nearbySteps.thisStep.step;
    var decrement = null;
    if (options.snap) {
      return [
        value - nearbySteps.stepBefore.startValue || null,
        nearbySteps.stepAfter.startValue - value || null
      ];
    }
    if (increment !== false) {
      if (value + increment > nearbySteps.stepAfter.startValue) {
        increment = nearbySteps.stepAfter.startValue - value;
      }
    }
    if (value > nearbySteps.thisStep.startValue) {
      decrement = nearbySteps.thisStep.step;
    } else if (nearbySteps.stepBefore.step === false) {
      decrement = false;
    } else {
      decrement = value - nearbySteps.stepBefore.highestStep;
    }
    if (location2 === 100) {
      increment = null;
    } else if (location2 === 0) {
      decrement = null;
    }
    var stepDecimals = scope_Spectrum.countStepDecimals();
    if (increment !== null && increment !== false) {
      increment = Number(increment.toFixed(stepDecimals));
    }
    if (decrement !== null && decrement !== false) {
      decrement = Number(decrement.toFixed(stepDecimals));
    }
    return [decrement, increment];
  }
  function getNextSteps() {
    return scope_HandleNumbers.map(getNextStepsForHandle);
  }
  function updateOptions(optionsToUpdate, fireSetEvent) {
    var v2 = valueGet();
    var updateAble = [
      "margin",
      "limit",
      "padding",
      "range",
      "animate",
      "snap",
      "step",
      "format",
      "pips",
      "tooltips",
      "connect"
    ];
    updateAble.forEach(function(name2) {
      if (optionsToUpdate[name2] !== void 0) {
        originalOptions[name2] = optionsToUpdate[name2];
      }
    });
    var newOptions = testOptions(originalOptions);
    updateAble.forEach(function(name2) {
      if (optionsToUpdate[name2] !== void 0) {
        options[name2] = newOptions[name2];
      }
    });
    scope_Spectrum = newOptions.spectrum;
    options.margin = newOptions.margin;
    options.limit = newOptions.limit;
    options.padding = newOptions.padding;
    if (options.pips) {
      pips(options.pips);
    } else {
      removePips();
    }
    if (options.tooltips) {
      tooltips();
    } else {
      removeTooltips();
    }
    scope_Locations = [];
    valueSet(isSet(optionsToUpdate.start) ? optionsToUpdate.start : v2, fireSetEvent);
    if (optionsToUpdate.connect) {
      updateConnectOption();
    }
  }
  function updateConnectOption() {
    while (scope_ConnectBase.firstChild) {
      scope_ConnectBase.removeChild(scope_ConnectBase.firstChild);
    }
    for (var i = 0; i <= options.handles; i++) {
      scope_Connects[i] = addConnect(scope_ConnectBase, options.connect[i]);
      updateConnect(i);
    }
    bindSliderEvents({ drag: options.events.drag, fixed: true });
  }
  function invertConnects() {
    scope_ConnectsInverted = !scope_ConnectsInverted;
    testConnect(
      options,
      // inverse the connect boolean array
      options.connect.map(function(b2) {
        return !b2;
      })
    );
    updateConnectOption();
  }
  function setupSlider() {
    scope_Base = addSlider(scope_Target);
    addElements(options.connect, scope_Base);
    bindSliderEvents(options.events);
    valueSet(options.start);
    if (options.pips) {
      pips(options.pips);
    }
    if (options.tooltips) {
      tooltips();
    }
    aria();
  }
  setupSlider();
  var scope_Self = {
    destroy,
    steps: getNextSteps,
    on: bindEvent,
    off: removeEvent,
    get: valueGet,
    set: valueSet,
    setHandle: valueSetHandle,
    reset: valueReset,
    disable,
    enable,
    // Exposed for unit testing, don't use this in your application.
    __moveHandles: function(upward, proposal, handleNumbers) {
      moveHandles(upward, proposal, scope_Locations, handleNumbers);
    },
    options: originalOptions,
    updateOptions,
    target: scope_Target,
    removePips,
    removeTooltips,
    getPositions: function() {
      return scope_Locations.slice();
    },
    getTooltips: function() {
      return scope_Tooltips;
    },
    getOrigins: function() {
      return scope_Handles;
    },
    pips
    // Issue #594
  };
  return scope_Self;
}
function initialize(target, originalOptions) {
  if (!target || !target.nodeName) {
    throw new Error("noUiSlider: create requires a single element, got: " + target);
  }
  if (target.noUiSlider) {
    throw new Error("noUiSlider: Slider was already initialized.");
  }
  var options = testOptions(originalOptions);
  var api = scope(target, options, originalOptions);
  target.noUiSlider = api;
  return api;
}

// cloudflare-saas/public/setup-controls.js
function numeric(value, { min = -Infinity, max = Infinity } = {}) {
  if (typeof value === "boolean" || value === null || String(value).trim() === "") throw Error("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043B\u043E.");
  const text = String(value).trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) throw Error("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043B\u043E, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 72,5.");
  const n = Number(text);
  if (!Number.isFinite(n) || n < min || n > max) throw Error(`\u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E \u043E\u0442 ${min} \u0434\u043E ${max}.`);
  return n;
}
function stepValue(value, delta, { min, max, step }) {
  const base = String(value).trim() === "" ? min : numeric(value, { min, max });
  return Math.max(min, Math.min(max, Math.round((base + delta * step) * 1e3) / 1e3));
}
function linkSlider(element, inputs, { min, max, step, labels: labels2, localWindow = false, createSlider = initialize }) {
  const values2 = inputs.map((i) => i.value.trim() === "" ? min : numeric(i.value, { min, max }));
  let alive = true;
  createSlider(element, { start: values2.length === 1 ? values2[0] : values2, range: { min, max }, step, connect: inputs.length === 2 ? true : [true, false], keyboardSupport: true, handleAttributes: labels2.map((label) => ({ "aria-label": label })), ariaFormat: { to: (v2) => String(Math.round(v2 * 10) / 10), from: Number } });
  const api = element.noUiSlider;
  const reframe = (vals) => {
    if (!localWindow || vals.some((v2) => !Number.isFinite(v2))) return;
    const lo = Math.max(min, Math.floor((Math.min(...vals) - 200) / 100) * 100), hi = Math.min(max, Math.ceil((Math.max(...vals) + 200) / 100) * 100);
    if (hi > lo) api.updateOptions({ range: { min: lo, max: hi } }, false);
  };
  reframe(values2);
  const update = () => {
    if (!alive) return;
    const raw = api.get(true), array = Array.isArray(raw) ? raw : [raw];
    inputs.forEach((input, i) => {
      input.value = String(Math.round(array[i] * 10) / 10);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  api.on("slide", update);
  api.on("change", update);
  const listeners = inputs.map((input, i) => {
    const fn = () => {
      try {
        const v2 = numeric(input.value, { min, max });
        const current = api.get(true);
        if (Array.isArray(current)) {
          current[i] = v2;
          reframe(current);
          api.set(current);
        } else {
          reframe([v2]);
          api.set(v2);
        }
        ;
        input.setCustomValidity("");
      } catch (e) {
        input.setCustomValidity(e.message);
      }
    };
    input.addEventListener("change", fn);
    return fn;
  });
  return { destroy() {
    alive = false;
    inputs.forEach((input, i) => input.removeEventListener("change", listeners[i]));
    api.destroy();
  } };
}
function setupHints({ $: $3, el: el2 }) {
  document.querySelectorAll("#settings-form .field-help,#profile-form .field-help,#targets-form .field-help").forEach((hint) => hint.classList.add("ux-hint"));
  for (const [id, text] of [
    ["meals_per_day", "\u0427\u0438\u0441\u043B\u043E \u043F\u0440\u0438\u0451\u043C\u043E\u0432 \u043F\u0438\u0449\u0438 \u0432\u043B\u0438\u044F\u0435\u0442 \u043D\u0430 \u043D\u043E\u0432\u044B\u0435 \u0440\u0430\u0441\u0447\u0451\u0442\u043D\u044B\u0435 \u043C\u0435\u043D\u044E; \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0435 \u043C\u0435\u043D\u044E \u043D\u0443\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0442\u044C \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E."],
    ["max_active_minutes", "\u0412\u0440\u0435\u043C\u044F \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0439 \u0433\u043E\u0442\u043E\u0432\u043A\u0438 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u0432\u0430\u0435\u0442 \u0432\u044B\u0431\u043E\u0440 \u0431\u043B\u044E\u0434 \u0432 \u043D\u043E\u0432\u044B\u0445 \u0440\u0430\u0441\u0447\u0451\u0442\u043D\u044B\u0445 \u043C\u0435\u043D\u044E; \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F."],
    ["medications", "\u041F\u0435\u0440\u0435\u0447\u0438\u0441\u043B\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E. \u041F\u0443\u0441\u0442\u043E\u0435 \u043F\u043E\u043B\u0435 \u043D\u0435 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u043E\u0435 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u043F\u0440\u0438\u0451\u043C\u0430 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432; \u044D\u0442\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u043C \u043E\u0442\u0432\u0435\u0442\u043E\u043C."]
  ]) {
    const input = $3(id), label = input.closest("label");
    let hint = label.querySelector(".ux-hint");
    if (!hint) {
      hint = el2("p", "ux-hint");
      hint.id = "setup-help-" + id;
      label.insertAdjacentElement("afterend", hint);
      input.setAttribute("aria-describedby", [input.getAttribute("aria-describedby"), hint.id].filter(Boolean).join(" "));
    }
    hint.textContent = text;
  }
  $3("medications").placeholder = "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u044F \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E, \u0435\u0441\u043B\u0438 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442\u0435";
  $3("settings-form").append(el2("p", "ux-hint", "\xAB\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F\xBB \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0445 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A; \u043E\u043D\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F."));
  const stopNote = $3("revoke").closest(".panel").querySelector("p.muted");
  stopNote.className = "ux-hint";
  stopNote.textContent = "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u043F\u0440\u0435\u043A\u0440\u0430\u0449\u0430\u0435\u0442 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0443 \u0438 \u043D\u043E\u0432\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438, \u043D\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u044F\u0435\u0442 \u0440\u0430\u043D\u0435\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0439 \u0434\u043D\u0435\u0432\u043D\u0438\u043A; \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u0438 \u0434\u043D\u0435\u0432\u043D\u0438\u043A\u0430 \u2014 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435.";
  const activityNote = $3("activity-choices").parentElement.querySelector("p");
  activityNote.className = "ux-hint";
  activityNote.textContent = "\u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C \u0437\u0430\u0434\u0430\u0451\u0442 \u043F\u0440\u0438\u0431\u043B\u0438\u0437\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u043C\u043D\u043E\u0436\u0438\u0442\u0435\u043B\u044C \u0440\u0430\u0441\u0447\u0451\u0442\u043D\u043E\u0439 \u0444\u043E\u0440\u043C\u0443\u043B\u044B, \u0430 \u043D\u0435 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u043D\u044B\u0439 \u0440\u0430\u0441\u0445\u043E\u0434 \u044D\u043D\u0435\u0440\u0433\u0438\u0438. \u0420\u0443\u0447\u043D\u043E\u0439 \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043B\u0430\u043D \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \xAB\u0412\u0430\u0448 \u043F\u043B\u0430\u043D \u043F\u0438\u0442\u0430\u043D\u0438\u044F\xBB; \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F.";
  $3("allergy-options").insertAdjacentElement("afterend", el2("p", "ux-hint", "\u041D\u0435\u043B\u044E\u0431\u0438\u043C\u044B\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u2014 \u043F\u043E\u0436\u0435\u043B\u0430\u043D\u0438\u044F \u043A \u043C\u0435\u043D\u044E; \u043E\u043D\u0438 \u043D\u0435 \u0437\u0430\u043C\u0435\u043D\u044F\u044E\u0442 \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u0435 \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u0438, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043D\u0443\u0436\u043D\u043E \u0443\u043A\u0430\u0437\u0430\u0442\u044C \u0437\u0434\u0435\u0441\u044C."));
}

// cloudflare-saas/public/routes.js
var ROUTES = ["chat", "today", "diary", "more", "recipes", "products", "settings", "sources", "reminders", "admin", "developer", "targets", "knowledge", "memory", "setup-consent", "setup-about", "setup-restrictions", "setup-targets"];
var MAIN_ROUTES = ["chat", "diary", "recipes", "products"];
function mainTab(route) {
  return route === "today" ? "recipes" : MAIN_ROUTES.includes(route) ? route : "more";
}
function routeValue(hash, fallback = "chat") {
  const value = String(hash || "").replace(/^#/, "");
  return ROUTES.includes(value) ? value : fallback;
}
function initialRoute(state2, hash) {
  const g = state2.guidance;
  if (g && !g.ready) {
    if (["recipes", "products"].includes(routeValue(hash, ""))) return routeValue(hash, "");
    return "setup-" + g.stage;
  }
  return routeValue(hash, state2.ui?.home || "chat");
}
function createRouter({ location: location2, history: history2, listen, render, closeDialog = () => {
}, fallback = () => "chat" }) {
  let current = "", depth = 0, origin = "more", closingDialog = false, pendingDialog = null, pendingRoute = null;
  function display(route, reason) {
    depth = history2.state?.ketoDepth || 0;
    origin = history2.state?.ketoOrigin || origin;
    closeDialog(history2.state?.ketoDialog || null, { restore: route === current });
    if (route === current && reason === "history") return;
    current = route;
    render(route, { reason, origin, depth });
  }
  function go(value, { replace = false, reason = "user" } = {}) {
    const route = routeValue("#" + value, fallback());
    if (closingDialog) {
      pendingRoute = { route, replace, reason };
      pendingDialog = null;
      return;
    }
    if (route === current) return;
    const inDialog = Boolean(history2.state?.ketoDialog);
    if (route === "today" && current !== "recipes" && !replace && !inDialog) {
      depth = 0;
      history2.replaceState({ ketoRoute: "recipes", ketoDepth: 0, ketoOrigin: "more" }, "", "#recipes");
    }
    if (!MAIN_ROUTES.includes(route)) origin = route === "today" ? "recipes" : current || "more";
    const swap = replace || MAIN_ROUTES.includes(route) || inDialog;
    const nextDepth = MAIN_ROUTES.includes(route) ? 0 : swap ? Math.max(0, depth - (inDialog ? 1 : 0)) : depth + 1;
    history2[swap ? "replaceState" : "pushState"]({ ketoRoute: route, ketoDepth: nextDepth, ketoOrigin: origin }, "", "#" + route);
    display(route, reason);
  }
  function back() {
    if (history2.state?.ketoDialog) {
      if (!closingDialog) {
        closingDialog = true;
        history2.back();
      }
      return;
    }
    if (current === "today" && depth === 0) {
      go("recipes", { replace: true });
      return;
    }
    if (depth > 0) {
      history2.back();
      return;
    }
    go(current === "more" ? "chat" : current === "setup-consent" ? "recipes" : current.startsWith("setup-") ? ["setup-consent", "setup-about", "setup-restrictions", "setup-targets"][Math.max(0, ["setup-consent", "setup-about", "setup-restrictions", "setup-targets"].indexOf(current) - 1)] : "more", { replace: true });
  }
  listen("popstate", () => {
    closingDialog = false;
    display(routeValue(location2.hash, fallback()), "history");
    if (pendingRoute) {
      const next = pendingRoute;
      pendingRoute = null;
      go(next.route, next);
    } else if (pendingDialog) {
      const kind = pendingDialog;
      pendingDialog = null;
      openDialog(kind);
      closeDialog(kind, { restore: false });
    }
  });
  listen("hashchange", () => {
    const valid = routeValue(location2.hash, fallback());
    if (location2.hash !== "#" + valid) history2.replaceState({ ketoRoute: valid, ketoDepth: depth }, "", "#" + valid);
    display(valid, "history");
  });
  function openDialog(kind = "recipe") {
    if (closingDialog) {
      pendingDialog = kind;
      return false;
    }
    const replacing = Boolean(history2.state?.ketoDialog);
    history2[replacing ? "replaceState" : "pushState"]({ ketoRoute: current, ketoDepth: replacing ? depth : depth + 1, ketoOrigin: origin, ketoDialog: kind }, "", "#" + current);
    if (!replacing) depth++;
    return true;
  }
  return {
    go,
    back,
    openDialog,
    dismissDialog() {
      if (history2.state?.ketoDialog) {
        depth = Math.max(0, depth - 1);
        history2.replaceState({ ketoRoute: current, ketoDepth: depth, ketoOrigin: origin }, "", "#" + current);
      }
      closeDialog(null, { restore: true });
    },
    closeDialog() {
      if (closingDialog) return;
      if (history2.state?.ketoDialog) {
        closingDialog = true;
        closeDialog(null, { restore: true });
        history2.back();
      } else closeDialog(null, { restore: true });
    },
    get current() {
      return current;
    },
    reset() {
      current = "";
      depth = 0;
      origin = "more";
      closingDialog = false;
      pendingDialog = null;
      pendingRoute = null;
      history2.replaceState(null, "", location2.pathname + location2.search);
    },
    parent() {
      return current === "today" ? "recipes" : current.startsWith("setup-") ? "setup" : origin || "more";
    }
  };
}

// cloudflare-saas/public/setup-ui.js
var STAGES = ["consent", "about", "restrictions", "targets"];
var TITLES = { consent: "\u0421\u043E\u0433\u043B\u0430\u0441\u0438\u0435", about: "\u041E \u0432\u0430\u0441", restrictions: "\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F", targets: "\u0412\u0430\u0448 \u043F\u043B\u0430\u043D \u043F\u0438\u0442\u0430\u043D\u0438\u044F" };
var LABELS = { age_years: "\u0432\u043E\u0437\u0440\u0430\u0441\u0442", height_cm: "\u0440\u043E\u0441\u0442", weight_kg: "\u0432\u0435\u0441", equation_category: "\u043A\u043E\u044D\u0444\u0444\u0438\u0446\u0438\u0435\u043D\u0442 \u0443\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F", activity_factor: "\u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C", activity_note: "\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438", measured_at: "\u0434\u0430\u0442\u0430 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F", timezone: "\u0447\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441", goal: "\u0446\u0435\u043B\u044C", mode: "\u0440\u0435\u0436\u0438\u043C \u043F\u0438\u0442\u0430\u043D\u0438\u044F", energy_min_kcal: "\u042D\u043D\u0435\u0440\u0433\u0438\u044F \u043E\u0442, \u043A\u043A\u0430\u043B", energy_max_kcal: "\u042D\u043D\u0435\u0440\u0433\u0438\u044F \u0434\u043E, \u043A\u043A\u0430\u043B", protein_min_g: "\u0411\u0435\u043B\u043E\u043A \u043E\u0442, \u0433", protein_max_g: "\u0411\u0435\u043B\u043E\u043A \u0434\u043E, \u0433", carb_basis: "\u0421\u043F\u043E\u0441\u043E\u0431 \u043F\u043E\u0434\u0441\u0447\u0451\u0442\u0430 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432", carb_max_g: "\u0423\u0433\u043B\u0435\u0432\u043E\u0434\u044B \u0434\u043E, \u0433", fiber_min_g: "\u041A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430 \u043E\u0442, \u0433", saturated_fat_max_pct: "\u041D\u0430\u0441\u044B\u0449\u0435\u043D\u043D\u044B\u0435 \u0436\u0438\u0440\u044B \u0434\u043E, %" };
var REASONS = { consent_required: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043D\u0443\u0436\u043D\u044B \u0432\u0430\u0448\u0438 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F.", equation_coefficient_required: "\u041A\u043E\u044D\u0444\u0444\u0438\u0446\u0438\u0435\u043D\u0442 \u0443\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D: \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u044B\u0435 \u0440\u0435\u0446\u0435\u043F\u0442\u044B \u0438\u043B\u0438 \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0443\u0447\u043D\u043E\u0439 \u043F\u043B\u0430\u043D.", age_outside_19_78: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043E\u0446\u0435\u043D\u043A\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F 19\u201378 \u043B\u0435\u0442 \u2014 \u043E\u0431\u043B\u0430\u0441\u0442\u044C \u0438\u0441\u0445\u043E\u0434\u043D\u043E\u0439 \u0444\u043E\u0440\u043C\u0443\u043B\u044B, \u043D\u0435 \u0434\u0438\u0430\u0433\u043D\u043E\u0437.", bmi_outside_pilot_scope: "\u0418\u041C\u0422 \u0432\u043D\u0435 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430 18,5\u2013<35 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u043F\u0438\u043B\u043E\u0442\u0430; \u044D\u0442\u043E \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430, \u043D\u0443\u0436\u0435\u043D \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0430\u0437\u0431\u043E\u0440.", loss_requires_bmi_20: "\u041C\u044F\u0433\u043A\u043E\u0435 \u0441\u043D\u0438\u0436\u0435\u043D\u0438\u0435 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u0438 \u0418\u041C\u0422 \u043E\u0442 20. \u041C\u043E\u0436\u043D\u043E \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0438\u043B\u0438 \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043B\u0430\u043D.", gain_needs_individual_plan: "\u0414\u043B\u044F \u043D\u0430\u0431\u043E\u0440\u0430 \u043C\u0430\u0441\u0441\u044B \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430 \u0432 \u043F\u0438\u043B\u043E\u0442\u0435 \u043D\u0435\u0442. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043B\u0430\u043D.", lower_bound_below_product_floor_choose_maintain_or_review: "\u041D\u0438\u0436\u043D\u044F\u044F \u0433\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0438\u0436\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432\u043E\u0433\u043E \u043F\u0440\u0435\u0434\u0435\u043B\u0430. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0438\u043B\u0438 \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0430\u0437\u0431\u043E\u0440 \u2014 \u0447\u0438\u0441\u043B\u043E \u043D\u0435 \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438.", outside_existing_target_bounds: "\u041E\u0446\u0435\u043D\u043A\u0430 \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0437\u0430 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0435 \u0433\u0440\u0430\u043D\u0438\u0446\u044B \u0434\u0432\u0438\u0436\u043A\u0430; \u043D\u0443\u0436\u0435\u043D \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043B\u0430\u043D." };
var screenNames = { adult: "\u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0441\u043E\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u043E\u043B\u0435\u0442\u0438\u044F", adult_only: "\u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0439 \u0432\u043E\u0437\u0440\u0430\u0441\u0442 18+", pregnant: "\u0431\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0441\u0442\u044C", breastfeeding: "\u0433\u0440\u0443\u0434\u043D\u043E\u0435 \u0432\u0441\u043A\u0430\u0440\u043C\u043B\u0438\u0432\u0430\u043D\u0438\u0435", sglt2: "SGLT2-\u043F\u0440\u0435\u043F\u0430\u0440\u0430\u0442", type1_diabetes: "\u0434\u0438\u0430\u0431\u0435\u0442 1 \u0442\u0438\u043F\u0430", kidney_disease: "\u0437\u0430\u0431\u043E\u043B\u0435\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u0447\u0435\u043A", hypoglycemia_medication: "\u043F\u0440\u0435\u043F\u0430\u0440\u0430\u0442\u044B \u0441 \u0440\u0438\u0441\u043A\u043E\u043C \u0433\u0438\u043F\u043E\u0433\u043B\u0438\u043A\u0435\u043C\u0438\u0438", unknown_medication: "\u043D\u0435\u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0435 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u043E", medications_reviewed: "\u0441\u043F\u0438\u0441\u043E\u043A \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432", allergies_reviewed: "\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u0439", eating_disorder_risk: "\u0440\u0438\u0441\u043A \u0420\u041F\u041F", liver_pancreas_gallbladder_disease: "\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u043F\u0435\u0447\u0435\u043D\u0438/\u043F\u043E\u0434\u0436\u0435\u043B\u0443\u0434\u043E\u0447\u043D\u043E\u0439/\u0436\u0435\u043B\u0447\u043D\u043E\u0433\u043E", metabolic_contraindication: "\u043C\u0435\u0442\u0430\u0431\u043E\u043B\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0438\u044F", other_clinical_restrictions: "\u0434\u0440\u0443\u0433\u0438\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F" };
function setupGuidance({ $: $3, el: el2, getState, call: call2, accept: accept2, notify: notify2, run: run2, setView: setView2, epoch }) {
  setupHints({ $: $3, el: el2 });
  $3("suggestions").append($3("onboard-open"));
  let weightSlider = null, energySlider = null, seenRevision = null, seenOwner = null, lastPreview = null, baselineDirty = false, targetsDirty = false;
  const stageButtons = STAGES.map((stage2, i) => {
    const b2 = el2("button", "", `${i + 1}. ${TITLES[stage2]}`);
    b2.type = "button";
    b2.onclick = () => setView2("setup-" + stage2);
    $3("setup-progress").append(b2);
    return b2;
  });
  $3("setup-consent-slot").append($3("consent-panel"));
  const old = document.querySelector('[data-page="onboarding"]');
  $3("setup-restrictions-slot").append(old);
  old.removeAttribute("data-page");
  old.hidden = false;
  const applyNote = $3("apply-targets").nextElementSibling;
  if (applyNote?.tagName === "P") applyNote.hidden = true;
  const setApplyVisible = (show) => {
    $3("apply-targets").hidden = !show;
    if (applyNote?.tagName === "P") applyNote.hidden = !show;
  };
  const energyReview = el2("section", "panel");
  energyReview.id = "energy-review";
  energyReview.hidden = true;
  energyReview.append(el2("h2", "", "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u044D\u043D\u0435\u0440\u0433\u0438\u0438"), el2("p", "ux-hint", "\u041F\u0435\u0440\u0435\u0434\u0432\u0438\u043D\u044C\u0442\u0435 \u043F\u043E\u043B\u0437\u0443\u043D\u043E\u043A \u0438\u043B\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043B\u0430 \u0432\u0440\u0443\u0447\u043D\u0443\u044E, \u0437\u0430\u0442\u0435\u043C \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043C\u043E\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F\xBB."));
  const row = el2("div", "setting-grid");
  for (const name2 of ["energy_min_kcal", "energy_max_kcal"]) {
    const input2 = document.querySelector(`#targets-form [name=${name2}]`);
    input2.setAttribute("form", "targets-form");
    row.append(input2.closest("label"));
  }
  energyReview.append(row);
  const floorNote = el2("p", "ux-hint");
  floorNote.id = "energy-floor-note";
  energyReview.append(floorNote);
  const editNote = el2("p", "ux-hint");
  editNote.id = "energy-edit-note";
  energyReview.append(editNote);
  const slide = el2("div");
  slide.id = "energy-slider";
  energyReview.append(slide);
  const save = el2("button", "secondary", "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043C\u043E\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F");
  save.type = "submit";
  save.setAttribute("form", "targets-form");
  energyReview.append(save);
  $3("target-preview").insertAdjacentElement("afterend", energyReview);
  $3("baseline-form").addEventListener("input", () => {
    baselineDirty = true;
  });
  $3("baseline-form").addEventListener("change", () => {
    baselineDirty = true;
  });
  document.querySelectorAll("#targets-form input,#targets-form select,#targets-form textarea,#energy-review input").forEach((field) => field.addEventListener("input", () => {
    targetsDirty = true;
    if (lastPreview) {
      lastPreview = null;
      setApplyVisible(false);
    }
    $3("energy-edit-note").textContent = "\u0415\u0441\u0442\u044C \u0432\u0430\u0448\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \xAB\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043C\u043E\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F\xBB \u2014 \u043E\u043D\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u0441 \u043F\u043E\u043C\u0435\u0442\u043A\u043E\u0439 \xAB\u0438\u0437\u043C\u0435\u043D\u0435\u043D\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u043C\xBB.";
  }));
  const today = el2("button", "secondary", "\u0418\u0437\u043C\u0435\u0440\u0435\u043D\u043E \u0441\u0435\u0433\u043E\u0434\u043D\u044F");
  today.type = "button";
  today.onclick = () => {
    const d2 = /* @__PURE__ */ new Date();
    $3("baseline-measured").value = [d2.getFullYear(), String(d2.getMonth() + 1).padStart(2, "0"), String(d2.getDate()).padStart(2, "0")].join("-");
  };
  $3("baseline-measured").closest("label").append(today);
  const timezoneButton = el2("button", "secondary", "\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430");
  timezoneButton.type = "button";
  timezoneButton.onclick = () => {
    $3("baseline-zone").value = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  };
  $3("baseline-zone").closest("label").append(timezoneButton);
  function input(name2) {
    return document.querySelector(`[name="${name2}"][form="targets-form"]`) || document.querySelector(`#targets-form [name="${name2}"]`);
  }
  document.querySelectorAll("#baseline-form [data-step],#targets-form input[type=number],#energy-review input[type=number]").forEach((field) => {
    const label = field.closest("label");
    field.inputMode = "decimal";
    field.dataset.min = field.dataset.min || field.min;
    field.dataset.max = field.dataset.max || field.max;
    field.dataset.step = field.dataset.step || (field.name?.startsWith("energy_") ? "10" : "1");
    field.type = "text";
    field.setAttribute("role", "spinbutton");
    field.setAttribute("aria-valuemin", field.dataset.min);
    field.setAttribute("aria-valuemax", field.dataset.max);
    field.setAttribute("aria-label", LABELS[field.name] || ({ "baseline-age": "\u0412\u043E\u0437\u0440\u0430\u0441\u0442, \u043B\u0435\u0442", "baseline-height": "\u0420\u043E\u0441\u0442, \u0441\u0430\u043D\u0442\u0438\u043C\u0435\u0442\u0440\u044B", "baseline-weight": "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0432\u0435\u0441, \u043A\u0438\u043B\u043E\u0433\u0440\u0430\u043C\u043C\u044B" }[field.id] || field.id));
    const aria = () => {
      try {
        field.setAttribute("aria-valuenow", String(numeric(field.value, { min: Number(field.dataset.min), max: Number(field.dataset.max) })));
      } catch {
        field.removeAttribute("aria-valuenow");
      }
    };
    field.addEventListener("input", aria);
    field.addEventListener("change", aria);
    const box = el2("div", "number-control");
    field.insertAdjacentElement("beforebegin", box);
    const minus = el2("button", "", "\u2212"), plus = el2("button", "", "+");
    for (const [button, delta] of [[minus, -1], [plus, 1]]) {
      button.type = "button";
      button.setAttribute("aria-label", (delta < 0 ? "\u0423\u043C\u0435\u043D\u044C\u0448\u0438\u0442\u044C " : "\u0423\u0432\u0435\u043B\u0438\u0447\u0438\u0442\u044C ") + (LABELS[field.name] || label.textContent.split("\n")[0].trim()));
      button.onclick = () => bump(field, delta);
    }
    box.append(minus, field, plus);
    field.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        bump(field, e.key === "ArrowUp" ? 1 : -1);
      }
    });
  });
  function bump(field, delta) {
    try {
      field.value = String(stepValue(field.value, delta, { min: Number(field.dataset.min), max: Number(field.dataset.max), step: Number(field.dataset.step) }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      field.focus();
    } catch (e) {
      notify2(e.message);
    }
  }
  function fillBaseline(s2) {
    const b2 = s2.profile.baseline || {}, c2 = s2.guidance?.choices || {};
    for (const [id, key] of [["baseline-age", "age_years"], ["baseline-height", "height_cm"], ["baseline-weight", "weight_kg"], ["baseline-category", "equation_category"]]) $3(id).value = b2[key] ?? "";
    $3("baseline-name").value = s2.profile.display_name || "";
    $3("baseline-zone").value = s2.profile.timezone || "";
    $3("baseline-measured").value = (b2.measured_at || "").slice(0, 10);
    const activity = Object.entries({ sitting: 1.4, light: 1.6, active: 1.8 }).find(([, factor]) => factor === b2.activity_factor)?.[0];
    for (const [name2, value] of [["activity", activity], ["planning-goal", c2.goal], ["planning-mode", c2.mode]]) document.querySelectorAll(`[name="${name2}"]`).forEach((x) => x.checked = x.value === value);
    weightSlider?.destroy();
    weightSlider = linkSlider($3("baseline-weight-slider"), [$3("baseline-weight")], { min: 20, max: 400, step: 0.1, labels: ["\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0432\u0435\u0441, \u043A\u0438\u043B\u043E\u0433\u0440\u0430\u043C\u043C\u044B"] });
  }
  function fillTargets(t, fromPreview = false) {
    if (!t) return;
    $3("energy-edit-note").textContent = fromPreview ? "" : "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043F\u0438\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u043E\u0432.";
    $3("energy-floor-note").textContent = "\u041F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432\u044B\u0439 \u043D\u0438\u0436\u043D\u0438\u0439 \u043F\u0440\u0435\u0434\u0435\u043B \u0434\u043B\u044F \u043D\u043E\u0432\u044B\u0445 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439: " + (getState()?.guidance?.energy_floor || 1200) + " \u043A\u043A\u0430\u043B; \u044D\u0442\u043E \u043D\u0435 \u0443\u043D\u0438\u0432\u0435\u0440\u0441\u0430\u043B\u044C\u043D\u0430\u044F \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u0430\u044F \u043D\u043E\u0440\u043C\u0430.";
    for (const [name2, value] of Object.entries(t)) {
      const field = input(name2);
      if (field) field.value = value;
    }
    if (fromPreview || !input("basis_note").value) input("basis_note").value = "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u043C \u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435 \u043F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u0440\u0430\u0441\u0447\u0451\u0442\u0430 starter-v1, \u043D\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u0430";
    $3("energy-review").hidden = false;
    energySlider?.destroy();
    energySlider = linkSlider($3("energy-slider"), [input("energy_min_kcal"), input("energy_max_kcal")], { min: 1200, max: 6e3, step: 10, localWindow: true, labels: ["\u041D\u0438\u0436\u043D\u044F\u044F \u0433\u0440\u0430\u043D\u0438\u0446\u0430 \u044D\u043D\u0435\u0440\u0433\u0438\u0438, \u043A\u043A\u0430\u043B", "\u0412\u0435\u0440\u0445\u043D\u044F\u044F \u0433\u0440\u0430\u043D\u0438\u0446\u0430 \u044D\u043D\u0435\u0440\u0433\u0438\u0438, \u043A\u043A\u0430\u043B"] });
  }
  function summary(t, parent) {
    const grid = el2("div", "target-grid");
    for (const text of [`\u042D\u043D\u0435\u0440\u0433\u0438\u044F: ${t.energy_min_kcal}\u2013${t.energy_max_kcal} \u043A\u043A\u0430\u043B/\u0434\u0435\u043D\u044C`, `\u0411\u0435\u043B\u043E\u043A: ${t.protein_min_g}\u2013${t.protein_max_g} \u0433/\u0434\u0435\u043D\u044C`, `\u0423\u0433\u043B\u0435\u0432\u043E\u0434\u044B: \u0434\u043E ${t.carb_max_g} \u0433 (${t.carb_basis === "total" ? "\u043E\u0431\u0449\u0438\u0435" : "\u0440\u0430\u0441\u0447\u0451\u0442\u043D\u044B\u0435 net"})`, `\u041A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430: \u043E\u0442 ${t.fiber_min_g} \u0433/\u0434\u0435\u043D\u044C`, `\u041D\u0430\u0441\u044B\u0449\u0435\u043D\u043D\u044B\u0435 \u0436\u0438\u0440\u044B: \u0434\u043E ${t.saturated_fat_max_pct}% \u044D\u043D\u0435\u0440\u0433\u0438\u0438, \u043D\u0435 \u0446\u0435\u043B\u044C \u0435\u0441\u0442\u044C \u043C\u0430\u0441\u043B\u043E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E`]) grid.append(el2("p", "", text));
    parent.append(grid);
  }
  function knowledgeCards() {
    const root = $3("knowledge-cards");
    for (const topic of knowledge.topics) {
      const card = el2("article", "knowledge-card");
      card.id = "knowledge-" + topic.id;
      card.append(el2("h2", "", topic.title), el2("p", "", topic.text));
      for (const id of topic.sources) {
        const source = knowledge.sources.find((s2) => s2.id === id && s2.status === "included");
        if (!source) continue;
        const a2 = el2("a", "", `${id}: ${source.title} (${source.year || "\u0433\u043E\u0434 \u0443\u0442\u043E\u0447\u043D\u044F\u0435\u0442\u0441\u044F"})`);
        a2.href = source.url;
        a2.target = "_blank";
        a2.rel = "noopener noreferrer";
        card.append(a2, el2("small", "", `\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430: ${source.date}. ${source.scope}`));
      }
      root.append(card);
    }
    const policies = el2("article", "knowledge-card");
    policies.append(el2("h2", "", "\u0414\u0430\u043D\u043D\u044B\u0435 \u0438 \u0434\u043E\u043F\u0443\u0449\u0435\u043D\u0438\u044F \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430"), el2("p", "", "\u0420\u0430\u0441\u0447\u0451\u0442 \u0432 \u043F\u043E\u043A\u043E\u0435 \u2014 \u043F\u043E ENGINE01. \u041C\u043D\u043E\u0436\u0438\u0442\u0435\u043B\u0438 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438, \xB110%, \u043C\u044F\u0433\u043A\u043E\u0435 \u0441\u043D\u0438\u0436\u0435\u043D\u0438\u0435 10%/\u0434\u043E 300 \u043A\u043A\u0430\u043B, \u0440\u0435\u0436\u0438\u043C\u044B 100/50 \u0433, \u0433\u0440\u0430\u043D\u0438\u0446\u044B \u0418\u041C\u0422 \u0438 \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u043F\u0435\u0440\u0435\u0441\u043C\u043E\u0442\u0440\u0430 \u2014 \u0432\u0435\u0440\u0441\u0438\u044F starter-v1 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430. \u041D\u0435 \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0430\u044F \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u044F."));
    const excluded = el2("article", "knowledge-card");
    excluded.append(el2("h2", "", "\u0427\u0442\u043E \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u0438\u0437 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0439"));
    for (const s2 of knowledge.excluded) excluded.append(el2("p", "", `${s2.id}: ${s2.title}. \u0421\u0442\u0430\u0442\u0443\u0441: ${{ excluded_retracted: "\u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F \u043E\u0442\u043E\u0437\u0432\u0430\u043D\u0430", correction_pending_full_review: "\u043D\u0430 \u043F\u0435\u0440\u0435\u0441\u043C\u043E\u0442\u0440\u0435 \u0434\u043E \u043F\u043E\u043B\u043D\u043E\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438" }[s2.status] || "\u0438\u0441\u043A\u043B\u044E\u0447\u0451\u043D \u0438\u0437 \u0431\u0430\u0437\u044B"}; \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043A\u0430\u043A \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043F\u043E\u043B\u044C\u0437\u044B.`));
    root.append(policies, excluded);
  }
  knowledgeCards();
  function stage(route) {
    const s2 = getState(), g = s2?.guidance;
    const selected = route.startsWith("setup-") ? route.slice(6) : g?.stage === "ready" ? "targets" : g?.stage || "consent";
    STAGES.forEach((item, i) => {
      stageButtons[i].setAttribute("aria-current", item === selected ? "step" : "false");
    });
    $3("setup-stage").textContent = `\u042D\u0442\u0430\u043F ${STAGES.indexOf(selected) + 1} \u0438\u0437 4: ${TITLES[selected] || TITLES.targets}. ${g?.missing?.length ? "\u0415\u0449\u0451 \u043D\u0443\u0436\u043D\u044B: " + g.missing.map((x) => LABELS[x] || x).join(", ") : "\u041E\u0442\u0432\u0435\u0442\u044B \u0441\u0432\u0435\u0440\u044F\u044E\u0442\u0441\u044F \u0441 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u043C\u0438 \u0434\u0430\u043D\u043D\u044B\u043C\u0438."}`;
    for (const [id, value] of [["setup-consent-slot", "consent"], ["setup-about", "about"], ["setup-restrictions-slot", "restrictions"], ["setup-targets", "targets"]]) $3(id).hidden = selected !== value;
    $3("consent-panel").hidden = selected !== "consent";
    if (selected === "consent") {
      $3("c-processing").checked = !!s2?.processing_consent;
      $3("c-storage").checked = !!s2?.profile.consent.storage;
      $3("c-health").checked = !!s2?.profile.consent.health_data;
    }
  }
  function render(route = "") {
    const s2 = getState();
    if (!s2) return;
    if (seenOwner !== s2.profile.owner_account_id || seenRevision !== s2.revision) {
      const ownerChanged = seenOwner !== s2.profile.owner_account_id;
      if (ownerChanged) {
        baselineDirty = false;
        targetsDirty = false;
      }
      seenOwner = s2.profile.owner_account_id;
      seenRevision = s2.revision;
      if (ownerChanged || !baselineDirty) fillBaseline(s2);
      if (ownerChanged || !targetsDirty) fillTargets(s2.profile.targets);
      if (ownerChanged || !targetsDirty) {
        lastPreview = null;
        setApplyVisible(false);
        $3("target-preview").replaceChildren();
      }
      const box = $3("saved-targets");
      box.replaceChildren(el2("h2", "", "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B"));
      if (s2.profile.targets) {
        summary(s2.profile.targets, box);
        box.append(el2("p", "ux-hint", s2.guidance?.provenance?.source === "starter_policy" ? "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E \u0432\u0430\u043C\u0438 \u043F\u043E \u0440\u0430\u0441\u0447\u0451\u0442\u0443 starter-v1; \u043D\u0435 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u0438\u0435 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u0430." : s2.guidance?.provenance?.source === "manual" ? "\u0420\u0443\u0447\u043D\u043E\u0439 \u043F\u043B\u0430\u043D \u2014 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u043C. \u0421\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u0434\u043E \u0432\u0430\u0448\u0435\u0433\u043E \u044F\u0432\u043D\u043E\u0433\u043E \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F." : "\u0412\u043D\u0435\u0448\u043D\u0438\u0439/\u0440\u0443\u0447\u043D\u043E\u0439 \u043F\u043B\u0430\u043D. \u0421\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u0434\u043E \u0432\u0430\u0448\u0435\u0433\u043E \u044F\u0432\u043D\u043E\u0433\u043E \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F."));
      } else box.append(el2("p", "", "\u041E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u043F\u043E\u043A\u0430 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u044B. \u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043E\u0442\u0432\u0435\u0442\u044B \u2014 \u0441\u0435\u0440\u0432\u0435\u0440 \u043F\u043E\u043A\u0430\u0436\u0435\u0442 \u043E\u0431\u044A\u044F\u0441\u043D\u0451\u043D\u043D\u0443\u044E \u043F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u0443\u044E \u0432\u0435\u0440\u0441\u0438\u044E."));
      if (s2.guidance?.targets_stale) box.append(el2("p", "planning-warning", "\u041E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u0443\u0441\u0442\u0430\u0440\u0435\u043B\u0438 \u043F\u043E\u0441\u043B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445. \u041C\u0435\u043D\u044E \u0438 PDF \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043D\u043E\u0432\u043E\u0433\u043E \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F."));
      if (s2.guidance?.review?.length) box.append(el2("p", "planning-warning", "\u0421\u0442\u043E\u0438\u0442 \u043F\u0435\u0440\u0435\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F: \u043F\u0440\u043E\u0448\u043B\u043E 30 \u0434\u043D\u0435\u0439 \u0438\u043B\u0438 \u043C\u0430\u0441\u0441\u0430 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0430\u0441\u044C \u043D\u0430 5%. \u042D\u0442\u043E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432\u044B\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u0430, \u043A\u0430\u043B\u043E\u0440\u0438\u0438 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043D\u0435 \u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F."));
    }
    if (route.startsWith("setup")) stage(route);
  }
  function showProposal2(data) {
    accept2(data);
  }
  $3("baseline-form").onsubmit = (e) => {
    e.preventDefault();
    run2(async () => {
      const picked = (name2) => document.querySelector(`[name="${name2}"]:checked`)?.value;
      if (!picked("activity") || !picked("planning-goal") || !picked("planning-mode") || !$3("baseline-category").value) throw Error("\u042F\u0432\u043D\u043E \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u043E\u044D\u0444\u0444\u0438\u0446\u0438\u0435\u043D\u0442, \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C, \u0446\u0435\u043B\u044C \u0438 \u0440\u0435\u0436\u0438\u043C.");
      const values2 = { baseline: { age_years: numeric($3("baseline-age").value, { min: 0, max: 120 }), height_cm: numeric($3("baseline-height").value, { min: 80, max: 240 }), weight_kg: numeric($3("baseline-weight").value, { min: 20, max: 400 }), equation_category: $3("baseline-category").value, activity: picked("activity"), measured_at: $3("baseline-measured").value }, choices: { goal: picked("planning-goal"), mode: picked("planning-mode") }, timezone: $3("baseline-zone").value };
      if ($3("baseline-name").value.trim()) values2.display_name = $3("baseline-name").value.trim();
      showProposal2(await call2("keto_guidance", { action: "baseline", values: values2 }), "setup-confirmations");
    });
  };
  $3("calculate-guidance").onclick = () => run2(async () => {
    const stamp = epoch(), revision = getState().revision;
    const result = await call2("keto_guidance", { action: "preview" });
    if (stamp !== epoch() || revision !== getState().revision) return;
    lastPreview = result.preview;
    const p = lastPreview, box = $3("target-preview");
    box.replaceChildren(el2("h2", "", "\u041F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0440\u0430\u0441\u0447\u0451\u0442"), el2("p", "ux-callout", "\u041F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0440\u0430\u0441\u0447\u0451\u0442 \u2014 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F. \u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u043F\u043E\u043A\u0430 \u043D\u0435 \u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F."));
    setApplyVisible(Boolean(p.candidate));
    if (p.candidate) {
      summary(p.candidate, box);
      fillTargets(p.candidate, true);
      box.append(el2("p", "", "\u0411\u0435\u043B\u043E\u043A 1,2\u20131,6 \u0433/\u043A\u0433 \u0442\u0435\u043A\u0443\u0449\u0435\u0433\u043E \u0432\u0435\u0441\u0430, \u043E\u043A\u0440\u0443\u0433\u043B\u0435\u043D\u0438\u0435 \u043D\u0430\u0440\u0443\u0436\u0443 \u0434\u043E 5 \u0433. \u041A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0443 \u0443\u0432\u0435\u043B\u0438\u0447\u0438\u0432\u0430\u0439\u0442\u0435 \u043F\u043E\u0441\u0442\u0435\u043F\u0435\u043D\u043D\u043E \u0441 \u0443\u0447\u0451\u0442\u043E\u043C \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u043C\u043E\u0441\u0442\u0438."));
      if (getState().profile.targets) {
        const diff = el2("div");
        diff.append(el2("h3", "", "\u0427\u0442\u043E \u0437\u0430\u043C\u0435\u043D\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F"));
        for (const [key, value] of Object.entries(p.candidate)) if (getState().profile.targets[key] !== value) diff.append(el2("p", "", `${LABELS[key] || key}: ${getState().profile.targets[key]} \u2192 ${value}`));
        box.append(diff);
      }
    } else {
      box.append(el2("p", "planning-warning", "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u0441\u0435\u0439\u0447\u0430\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D."));
      for (const reason of [...p.missing, ...p.reasons]) box.append(el2("p", "", REASONS[reason] || (screenNames[reason] ? "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435: " + screenNames[reason] + ". \u041D\u0435 \u043C\u0435\u043D\u044F\u0439\u0442\u0435 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0430 \u0441\u0430\u043C\u043E\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u043D\u043E." : "\u041D\u0443\u0436\u043D\u043E \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u044C: " + (LABELS[reason] || reason))));
      const b2 = el2("button", "", "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043D\u0443\u0436\u043D\u044B\u0439 \u044D\u0442\u0430\u043F");
      b2.onclick = () => setView2("setup");
      box.append(b2);
    }
    if (p.catalogue_check) {
      box.append(el2("p", p.catalogue_check.feasible ? "notice" : "planning-warning", p.catalogue_check.note));
    }
    if (p.calculation) {
      const detail = el2("details", "panel");
      detail.append(el2("summary", "", "\u041A\u0430\u043A \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D\u043E"));
      const b2 = getState().profile.baseline;
      detail.append(el2("p", "", `\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435: \u0432\u043E\u0437\u0440\u0430\u0441\u0442 ${b2.age_years}; \u0440\u043E\u0441\u0442 ${b2.height_cm} \u0441\u043C; \u0432\u0435\u0441 ${b2.weight_kg} \u043A\u0433; \u043A\u043E\u044D\u0444\u0444\u0438\u0446\u0438\u0435\u043D\u0442 ${{ female: "\u0436\u0435\u043D\u0441\u043A\u0438\u0439", male: "\u043C\u0443\u0436\u0441\u043A\u043E\u0439" }[b2.equation_category] || "\u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D"}; \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435 ${b2.measured_at}. \u0426\u0435\u043B\u044C: ${{ maintain: "\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0432\u0435\u0441\u0430", loss: "\u043C\u044F\u0433\u043A\u043E\u0435 \u0441\u043D\u0438\u0436\u0435\u043D\u0438\u0435 \u0432\u0435\u0441\u0430", gain: "\u043D\u0430\u0431\u043E\u0440 \u0432\u0435\u0441\u0430" }[getState().guidance.choices.goal] || getState().guidance.choices.goal}; \u0440\u0435\u0436\u0438\u043C: ${{ starter: "\u043D\u0438\u0437\u043A\u043E\u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043D\u044B\u0439 \u0441\u0442\u0430\u0440\u0442 (\u0434\u043E 100 \u0433)", keto: "\u043A\u0435\u0442\u043E-\u0440\u0435\u0436\u0438\u043C (\u0434\u043E 50 \u0433)" }[getState().guidance.choices.mode] || getState().guidance.choices.mode}.`));
      detail.append(el2("p", "", p.calculation.equation), el2("p", "", `\u041E\u0446\u0435\u043D\u043A\u0430 \u0432 \u043F\u043E\u043A\u043E\u0435 (\u043E\u043A\u0440\u0443\u0433\u043B\u0451\u043D\u043D\u0430\u044F): ${p.calculation.resting_energy_estimate_kcal} \u043A\u043A\u0430\u043B. \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435: ${p.calculation.maintenance_estimate_kcal}. \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0434\u0432\u0438\u0436\u043E\u043A \u0441\u0447\u0438\u0442\u0430\u0435\u0442 \u0434\u043E \u043E\u043A\u0440\u0443\u0433\u043B\u0435\u043D\u0438\u044F \u043E\u0446\u0435\u043D\u043A\u0438 \u0432 \u043F\u043E\u043A\u043E\u0435. \u041C\u043D\u043E\u0436\u0438\u0442\u0435\u043B\u044C ${p.calculation.activity_factor_assumed}: ${p.calculation.activity_note}.`), el2("p", "", `\u0423\u0441\u043B\u043E\u0432\u043D\u044B\u0439 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u044F \xB110%: ${p.calculation.maintenance_uncertainty_kcal.join("\u2013")}. ${p.calculation.uncertainty_note}. \u0426\u0435\u043D\u0442\u0440 \u043F\u043E\u0441\u043B\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432\u043E\u0439 \u043F\u043E\u043F\u0440\u0430\u0432\u043A\u0438: ${p.calculation.center_kcal}. \u042D\u043D\u0435\u0440\u0433\u0438\u044F \xB15%, \u043E\u043A\u0440\u0443\u0433\u043B\u0435\u043D\u0438\u0435 \u0434\u043E 10 \u043A\u043A\u0430\u043B; \u0431\u0435\u043B\u043E\u043A \u043F\u043E \u0442\u0435\u043A\u0443\u0449\u0435\u043C\u0443 \u0432\u0435\u0441\u0443, \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430 14 \u0433/1000 \u043A\u043A\u0430\u043B. \u041D\u0438\u043A\u0430\u043A\u0438\u0445 \u0441\u0440\u043E\u043A\u043E\u0432/\u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0439 \u0441\u043D\u0438\u0436\u0435\u043D\u0438\u044F \u0432\u0435\u0441\u0430.`));
      box.append(detail);
    }
    for (const warning of p.warnings) box.append(el2("p", "muted", warning));
    box.append(el2("p", "muted", `\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 ${p.policy_version}; ${p.timestamp}. \u041E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u044F: ${p.source_ids.join(", ")}.`));
    const kb = el2("button", "", "\u0411\u0430\u0437\u0430 \u0437\u043D\u0430\u043D\u0438\u0439 / \u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438");
    kb.onclick = () => setView2("knowledge");
    box.append(kb);
  });
  $3("apply-targets").onclick = () => run2(async () => {
    if (!lastPreview?.preview_hash) throw Error("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0439\u0442\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B.");
    showProposal2(await call2("keto_guidance", { action: "propose", preview_hash: lastPreview.preview_hash }), "target-confirmations");
  });
  return { initial: initialRoute, render, resolve(route) {
    if (route === "onboarding") return "setup-restrictions";
    if (route === "setup") return "setup-" + (getState()?.guidance?.stage === "ready" ? "targets" : getState()?.guidance?.stage || "consent");
    return route;
  }, afterApplied(data) {
    if (data.receipt?.type === "guidance.setup") {
      baselineDirty = false;
      fillBaseline(getState());
    }
    if (data.receipt && ["guidance.targets", "targets.update"].includes(data.receipt.type)) {
      targetsDirty = false;
      fillTargets(getState()?.profile?.targets);
    }
    if (data.receipt && ["guidance.setup", "profile.update"].includes(data.receipt.type) && document.body.dataset.view === "setup") setView2("setup");
    if (data.receipt?.type === "guidance.targets") setView2("targets");
  }, reset() {
    weightSlider?.destroy();
    energySlider?.destroy();
    weightSlider = energySlider = null;
    seenOwner = seenRevision = null;
    lastPreview = null;
    baselineDirty = false;
    targetsDirty = false;
    $3("baseline-form").reset();
    $3("target-preview").replaceChildren();
    $3("saved-targets").replaceChildren();
    $3("energy-review").hidden = true;
    $3("apply-targets").hidden = true;
  } };
}

// cloudflare-saas/public/shell-ui.js
function createScrollMemory() {
  const routes = /* @__PURE__ */ new Map(), threads = /* @__PURE__ */ new Map();
  return {
    saveRoute(key, top) {
      if (key) routes.set(key, Math.max(0, Number(top) || 0));
    },
    route: (key) => routes.get(key) || 0,
    saveThread(key, top) {
      if (key) threads.set(key, Math.max(0, Number(top) || 0));
    },
    thread: (key) => threads.get(key),
    clear() {
      routes.clear();
      threads.clear();
    }
  };
}
function chatScrollPosition({ previousThread, nextThread, previousKey, nextKey, top, height, clientHeight, saved, submitted = false }) {
  const changed = previousThread !== nextThread;
  if (changed) return { render: true, bottom: saved === void 0, top: saved || 0 };
  const render = previousKey !== nextKey;
  return { render, bottom: render && (submitted || height - clientHeight - top < 80), top };
}
function createDialogController({ $: $3, getRouter, activeElement = () => document.activeElement }) {
  const ids = { intake: "intake-dialog", recipe: "recipe-dialog", help: "help-dialog", proposal: "proposal-dialog", attachments: "attachments-dialog", topic: "topic-dialog", image: "image-link-details", source: "source-recipe-dialog" };
  let current = null, returnFocus = null, version2 = 0;
  const visited = /* @__PURE__ */ new Set();
  function sync(kind, { restore = true } = {}) {
    const previous = current;
    if (kind && !visited.has(kind)) kind = null;
    if (kind !== current) version2++;
    for (const [key, id] of Object.entries(ids)) {
      const dialog = $3(id);
      if (dialog?.open && key !== kind) dialog.close();
    }
    if (kind && ids[kind]) {
      const dialog = $3(ids[kind]);
      if (!dialog.open) {
        if (!current) returnFocus = activeElement();
        dialog.showModal();
      }
      current = kind;
      return;
    }
    current = null;
    if (previous && restore) {
      const target = returnFocus?.isConnected && !returnFocus.closest("[hidden]") ? returnFocus : !$3("pending-open")?.hidden ? $3("pending-open") : $3("content");
      target?.focus({ preventScroll: true });
    }
    if (previous) returnFocus = null;
  }
  function open(kind, focus) {
    if (!ids[kind]) return;
    visited.add(kind);
    if (!current) returnFocus = activeElement();
    if (getRouter().openDialog(kind) === false) return;
    sync(kind, { restore: false });
    if (focus) $3(focus)?.focus({ preventScroll: true });
  }
  return { open, sync, dismiss: () => getRouter().dismissDialog(), close: () => getRouter().closeDialog(), reset() {
    sync(null, { restore: false });
    returnFocus = null;
    visited.clear();
  }, get current() {
    return current;
  }, get version() {
    return version2;
  } };
}

// cloudflare-saas/public/mobile-ui.js
var FAQ = [["\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D", "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D\xBB, \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C, \u0437\u0430\u0442\u0435\u043C \xAB\u0421\u0442\u043E\u043F\xBB. \u0422\u0435\u043A\u0441\u0442 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0432 \u043F\u043E\u043B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0435\u0433\u043E \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0441\u0430\u043C\u0438. \u041F\u0440\u0438 \u0437\u0430\u043A\u0440\u044B\u0442\u0438\u0438 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0437\u0430\u043F\u0438\u0441\u044C \u043E\u0442\u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F."], ["PDF \u0438 Telegram", "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0435 \u043C\u0435\u043D\u044E, \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C PDF\xBB. \u0417\u0430\u0442\u0435\u043C \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0439 \u043A\u043D\u043E\u043F\u043A\u043E\u0439 \xAB\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F PDF\xBB \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u0443\u044E \u043F\u0430\u043D\u0435\u043B\u044C \u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 Telegram, \u0435\u0441\u043B\u0438 \u043E\u043D \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D. \u0415\u0441\u043B\u0438 \u043E\u0431\u043C\u0435\u043D \u0444\u0430\u0439\u043B\u0430\u043C\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D, \u0441\u043A\u0430\u0447\u0430\u0439\u0442\u0435 PDF."], ["\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C \u0438 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F", "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435 \u0438 \u0441\u043A\u0430\u0447\u0430\u0439\u0442\u0435 .ics. \u041F\u043E\u0441\u043B\u0435 \u0438\u043C\u043F\u043E\u0440\u0442\u0430 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C \u0441 \u0435\u0433\u043E \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F\u043C\u0438. \u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0432 KETO \u043D\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u044E\u0442 \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u0435 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438. \u041F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u044F \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u0443\u044E\u0442\u0441\u044F \u043D\u0430 \u0434\u0432\u0430 \u0433\u043E\u0434\u0430."], ["\u0422\u0435\u043C\u044B \u0438 \u043F\u0430\u043C\u044F\u0442\u044C", "\u041A\u0430\u0436\u0434\u0430\u044F \u0442\u0435\u043C\u0430 \u0445\u0440\u0430\u043D\u0438\u0442 \u0434\u043E 60 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0445 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439. \u041E\u0431\u0449\u0438\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0435 \u043F\u0440\u0435\u0434\u043F\u043E\u0447\u0442\u0435\u043D\u0438\u044F \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0442 \u0432\u043E \u0432\u0441\u0435\u0445 \u0442\u0435\u043C\u0430\u0445. \u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0442\u0435\u043C\u044B \u043D\u0435 \u0443\u0434\u0430\u043B\u044F\u0435\u0442 \u043F\u0440\u043E\u0444\u0438\u043B\u044C. \u0412\u0441\u0435\u0433\u043E \u0434\u043E 12 \u0442\u0435\u043C \u0438 200 \u041A\u0411 \u043E\u0431\u0449\u0435\u0439 \u0438\u0441\u0442\u043E\u0440\u0438\u0438; \u0441\u0442\u0430\u0440\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0443\u0431\u0438\u0440\u0430\u044E\u0442\u0441\u044F \u043F\u0440\u0438 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0438 \u043F\u0440\u0435\u0434\u0435\u043B\u0430."], ["\u0424\u043E\u0442\u043E", "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043B\u0438 \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435. \u041E\u043D\u043E \u0441\u0436\u0438\u043C\u0430\u0435\u0442\u0441\u044F \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u043C. \u0414\u043B\u044F HEIC \u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u043D\u0430\u0434\u043E\u0431\u0438\u0442\u044C\u0441\u044F \u044D\u043A\u0441\u043F\u043E\u0440\u0442 JPEG. \u041C\u0430\u0441\u0441\u0443 \u0438 \u043F\u043E\u043B\u043D\u044B\u0439 \u0441\u043E\u0441\u0442\u0430\u0432 \u043F\u043E \u0444\u043E\u0442\u043E \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F."], ["\u041A\u0430\u043A \u043D\u0430\u0447\u0430\u0442\u044C", "\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435, \u0447\u0442\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C, \u0438\u043B\u0438 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C \u043E \u0434\u043D\u0435. \u041B\u0438\u0447\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F."]];
var HINTS = { theme: "\u041C\u0435\u043D\u044F\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0446\u0432\u0435\u0442\u0430 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430. \u041F\u0438\u0442\u0430\u043D\u0438\u0435 \u0438 \u0434\u0430\u043D\u043D\u044B\u0435 \u043D\u0435 \u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F.", text_size: "\u0423\u0432\u0435\u043B\u0438\u0447\u0438\u0432\u0430\u0435\u0442 \u0432\u0435\u0441\u044C \u0442\u0435\u043A\u0441\u0442 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F. \u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \xAB\u041A\u0440\u0443\u043F\u043D\u044B\u0439\xBB \u0434\u043B\u044F \u0447\u0442\u0435\u043D\u0438\u044F \u0431\u0435\u0437 \u043E\u0447\u043A\u043E\u0432.", density: "\u041C\u0435\u043D\u044F\u0435\u0442 \u043E\u0442\u0441\u0442\u0443\u043F\u044B \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A, \u043D\u0435 \u0441\u043E\u043A\u0440\u0430\u0449\u0430\u0435\u0442 \u0440\u0435\u0446\u0435\u043F\u0442\u044B \u0438 \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u044F.", home: "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0430\u0437\u0434\u0435\u043B \u043F\u043E\u0441\u043B\u0435 \u0432\u0445\u043E\u0434\u0430. \u041C\u043E\u0436\u043D\u043E \u0432\u0441\u0435\u0433\u0434\u0430 \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F \u043D\u0438\u0436\u043D\u0438\u043C\u0438 \u043A\u043D\u043E\u043F\u043A\u0430\u043C\u0438.", simple_mode: "\u0423\u0431\u0438\u0440\u0430\u0435\u0442 \u0432\u0442\u043E\u0440\u043E\u0441\u0442\u0435\u043F\u0435\u043D\u043D\u044B\u0435 \u0434\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u0438; \u0432\u0441\u0435 \u043E\u0441\u043D\u043E\u0432\u043D\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F.", show_nutrition: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0440\u0430\u0441\u0447\u0451\u0442\u043D\u044B\u0439 \u0441\u043E\u0441\u0442\u0430\u0432 \u0431\u043B\u044E\u0434. \u041D\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043A\u0430\u043B\u043E\u0440\u0438\u0438 \u0438\u043B\u0438 \u043D\u043E\u0440\u043C\u044B.", meals_per_day: "\u0427\u0438\u0441\u043B\u043E \u043F\u0440\u0438\u0451\u043C\u043E\u0432 \u043F\u0438\u0449\u0438 \u0432 \u043D\u043E\u0432\u043E\u043C \u0440\u0430\u0441\u0447\u0451\u0442\u043D\u043E\u043C \u043C\u0435\u043D\u044E. \u0413\u043E\u0442\u043E\u0432\u043E\u0435 \u043C\u0435\u043D\u044E \u043D\u0443\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0442\u044C.", max_active_minutes: "\u0412\u0440\u0435\u043C\u044F \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0439 \u0433\u043E\u0442\u043E\u0432\u043A\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u0431\u043B\u044E\u0434\u0430, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 15 \u043C\u0438\u043D\u0443\u0442. \u041D\u0435 \u043C\u0435\u043D\u044F\u0435\u0442 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438.", "display-name": "\u0418\u043C\u044F \u0434\u043B\u044F \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u044F, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \u0410\u043D\u043D\u0430. \u041F\u043E\u043B\u0435 \u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0435.", timezone: "\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441 IANA, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 Europe/Minsk. \u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u0442 \u0434\u0430\u0442\u0443 \u0434\u043D\u0435\u0432\u043D\u0438\u043A\u0430, \u043D\u0435 \u0432\u0440\u0435\u043C\u044F \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430.", goal: "\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0435 \u043F\u043E\u0436\u0435\u043B\u0430\u043D\u0438\u0435. \u0412\u044B\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u0446\u0435\u043B\u044C \u0440\u0430\u0441\u0447\u0451\u0442\u0430 \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E \u043D\u0430 \u044D\u0442\u0430\u043F\u0435 \xAB\u041E \u0432\u0430\u0441\xBB, \u044D\u0442\u043E \u043F\u043E\u043B\u0435 \u043D\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u0434\u0435\u0444\u0438\u0446\u0438\u0442.", medications: "\u041F\u0435\u0440\u0435\u0447\u0438\u0441\u043B\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E. \u041F\u0443\u0441\u0442\u043E\u0435 \u043F\u043E\u043B\u0435 \u0441\u0430\u043C\u043E \u043F\u043E \u0441\u0435\u0431\u0435 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432.", energy_min_kcal: "\u041D\u0438\u0436\u043D\u044F\u044F \u0433\u0440\u0430\u043D\u0438\u0446\u0430 \u0440\u0430\u043D\u0435\u0435 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u043E\u0439 \u044D\u043D\u0435\u0440\u0433\u0438\u0438 \u043D\u0430 \u0434\u0435\u043D\u044C. \u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043D\u0435 \u043F\u043E\u0434\u0431\u0438\u0440\u0430\u0435\u0442 \u044D\u0442\u043E \u0447\u0438\u0441\u043B\u043E.", energy_max_kcal: "\u0412\u0435\u0440\u0445\u043D\u044F\u044F \u0433\u0440\u0430\u043D\u0438\u0446\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u043E\u0439 \u044D\u043D\u0435\u0440\u0433\u0438\u0438. \u0414\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 \u043D\u0438\u0436\u043D\u0435\u0439.", protein_min_g: "\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u043C\u0438\u043D\u0438\u043C\u0443\u043C \u0431\u0435\u043B\u043A\u0430 \u0432 \u0433\u0440\u0430\u043C\u043C\u0430\u0445 \u0437\u0430 \u0434\u0435\u043D\u044C, \u043D\u0435 \u043C\u0430\u0441\u0441\u0430 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430.", protein_max_g: "\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0431\u0435\u043B\u043A\u0430 \u0437\u0430 \u0434\u0435\u043D\u044C. \u041D\u0435 \u043C\u0435\u043D\u044F\u0435\u0442 \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F.", carb_basis: "\u041E\u0431\u0449\u0438\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B \u0438\u043B\u0438 \u0440\u0430\u0441\u0447\u0451\u0442 net carbs. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0441\u043F\u043E\u0441\u043E\u0431 \u0438\u0437 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u043E\u0432.", carb_max_g: "\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432 \u0432 \u0433\u0440\u0430\u043C\u043C\u0430\u0445 \u0437\u0430 \u0434\u0435\u043D\u044C \u043F\u043E \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C\u0443 \u0441\u043F\u043E\u0441\u043E\u0431\u0443 \u043F\u043E\u0434\u0441\u0447\u0451\u0442\u0430.", fiber_min_g: "\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u043C\u0438\u043D\u0438\u043C\u0443\u043C \u043F\u0438\u0449\u0435\u0432\u044B\u0445 \u0432\u043E\u043B\u043E\u043A\u043E\u043D \u0437\u0430 \u0434\u0435\u043D\u044C. \u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u043D\u0435 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043D\u043E\u043B\u044C.", saturated_fat_max_pct: "\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0432\u0435\u0440\u0445\u043D\u044F\u044F \u0434\u043E\u043B\u044F \u044D\u043D\u0435\u0440\u0433\u0438\u0438 \u0438\u0437 \u043D\u0430\u0441\u044B\u0449\u0435\u043D\u043D\u044B\u0445 \u0436\u0438\u0440\u043E\u0432, \u0432 \u043F\u0440\u043E\u0446\u0435\u043D\u0442\u0430\u0445.", basis_note: "\u0417\u0430\u043F\u0438\u0448\u0438\u0442\u0435, \u0441 \u043A\u0435\u043C \u0438 \u043A\u043E\u0433\u0434\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u044B \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0438 \u043A\u0430\u043A\u0438\u0435 \u0435\u0441\u0442\u044C \u0434\u043E\u043F\u0443\u0449\u0435\u043D\u0438\u044F. \u041D\u0435 \u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u0434\u0435\u043C\u043E\u043D\u0441\u0442\u0440\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0435 \u043D\u043E\u0440\u043C\u044B.", "reminder-title": "\u041A\u043E\u0440\u043E\u0442\u043A\u043E\u0435 \u043B\u0438\u0447\u043D\u043E\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \xAB\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0434\u0435\u043D\u044C\xBB. \u041D\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u0434\u0438\u0430\u0433\u043D\u043E\u0437\u044B.", "reminder-time": "\u041C\u0435\u0441\u0442\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u0432 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C \u0447\u0430\u0441\u043E\u0432\u043E\u043C \u043F\u043E\u044F\u0441\u0435. \u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u0438\u043C\u043F\u043E\u0440\u0442\u0430 \u0432 \u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C.", "reminder-zone": "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 Europe/Minsk \u0438\u043B\u0438 America/New_York. \u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441 \u0443\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442 \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u044B \u043B\u0435\u0442\u043D\u0435\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438.", "reminder-date": "\u0414\u043B\u044F \u043E\u0434\u043D\u043E\u043A\u0440\u0430\u0442\u043D\u043E\u0433\u043E \u0441\u043E\u0431\u044B\u0442\u0438\u044F \u043E\u0447\u0438\u0441\u0442\u0438\u0442\u0435 \u0434\u043D\u0438 \u043D\u0435\u0434\u0435\u043B\u0438 \u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0431\u0443\u0434\u0443\u0449\u0443\u044E \u0434\u0430\u0442\u0443.", "reminder-enabled": "\u0412\u044B\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u0431\u0443\u0434\u0443\u0449\u0443\u044E \u0437\u0430\u0434\u0430\u0447\u0443 \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438. \u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u0435 \u0443\u0434\u0430\u043B\u044F\u0439\u0442\u0435 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E \u0432 \u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u0435." };
function setupMobile({ $: $3, el: el2, call: call2, accept: accept2, getState, setView: setView2, run: run2, notify: notify2, epoch, setImage, getImage, loadImageLink, openDialog, closeDialog }) {
  let pdf = null, recorder, chatBusy = false, topicBusy = false, renderedTopic = null, renderedRemindersKey = "";
  function topicControls() {
    const s2 = getState();
    for (const id of ["topic-picker", "topic-new", "topic-edit", "topic-rename", "topic-clear", "topic-delete"]) $3(id).disabled = chatBusy || topicBusy || id === "topic-delete" && s2?.active_thread === "main";
    $3("send").disabled = chatBusy || topicBusy || Boolean(recorder && recorder.mode !== "idle");
  }
  function resizeComposer() {
    const input = $3("message");
    if (!input.style) return;
    input.style.height = "auto";
    input.style.height = Math.min(128, Math.max(48, input.scrollHeight + 2)) + "px";
  }
  $3("message").addEventListener("input", resizeComposer);
  function setChatImage(value) {
    setImage(value);
    if (value) Promise.resolve().then(() => {
      if (getImage() === value) $3("photo-status").textContent = "\u0424\u043E\u0442\u043E \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u043E. \u041E\u043D\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u0441\u044F, \u043A\u043E\u0433\u0434\u0430 \u043D\u0430\u0436\u043C\u0451\u0442\u0435 \xAB\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C\xBB.";
    });
  }
  const images = setupChatImages({ root: document.querySelector('[data-page="chat"]'), $: $3, link: loadImageLink, epoch, setImage: setChatImage, notify: notify2, openDialog, closeDialog });
  const resetPhoto = () => images.reset();
  recorder = new RecorderController({ mediaDevices: navigator.mediaDevices, Recorder: globalThis.MediaRecorder, onState: ({ mode, message, seconds }) => {
    $3("voice-status").textContent = mode === "idle" && message === "\u0422\u0435\u043A\u0441\u0442 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0435\u0433\u043E \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C\xBB." ? "\u0422\u0435\u043A\u0441\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D \u0432 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F \u0438 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0430 \u043F\u0435\u0440\u0435\u0434 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u043E\u0439." : message;
    $3("voice-timer").textContent = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
    $3("mic-button").disabled = mode !== "idle" || chatBusy || topicBusy;
    $3("mic-button").setAttribute("aria-pressed", String(mode === "recording"));
    $3("voice-controls").hidden = mode === "idle";
    $3("voice-stop").hidden = mode !== "recording";
    $3("send").disabled = mode !== "idle" || chatBusy || topicBusy;
  }, onAudio: async (blob, mime, signal) => {
    const stamp = epoch();
    const data = await call2("keto_transcribe", { audio_base64: await blobBase64(blob), mime, request_id: crypto.randomUUID().replaceAll("-", "") }, { signal });
    if (signal.aborted) throw new DOMException("\u041E\u0442\u043C\u0435\u043D\u0430", "AbortError");
    if (stamp !== epoch()) throw Error("\u0421\u0435\u0430\u043D\u0441 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F.");
    if (data.error_code) throw Error(data.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C.");
    $3("message").value = [$3("message").value, data.text].filter(Boolean).join("\n");
    resizeComposer();
    $3("message").focus();
    return data.text;
  } });
  $3("mic-button").onclick = () => {
    if (chatBusy) return;
    const s2 = getState();
    if (!s2?.processing_consent || !s2?.profile.consent.storage || !s2?.profile.consent.health_data) {
      notify2("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u043D\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0443 \u0438 \u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435.");
      return;
    }
    recorder.start();
  };
  $3("voice-stop").onclick = () => recorder.stop();
  $3("voice-cancel").onclick = () => recorder.cancel();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) recorder.cancel();
  });
  window.addEventListener("pagehide", () => recorder.cancel());
  function changeTopic(args) {
    return run2(async () => {
      if (chatBusy || topicBusy) {
        notify2("\u0414\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u0441\u043C\u0435\u043D\u044B \u0442\u0435\u043C\u044B.");
        return;
      }
      const discards = ["create", "select", "delete", "clear"].includes(args.action);
      if (discards && ($3("message").value.trim() || getImage()) && !confirm("\u041F\u0440\u0438 \u0441\u043C\u0435\u043D\u0435 \u0442\u0435\u043C\u044B \u0443\u0431\u0440\u0430\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A?")) {
        $3("topic-picker").value = getState().active_thread || "main";
        return;
      }
      recorder.cancel();
      if (discards) images.invalidate();
      topicBusy = true;
      topicControls();
      try {
        const result = await call2("keto_topics", { ...args, confirmed: true, expected_revision: getState().revision });
        if (discards) {
          resetPhoto();
          $3("message").value = "";
          resizeComposer();
        }
        accept2(result);
        setView2("chat");
      } finally {
        topicBusy = false;
        topicControls();
      }
    });
  }
  $3("topic-picker").onchange = (e) => changeTopic({ action: "select", thread_id: e.target.value });
  $3("topic-new").onclick = () => {
    if (chatBusy || topicBusy) return;
    const title = prompt("\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043D\u043E\u0432\u043E\u0439 \u0442\u0435\u043C\u044B, \u0434\u043E 80 \u0437\u043D\u0430\u043A\u043E\u0432");
    if (title?.trim()) {
      if (closeDialog) closeDialog();
      changeTopic({ action: "create", title: title.trim() });
    }
  };
  $3("topic-edit").onclick = () => {
    const s2 = getState();
    $3("topic-title").value = s2.topics?.find((t) => t.id === s2.active_thread)?.title || "";
    $3("topic-delete").disabled = s2.active_thread === "main";
    openDialog ? openDialog("topic", "topic-title") : $3("topic-dialog").showModal();
  };
  $3("topic-close").onclick = () => closeDialog ? closeDialog() : $3("topic-dialog").close();
  $3("topic-rename").onclick = () => {
    closeDialog ? closeDialog() : $3("topic-dialog").close();
    changeTopic({ action: "rename", thread_id: getState().active_thread, title: $3("topic-title").value });
  };
  $3("topic-delete").onclick = () => {
    if (confirm("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0441\u0442\u043E\u0440\u0438\u044E \u044D\u0442\u043E\u0439 \u0442\u0435\u043C\u044B? \u041E\u0431\u0449\u0438\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u043E\u0441\u0442\u0430\u043D\u0435\u0442\u0441\u044F.")) {
      closeDialog ? closeDialog() : $3("topic-dialog").close();
      changeTopic({ action: "delete", thread_id: getState().active_thread });
    }
  };
  $3("topic-clear").onclick = () => {
    if (confirm("\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0438 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B \u0431\u043B\u044E\u0434 \u044D\u0442\u043E\u0439 \u0442\u0435\u043C\u044B?")) {
      closeDialog ? closeDialog() : $3("topic-dialog").close();
      changeTopic({ action: "clear", thread_id: getState().active_thread });
    }
  };
  function resetPdf() {
    pdf = null;
    $3("menu-share").hidden = true;
    $3("menu-download").hidden = true;
    $3("pdf-status").textContent = "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C\u0442\u0435 PDF \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0433\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0433\u043E \u043C\u0435\u043D\u044E.";
  }
  $3("menu-pdf").onclick = () => run2(async () => {
    resetPdf();
    $3("menu-pdf").disabled = true;
    try {
      const stamp = epoch(), revision = getState().revision, data = await call2("keto_export", { format: "pdf" });
      if (stamp !== epoch() || revision !== getState().revision) return;
      const bytes = Uint8Array.from(atob(data.base64), (c2) => c2.charCodeAt(0));
      pdf = new File([bytes], data.filename, { type: "application/pdf" });
      $3("menu-share").hidden = false;
      $3("menu-download").hidden = false;
      $3("pdf-status").textContent = "PDF \u0433\u043E\u0442\u043E\u0432. \u0422\u0435\u043F\u0435\u0440\u044C \u043C\u043E\u0436\u043D\u043E \u043F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u0438\u043B\u0438 \u0441\u043A\u0430\u0447\u0430\u0442\u044C.";
    } finally {
      $3("menu-pdf").disabled = false;
    }
  });
  function saveFile(file) {
    const url = URL.createObjectURL(file), a2 = el2("a");
    a2.href = url;
    a2.download = file.name;
    document.body.append(a2);
    a2.click();
    a2.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3e3);
  }
  $3("menu-download").onclick = () => {
    if (pdf) saveFile(pdf);
  };
  $3("menu-share").onclick = () => {
    if (!pdf) return;
    if (navigator.canShare?.({ files: [pdf] }) && navigator.share) {
      navigator.share({ files: [pdf], title: "\u041C\u043E\u0451 \u043C\u0435\u043D\u044E KETO" }).then(() => notify2("\u0424\u0430\u0439\u043B \u043F\u0435\u0440\u0435\u0434\u0430\u043D \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u043E\u0439 \u043F\u0430\u043D\u0435\u043B\u0438 \u043E\u0431\u043C\u0435\u043D\u0430.")).catch((e) => notify2(e.name === "AbortError" ? "\u041E\u0431\u043C\u0435\u043D \u043E\u0442\u043C\u0435\u043D\u0451\u043D. PDF \u043C\u043E\u0436\u043D\u043E \u0441\u043A\u0430\u0447\u0430\u0442\u044C." : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0431\u043C\u0435\u043D. \u0421\u043A\u0430\u0447\u0430\u0439\u0442\u0435 PDF."));
    } else {
      notify2("\u041E\u0431\u043C\u0435\u043D \u0444\u0430\u0439\u043B\u0430\u043C\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. PDF \u0441\u043A\u0430\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F.");
      saveFile(pdf);
    }
  };
  const days = ["\u041F\u043D", "\u0412\u0442", "\u0421\u0440", "\u0427\u0442", "\u041F\u0442", "\u0421\u0431", "\u0412\u0441"];
  days.forEach((name2, i) => {
    const label = el2("label"), input = document.createElement("input");
    input.type = "checkbox";
    input.value = i;
    input.setAttribute("aria-label", name2);
    label.append(input, document.createTextNode(name2));
    $3("reminder-weekdays").append(label);
  });
  function resetReminder() {
    $3("reminder-form").reset();
    $3("reminder-id").value = "";
    $3("reminder-time").value = "20:00";
    $3("reminder-zone").value = getState()?.profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    $3("reminder-enabled").checked = true;
  }
  $3("reminder-reset").onclick = resetReminder;
  $3("reminder-day-template").onclick = () => {
    resetReminder();
    $3("reminder-title").value = "\u041A\u043E\u0440\u043E\u0442\u043A\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C \u043E \u0434\u043D\u0435";
    $3("reminder-weekdays").querySelectorAll("input").forEach((x) => x.checked = true);
    $3("reminder-title").focus();
  };
  $3("reminder-menu-template").onclick = () => {
    resetReminder();
    $3("reminder-title").value = "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043C\u0435\u043D\u044E \u043D\u0430 \u043D\u0435\u0434\u0435\u043B\u044E";
    $3("reminder-weekdays").querySelectorAll("input").forEach((x) => x.checked = x.value === "6");
    $3("reminder-title").focus();
  };
  async function reminderAction(action, id, values2) {
    const data = await call2("keto_reminders", { action, reminder_id: id || "", ...values2 ? { values: values2 } : {}, confirmed: true, expected_revision: getState().revision });
    accept2(data);
  }
  const reminderSnap = () => [$3("reminder-id").value, $3("reminder-title").value, $3("reminder-time").value, $3("reminder-zone").value, $3("reminder-enabled").checked, $3("reminder-date").value || "", ...[...$3("reminder-weekdays").querySelectorAll("input:checked")].map((x) => x.value)].join("\0");
  $3("reminder-form").onsubmit = (e) => {
    e.preventDefault();
    run2(async () => {
      const before = reminderSnap(), id = $3("reminder-id").value;
      await reminderAction(id ? "update" : "create", id, { title: $3("reminder-title").value, time: $3("reminder-time").value, timezone: $3("reminder-zone").value, enabled: $3("reminder-enabled").checked, date: $3("reminder-date").value || null, days_of_week: [...$3("reminder-weekdays").querySelectorAll("input:checked")].map((x) => Number(x.value)) });
      if (reminderSnap() === before) resetReminder();
    });
  };
  function renderReminders(force = false) {
    const box = $3("reminder-list"), items = getState()?.reminders || [], nowMs = Date.now(), key = JSON.stringify(items.map((r) => [r.id, r.title, r.time, r.timezone, r.enabled, r.date, r.days_of_week, r.next_due, Boolean(r.next_due && new Date(r.next_due).getTime() < nowMs)]));
    if (!force && renderedRemindersKey === key && box.children.length) return;
    renderedRemindersKey = key;
    const active = document.activeElement?.dataset?.reminderKey || null;
    box.replaceChildren();
    for (const r of items) {
      const card = el2("article", "panel" + (r.next_due && new Date(r.next_due).getTime() < nowMs ? " reminder-overdue" : ""));
      card.append(el2("h2", "", r.title), el2("p", "", r.enabled ? r.next_due ? "\u0421\u0440\u043E\u043A: " + new Date(r.next_due).toLocaleString("ru", { timeZone: r.timezone }) + " \xB7 " + r.timezone : "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E, \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0439 \u0434\u0430\u0442\u044B \u043D\u0435\u0442" : "\u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E"));
      const complete = el2("button", "", "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E"), edit = el2("button", "", "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C"), del = el2("button", "danger-button", "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"), ics = el2("button", "", "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C");
      complete.dataset.reminderKey = r.id + ":complete";
      edit.dataset.reminderKey = r.id + ":edit";
      del.dataset.reminderKey = r.id + ":del";
      ics.dataset.reminderKey = r.id + ":ics";
      complete.onclick = () => run2(() => reminderAction("complete", r.id));
      del.onclick = () => {
        if (confirm("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435 \u0438\u0437 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F? \u0421\u043E\u0431\u044B\u0442\u0438\u0435 \u0432 \u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u0435 \u0443\u0434\u0430\u043B\u044F\u0435\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E.")) run2(() => reminderAction("delete", r.id));
      };
      edit.onclick = () => {
        $3("reminder-id").value = r.id;
        $3("reminder-title").value = r.title;
        $3("reminder-time").value = r.time;
        $3("reminder-zone").value = r.timezone;
        $3("reminder-date").value = r.date || "";
        $3("reminder-enabled").checked = r.enabled;
        $3("reminder-weekdays").querySelectorAll("input").forEach((x) => x.checked = r.days_of_week.includes(Number(x.value)));
        $3("reminder-title").focus();
      };
      ics.disabled = !r.enabled || !r.next_due;
      ics.onclick = () => run2(async () => {
        const data = await call2("keto_reminders", { action: "ics", reminder_id: r.id });
        saveFile(new File([data.text], data.filename, { type: data.mime }));
        notify2("\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u0444\u0430\u0439\u043B \u0432 \u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0442\u0430\u043C \u0432\u0440\u0435\u043C\u044F \u0438 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439.");
      });
      const row = el2("div", "button-row");
      row.append(complete, edit, del, ics);
      card.append(row);
      box.append(card);
    }
    if (!box.children.length) box.append(el2("p", "muted", "\u041D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0448\u0430\u0431\u043B\u043E\u043D \u0438\u043B\u0438 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0444\u043E\u0440\u043C\u0443 \u2014 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0439 \u043A\u043D\u043E\u043F\u043A\u043E\u0439."));
    if (active) {
      box.querySelector?.('[data-reminder-key="' + active + '"]')?.focus?.({ preventScroll: true });
    }
  }
  function render() {
    const s2 = getState();
    if (!s2) return;
    if (renderedTopic !== null && renderedTopic !== s2.active_thread) {
      resetPhoto();
      recorder.cancel();
    }
    renderedTopic = s2.active_thread;
    $3("mic-button").disabled = chatBusy || !s2.processing_consent || !s2.profile.consent.storage || !s2.profile.consent.health_data;
    $3("topic-picker").replaceChildren(...(s2.topics || [{ id: "main", title: "\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440" }]).map((t) => {
      const option = el2("option", "", t.title);
      option.value = t.id;
      return option;
    }));
    $3("topic-picker").value = s2.active_thread || "main";
    renderReminders();
    resetPdf();
    topicControls();
    resizeComposer();
    resize();
  }
  function help() {
    const q2 = $3("help-search").value.toLocaleLowerCase();
    $3("help-results").replaceChildren(...FAQ.filter((x) => x.join(" ").toLocaleLowerCase().includes(q2)).map(([title, text]) => {
      const box = el2("section");
      box.append(el2("h3", "", title), el2("p", "", text));
      return box;
    }));
  }
  $3("help-search").oninput = help;
  help();
  document.querySelectorAll("#settings-form input,#settings-form select,#profile-form input,#targets-form input,#targets-form select,#targets-form textarea,#reminder-form input").forEach((input, i) => {
    if (input.type === "hidden") return;
    const key = input.id || input.name;
    if (!HINTS[key]) return;
    const id = "field-help-" + i;
    const hint = el2("small", "field-help", HINTS[key]);
    hint.id = id;
    input.setAttribute("aria-describedby", [input.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));
    input.parentElement.append(hint);
  });
  const viewport = window.visualViewport;
  let baseline = viewport?.height || window.innerHeight;
  function resize() {
    const height = viewport?.height || window.innerHeight, focused = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
    if (!focused) baseline = height;
    document.documentElement.style.setProperty("--viewport-height", height + "px");
    document.documentElement.style.setProperty("--viewport-offset", (viewport?.offsetTop || 0) + "px");
    document.body.classList.toggle("keyboard-open", focused && baseline - height > 100);
  }
  viewport?.addEventListener("resize", resize);
  viewport?.addEventListener("scroll", resize);
  window.addEventListener("resize", resize);
  document.addEventListener("focusin", resize);
  document.addEventListener("focusout", () => setTimeout(resize, 100));
  resize();
  let reminderTimer = setInterval(() => {
    if (getState() && !document.hidden) renderReminders();
  }, 6e4);
  window.addEventListener("pagehide", () => {
    clearInterval(reminderTimer);
    reminderTimer = null;
  });
  window.addEventListener("pageshow", () => {
    if (!reminderTimer) reminderTimer = setInterval(() => {
      if (getState() && !document.hidden) renderReminders();
    }, 6e4);
  });
  return { render, resizeComposer, leave() {
    if (recorder.mode !== "idle") recorder.cancel();
  }, changingTopic: () => topicBusy, offerImageUrl: images.offerUrl, setChatBusy(value) {
    chatBusy = value;
    const s2 = getState();
    $3("mic-button").disabled = value || !s2?.processing_consent || !s2?.profile.consent.storage || !s2?.profile.consent.health_data;
    $3("send").disabled = value || topicBusy || recorder.mode !== "idle";
    topicControls();
  }, reset() {
    renderedTopic = null;
    renderedRemindersKey = "";
    chatBusy = false;
    topicBusy = false;
    recorder.cancel("");
    resetPhoto();
    resetPdf();
    $3("reminder-list").replaceChildren();
    $3("topic-picker").replaceChildren();
    $3("topic-title").value = "";
    $3("topic-dialog").close();
    resetReminder();
    $3("reminder-zone").value = "";
  }, resetPhoto, recording: () => recorder.mode !== "idle" };
}

// cloudflare-saas/public/diary-model.js
var format = (n, digits = 1) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(n);
var finite = (n) => typeof n === "number" && Number.isFinite(n);
function nutritionOverview(summary, state2 = {}) {
  const count = summary?.entry_count ?? 0;
  const target = state2.profile?.targets, stale = Boolean(state2.guidance?.targets_stale);
  const paused = Boolean(state2.holds?.length) || state2.screening?.can_plan === false;
  const agreed = target?.status === "agreed", active = agreed && !stale && !paused;
  const net = agreed && target.carb_basis === "net_estimate";
  const specs = [
    ["energy_kcal", "\u042D\u043D\u0435\u0440\u0433\u0438\u044F", "\u043A\u043A\u0430\u043B", "energy", active ? [target.energy_min_kcal, target.energy_max_kcal] : null],
    ["protein_g", "\u0411\u0435\u043B\u043A\u0438", "\u0433", "protein", active ? [target.protein_min_g, target.protein_max_g] : null],
    [net ? "net_carbohydrate_g" : "carbohydrate_total_g", net ? "Net-\u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B" : "\u0423\u0433\u043B\u0435\u0432\u043E\u0434\u044B", "\u0433", "carbs", active ? [null, target.carb_max_g] : null],
    ["fat_g", "\u0416\u0438\u0440\u044B", "\u0433", "fat", null],
    ["fiber_g", "\u041A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430", "\u0433", "fiber", active ? [target.fiber_min_g, null] : null]
  ];
  const cards = specs.map(([key, label, unit, icon, range]) => {
    const coverage = summary?.coverage?.[key], complete = count > 0 && coverage?.complete === true && finite(summary?.nutrition?.[key]);
    const value = count > 0 ? complete ? summary.nutrition[key] : finite(coverage?.known_subtotal) ? coverage.known_subtotal : null : null;
    const [low, high] = range || [], hasTarget = finite(low) || finite(high), denominator = finite(high) ? high : low;
    const goal = hasTarget ? finite(low) && finite(high) ? `${format(low)}\u2013${format(high)} ${unit}` : finite(high) ? `\u0434\u043E ${format(high)} ${unit}` : `\u043E\u0442 ${format(low)} ${unit}` : "";
    let status = !count ? "\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439" : !complete ? "\u041D\u0435\u043F\u043E\u043B\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" : hasTarget ? finite(high) && value > high ? "\u0412\u044B\u0448\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u0430" : finite(low) && value < low ? "\u041F\u043E\u043A\u0430 \u043D\u0438\u0436\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u0430" : finite(low) && finite(high) ? "\u0412 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0435" : "\u0412 \u043F\u0440\u0435\u0434\u0435\u043B\u0430\u0445 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u0430" : "\u041F\u043E \u0437\u0430\u043F\u0438\u0441\u044F\u043C";
    const tone = !complete ? "unknown" : hasTarget && finite(high) && value > high ? "above" : hasTarget && (!finite(low) || value >= low) ? "within" : "neutral";
    return {
      key,
      label,
      unit,
      icon,
      value,
      complete,
      goal,
      status,
      tone,
      text: value === null ? "\u2014" : `${complete ? "" : "\u0443\u0447\u0442\u0435\u043D\u043E "}${format(value, key === "energy_kcal" ? 0 : 1)} ${unit}`,
      progress: complete && hasTarget && denominator > 0 ? Math.min(1, value / denominator) : null
    };
  });
  return {
    count,
    agreed,
    stale,
    paused,
    net,
    cards,
    incomplete: summary?.incomplete_entries || 0,
    incompleteNote: count && (summary?.incomplete_entries > 0 || cards.some((card) => !card.complete)) ? "\xAB\u0423\u0447\u0442\u0435\u043D\u043E\xBB \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0443\u044E \u0447\u0430\u0441\u0442\u044C \u0441\u043E\u0441\u0442\u0430\u0432\u0430; \u043F\u043E\u043B\u043D\u044B\u0439 \u0438\u0442\u043E\u0433 \u0437\u0430 \u0434\u0435\u043D\u044C \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435." : "",
    targetsNote: paused ? "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0441 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u0430\u043C\u0438 \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u0432 \u043F\u0440\u043E\u0444\u0438\u043B\u0435." : stale ? "\u041E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u043D\u0443\u0436\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u043E\u0441\u043B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044F." : agreed ? "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0441 \u0442\u0435\u043A\u0443\u0449\u0438\u043C\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u043C\u0438 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u0430\u043C\u0438." : "\u041B\u0438\u0447\u043D\u044B\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u043F\u043E\u043A\u0430 \u043D\u0435 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u044B."
  };
}
function validDiaryDay(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T12:00:00Z")) && (/* @__PURE__ */ new Date(value + "T12:00:00Z")).toISOString().slice(0, 10) === value;
}
function diaryNavigation(storage, account) {
  const key = account ? "keto.diary.navigation.v1:" + encodeURIComponent(account) : null;
  return {
    read() {
      try {
        const value = key ? JSON.parse(storage.getItem(key) || "null") : null;
        return validDiaryDay(value?.day) ? { day: value.day, allDates: value.allDates === true } : null;
      } catch {
        return null;
      }
    },
    save(day, allDates) {
      if (key && validDiaryDay(day)) try {
        storage.setItem(key, JSON.stringify({ day, allDates: Boolean(allDates) }));
      } catch {
      }
    },
    clear() {
      if (key) try {
        storage.removeItem(key);
      } catch {
      }
    }
  };
}

// cloudflare-saas/public/intake-ui.js
var MEALS = { breakfast: "\u0417\u0430\u0432\u0442\u0440\u0430\u043A", lunch: "\u041E\u0431\u0435\u0434", dinner: "\u0423\u0436\u0438\u043D", snack: "\u041F\u0435\u0440\u0435\u043A\u0443\u0441" };
var NUTRIENTS = [["energy_kcal", "\u042D\u043D\u0435\u0440\u0433\u0438\u044F", "\u043A\u043A\u0430\u043B"], ["protein_g", "\u0411\u0435\u043B\u043A\u0438", "\u0433"], ["fat_g", "\u0416\u0438\u0440\u044B", "\u0433"], ["carbohydrate_total_g", "\u041E\u0431\u0449\u0438\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B", "\u0433"], ["fiber_g", "\u041A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430", "\u0433"]];
var number = (n, digits = 1) => n == null ? "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(n);
function savedCheck(el2) {
  const mark = el2("span", "saved-check");
  mark.setAttribute("aria-hidden", "true");
  mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path pathLength="1" d="m4 12 5 5L20 6"/></svg>';
  return mark;
}
function profileClock(zone, now = /* @__PURE__ */ new Date()) {
  if (!zone) return null;
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
  } catch {
    return null;
  }
}
function dayLabel(day) {
  try {
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(/* @__PURE__ */ new Date(day + "T12:00:00"));
  } catch {
    return day || "\u0414\u0430\u0442\u0430 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430";
  }
}
function intakeAmount(entry) {
  return entry?.amount || (entry?.food_id && entry?.grams != null ? { value: entry.grams, unit: "g" } : entry?.recipe_id && entry?.portions != null ? { value: entry.portions, unit: "portion" } : null);
}
function intakeName(entry) {
  if (entry?.source_mode === "unquantified" && !entry?.recipe_id && !entry?.food_id) return "\u0417\u0430\u043C\u0435\u0442\u043A\u0430";
  return entry?.name_ru || entry?.nutrition_snapshot?.name_ru || entry?.nutrition_snapshot?.source?.name_ru || (entry?.note ? "\u0417\u0430\u043C\u0435\u0442\u043A\u0430" : "\u0417\u0430\u043F\u0438\u0441\u044C \u043E \u043F\u0438\u0442\u0430\u043D\u0438\u0438");
}
function amountLabel(amount) {
  return !amount ? "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E" : `${number(amount.value, 3)} ${amount.unit === "g" ? "\u0433" : amount.unit === "batch" ? "\u0432\u0441\u0435\u0433\u043E \u0431\u043B\u044E\u0434\u0430" : "\u043F\u043E\u0440\u0446\u0438\u0438"}`;
}
function entryClock(entry) {
  if (entry?.time) return entry.time;
  return entry?.eaten_at ? profileClock(entry.timezone, new Date(entry.eaten_at))?.time : null;
}
function nutritionNodes(el2, calculation) {
  const grid = el2("dl", "intake-nutrients"), nutrition = calculation?.nutrition || {}, coverage = calculation?.coverage || {};
  for (const [key, label, unit] of NUTRIENTS) {
    const value = nutrition[key], known = coverage[key]?.known_subtotal;
    grid.append(el2("dt", "", label), el2("dd", "", value == null || coverage[key]?.complete === false ? known == null || known === 0 ? "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \xB7 \u043D\u0435\u043F\u043E\u043B\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" : `\u0443\u0447\u0442\u0435\u043D\u043E ${number(known, key === "energy_kcal" ? 0 : 1)} ${unit} \xB7 \u043D\u0435\u043F\u043E\u043B\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435` : `${number(value, key === "energy_kcal" ? 0 : 1)} ${unit}`));
  }
  if (calculation?.available_carbohydrate_g != null) grid.append(el2("dt", "", "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B"), el2("dd", "", number(calculation.available_carbohydrate_g) + " \u0433"));
  return [grid];
}
function intakeReviewNodes(el2, preview) {
  const entry = preview?.entry || {}, clock = entryClock(entry), nodes = [el2("h4", "", intakeName(entry)), el2("p", "", amountLabel(intakeAmount(entry))), el2("p", "", `${dayLabel(entry.date)} \xB7 ${clock || "\u0432\u0440\u0435\u043C\u044F \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E"}`)];
  if (entry.timezone) nodes.push(el2("p", "muted", "\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441: " + entry.timezone));
  if (MEALS[entry.meal]) nodes.push(el2("p", "", MEALS[entry.meal]));
  if (entry.note && entry.note !== intakeName(entry)) nodes.push(el2("p", "", entry.note));
  if (preview?.calculation || intakeAmount(entry)) nodes.push(...nutritionNodes(el2, preview?.calculation));
  if (preview?.legacy_estimate) nodes.push(el2("p", "notice", "\u0414\u043B\u044F \u0441\u0442\u0430\u0440\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u0438 \u0441\u043E\u0441\u0442\u0430\u0432 \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u043D \u043F\u043E \u0442\u0435\u043A\u0443\u0449\u0435\u043C\u0443 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0443. \u0418\u0441\u0442\u043E\u0440\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0440\u0430\u0441\u0447\u0451\u0442 \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u043B\u0441\u044F."));
  if (preview?.issues?.some((x) => String(x).startsWith("allergen:"))) nodes.push(el2("p", "notice", "\u0412 \u0441\u043E\u0441\u0442\u0430\u0432\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D \u0438\u0437 \u0432\u0430\u0448\u0435\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F. \u0417\u0430\u043F\u0438\u0441\u044C \u0444\u0438\u043A\u0441\u0438\u0440\u0443\u0435\u0442 \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435 \u0438 \u043D\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442 \u044D\u0442\u043E\u0442 \u043F\u0440\u043E\u0434\u0443\u043A\u0442."));
  if (preview?.issues?.includes("allergens_unknown")) nodes.push(el2("p", "muted", "\u0421\u0432\u0435\u0434\u0435\u043D\u0438\u044F \u043E\u0431 \u0430\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u0430\u0445 \u0434\u043B\u044F \u044D\u0442\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u0438 \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0441\u044C."));
  if (!preview?.calculation) nodes.push(el2("p", "muted", "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0438\u043B\u0438 \u0441\u043E\u0441\u0442\u0430\u0432 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B. \u042D\u0442\u0430 \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0435 \u0434\u043E\u0431\u0430\u0432\u0438\u0442 \u0432\u044B\u0434\u0443\u043C\u0430\u043D\u043D\u044B\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043A \u0438\u0442\u043E\u0433\u0430\u043C."));
  const references = entry.nutrition_snapshot?.source?.source_urls || entry.nutrition_snapshot?.references || entry.nutrition_snapshot?.source_refs || preview?.sources || [];
  if (Array.isArray(references) && references.length) {
    const details = el2("details");
    details.append(el2("summary", "", "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0441\u043E\u0441\u0442\u0430\u0432\u0430"));
    for (const ref of references) {
      const text = typeof ref === "string" ? ref : [ref.name_ru || ref.title, ref.source_url || ref.source_ref || ref.url].filter(Boolean).join(" \xB7 ");
      if (text) details.append(el2("p", "muted", text));
    }
    nodes.push(details);
  }
  return nodes;
}
function setupIntake({ $: $3, el: el2, call: call2, getState, accept: accept2, notify: notify2, run: run2, openDialog, closeDialog, setView: setView2, epoch, isDiaryActive, propose: propose2 }) {
  let selection = null, submitting = false, generation = 0, historyGeneration = 0, day = "", allDates = false, rows = [], historyRevision = null, loadedKey = null, loadingKey = null, loading = false, hasMore = false, receiptEntry = null, summary = null, displayKey = null, navigation = null, navigationAccount = null, zoneProposal = null, nextOffset = 0, summaryContext = null;
  const form = $3("intake-form"), summaryHelp = el2("div", "diary-summary-explanation"), incompleteNoteEl = el2("p", "ux-callout"), netGuide = el2("details", "ux-guide"), netBody = el2("div", "ux-guide-body");
  summaryHelp.id = "diary-summary-explanation";
  summaryHelp.hidden = true;
  incompleteNoteEl.hidden = true;
  netBody.append(el2("p", "", "\u041E\u0431\u0449\u0438\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B \u0432\u043A\u043B\u044E\u0447\u0430\u044E\u0442 \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0443. Net-\u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B (\xAB\u0447\u0438\u0441\u0442\u044B\u0435\xBB) \u2014 \u0440\u0430\u0441\u0447\u0451\u0442 \u043F\u043E\u0441\u043B\u0435 \u0432\u044B\u0447\u0438\u0442\u0430\u043D\u0438\u044F \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0439 \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0438; \u0435\u0441\u043B\u0438 \u043F\u043E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0443 \u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u043E \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0435, \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043D\u0435 \u043F\u0440\u0438\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u0435\u0442 \u0435\u0451 \u043A \u043D\u0443\u043B\u044E."), el2("p", "", "\u041F\u043E\u043B\u0438\u043E\u043B\u044B \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043D\u0435 \u0432\u044B\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F. \u0418\u0442\u043E\u0433\u0438 \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0438\u0437 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u0434\u043D\u044F; \u0434\u043B\u044F \u0436\u0438\u0440\u043E\u0432 \u043D\u0435\u0442 \u0438\u0441\u043A\u0443\u0441\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0439 \xAB\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0439 \u043A\u0432\u043E\u0442\u044B\xBB."));
  netGuide.append(el2("summary", "", "\u041A\u0430\u043A \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u0447\u0438\u0441\u0442\u044B\u0435 (Net) \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B \u0438 \u0438\u0442\u043E\u0433\u0438?"), netBody);
  summaryHelp.append(incompleteNoteEl, netGuide);
  $3("diary-summary").insertAdjacentElement?.("afterend", summaryHelp);
  function deviceZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  function stateDay() {
    return profileClock(getState()?.profile?.timezone)?.date || profileClock(deviceZone())?.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
  function rememberNavigation() {
    navigation?.save(day, allDates);
  }
  function ensureNavigation() {
    const account = getState()?.profile?.owner_account_id;
    if (account !== navigationAccount) {
      navigationAccount = account;
      let storage;
      try {
        storage = globalThis.sessionStorage;
      } catch {
      }
      navigation = diaryNavigation(storage, account);
      const saved = navigation.read();
      day = saved?.day || stateDay();
      allDates = saved?.allDates || false;
    }
  }
  function zoneControls() {
    const zone = selection?.entry?.timezone || getState()?.profile?.timezone, valid = Boolean(profileClock(zone));
    $3("intake-zone").textContent = valid ? "\u0412\u0440\u0435\u043C\u044F \xB7 " + zone : "\u0414\u043B\u044F \u0437\u0430\u043F\u0438\u0441\u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0447\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441.";
    $3("intake-zone-confirm").hidden = valid;
    $3("intake-zone-name").textContent = deviceZone();
    $3("intake-now").hidden = !valid;
    $3("intake-time").disabled = !valid;
    $3("intake-clear-time").hidden = !valid || !$3("intake-time").value;
    return valid;
  }
  function validScope(token, stamp) {
    return token === generation && stamp === epoch();
  }
  function showStatus(message) {
    $3("intake-status").textContent = message || "";
  }
  function buttons() {
    $3("intake-fields").disabled = submitting;
    $3("intake-review").disabled = submitting;
    $3("intake-review").textContent = submitting ? "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0437\u0430\u043F\u0438\u0441\u044C\u2026" : "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C";
  }
  function open(source = {}) {
    generation++;
    selection = structuredClone(source);
    form.reset();
    showStatus("");
    buttons();
    const entry = source.entry, operation = source.operation || "add", amount = source.amount || intakeAmount(entry) || (source.food_id ? { value: 100, unit: "g" } : { value: 1, unit: "portion" });
    const choosing = !entry && !source.recipe_id && !source.food_id;
    $3("intake-choice").hidden = !choosing;
    form.hidden = choosing;
    $3("intake-title").textContent = operation === "update" ? "\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C" : operation === "repeat" ? "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C" : "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435";
    $3("intake-name").textContent = choosing ? "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435, \u0447\u0442\u043E \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C." : source.name_ru || intakeName(entry);
    if (!choosing) {
      const hasAmount = operation === "add" || Boolean(intakeAmount(entry));
      $3("intake-amount-row").hidden = !hasAmount;
      $3("intake-amount-help").hidden = !hasAmount;
      $3("intake-amount").required = hasAmount;
      $3("intake-unit").replaceChildren();
      for (const [value, label] of amount.unit === "g" ? [["g", "\u0413\u0440\u0430\u043C\u043C\u044B"]] : [["portion", "\u041F\u043E\u0440\u0446\u0438\u0438"], ["batch", "\u0414\u043E\u043B\u044F \u0431\u043B\u044E\u0434\u0430"]]) {
        const o2 = el2("option", "", label);
        o2.value = value;
        $3("intake-unit").append(o2);
      }
      $3("intake-unit").value = amount.unit;
      $3("intake-amount").value = String(amount.value);
      $3("intake-unit").disabled = amount.unit === "g";
      $3("intake-date").value = operation === "update" ? entry.date : day || stateDay();
      setTime(operation === "update" ? entryClock(entry) || "" : "");
      for (const option of Array.from($3("intake-meal").options || [])) if (option.dataset.legacy) option.remove();
      if (entry?.meal && !MEALS[entry.meal]) {
        const option = el2("option", "", entry.meal);
        option.value = "legacy";
        option.dataset.legacy = "true";
        $3("intake-meal").append(option);
      }
      $3("intake-meal").value = entry?.meal ? MEALS[entry.meal] ? entry.meal : "legacy" : "";
      $3("intake-note").value = entry?.note || "";
      selection.initial = { date: $3("intake-date").value, time: $3("intake-time").value || null, meal: $3("intake-meal").value, note: $3("intake-note").value.trim() };
      zoneControls();
      $3("intake-note-options").open = false;
      $3("intake-time-detail").open = false;
      $3("intake-fold").value = "";
      updateAmountHelp();
    }
    openDialog("intake", choosing ? "intake-recipe" : $3("intake-amount-row").hidden ? "intake-date" : "intake-amount");
  }
  function updateAmountHelp() {
    const u2 = $3("intake-unit").value;
    $3("intake-amount-help").textContent = u2 === "batch" ? "1 \u2014 \u0432\u0441\u0451 \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u043E\u0435 \u0431\u043B\u044E\u0434\u043E; 0,5 \u2014 \u043F\u043E\u043B\u043E\u0432\u0438\u043D\u0430 \u0432\u0441\u0435\u0433\u043E \u0431\u043B\u044E\u0434\u0430." : u2 === "portion" ? "1 \u2014 \u043E\u0434\u043D\u0430 \u043F\u043E\u0440\u0446\u0438\u044F \u0440\u0435\u0446\u0435\u043F\u0442\u0430; 0,5 \u2014 \u043F\u043E\u043B\u043E\u0432\u0438\u043D\u0430 \u043E\u0434\u043D\u043E\u0439 \u043F\u043E\u0440\u0446\u0438\u0438." : "\u041C\u0430\u0441\u0441\u0430 \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430. \u041C\u0438\u043B\u043B\u0438\u043B\u0438\u0442\u0440\u044B \u043D\u0435 \u043F\u0440\u0438\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u043A \u0433\u0440\u0430\u043C\u043C\u0430\u043C.";
  }
  $3("intake-unit").onchange = updateAmountHelp;
  function setTime(value) {
    const input = $3("intake-time");
    if (!value) {
      input.type = "text";
      input.value = "";
      input.type = "time";
    } else input.value = value;
    $3("intake-clear-time").hidden = !value;
  }
  $3("intake-time").oninput = () => {
    $3("intake-clear-time").hidden = !$3("intake-time").value;
  };
  $3("intake-clear-time").onclick = () => {
    setTime("");
    $3("intake-now").focus({ preventScroll: true });
  };
  $3("intake-zone-confirm").onclick = () => run2(async () => {
    const zone = deviceZone();
    if (!profileClock(zone)) {
      showStatus("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0447\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441 \u0432 \u043F\u0440\u043E\u0444\u0438\u043B\u0435.");
      return;
    }
    const result = await propose2("profile.update", { timezone: zone });
    zoneProposal = result?.proposal?.id || null;
  });
  $3("intake-now").onclick = () => {
    const clock = profileClock(selection?.entry?.timezone || getState()?.profile?.timezone);
    if (!clock) {
      showStatus("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0447\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441 \u0432 \u043F\u0440\u043E\u0444\u0438\u043B\u0435.");
      return;
    }
    $3("intake-date").value = clock.date;
    $3("intake-time").value = clock.time;
    $3("intake-clear-time").hidden = false;
  };
  $3("intake-close").onclick = () => closeDialog();
  $3("intake-recipe").onclick = () => setView2("recipes");
  $3("intake-product").onclick = () => setView2("products");
  $3("intake-note-choice").onclick = () => {
    setView2("diary");
    $3("diary-note-details").open = true;
    $3("diary-date").value = day || stateDay();
    $3("diary-note").focus();
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    if (submitting || !selection) return;
    run2(async () => {
      if ((selection.operation || "add") === "add" && !profileClock(getState()?.profile?.timezone)) {
        showStatus("\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0447\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441 \u043A\u043D\u043E\u043F\u043A\u043E\u0439 \u0432\u044B\u0448\u0435. \u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0438 \u0434\u0430\u0442\u0430 \u043E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F \u0432 \u0444\u043E\u0440\u043C\u0435.");
        $3("intake-zone-confirm").focus();
        return;
      }
      const values2 = { operation: selection.operation || "add" }, time = $3("intake-time").value || null;
      if (values2.operation !== "update" || $3("intake-date").value !== selection.initial?.date) values2.date = $3("intake-date").value;
      if (values2.operation !== "update" || time !== selection.initial?.time) values2.time = time;
      if (selection.origin) values2.origin = structuredClone(selection.origin);
      if (selection.generation_id) values2.generation_id = selection.generation_id;
      if (selection.entry) values2.entry_id = selection.entry.entry_id;
      else if (selection.food_id) values2.food_id = selection.food_id;
      else values2.recipe_id = selection.recipe_id;
      if (!$3("intake-amount-row").hidden) {
        const value = Number($3("intake-amount").value.trim().replace(",", "."));
        if (!Number.isFinite(value) || value <= 0) {
          showStatus("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0443\u043B\u044F.");
          return;
        }
        const amount = { value, unit: $3("intake-unit").value }, original = intakeAmount(selection.entry);
        if (values2.operation !== "update" || original?.value !== amount.value || original?.unit !== amount.unit) values2.amount = amount;
      }
      const meal = $3("intake-meal").value, note = $3("intake-note").value.trim();
      if (meal !== "legacy" && (values2.operation !== "update" || meal !== selection.initial?.meal)) values2.meal = meal;
      if (values2.operation !== "update" || note !== selection.initial?.note) values2.note = note;
      if ($3("intake-fold").value !== "") values2.time_fold = Number($3("intake-fold").value);
      const token = generation, stamp = epoch(), thread = selection.thread_id || getState().active_thread || "main";
      submitting = true;
      buttons();
      showStatus("");
      try {
        const result = await call2("keto_kitchen", { action: "intake", thread_id: thread, values: values2, expected_revision: selection.revision ?? getState().revision });
        if (stamp !== epoch()) return;
        const stillOpen = validScope(token, stamp) && $3("intake-dialog").open;
        accept2(stillOpen ? result : { ...result, proposal: null, message: "\u0417\u0430\u043F\u0438\u0441\u044C \u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u0432\u0435\u0440\u0445\u0443." });
      } catch (error) {
        if (validScope(token, stamp)) {
          showStatus(error.message);
          if (/дважды|неоднознач|двусмыслен|переход.*час|перевод.*час/i.test(error.message)) {
            $3("intake-note-options").open = true;
            $3("intake-time-detail").open = true;
          }
        }
      } finally {
        if (stamp === epoch()) {
          submitting = false;
          buttons();
        }
      }
    });
  };
  function renderSummary(summary2) {
    const box = $3("diary-summary");
    box.replaceChildren();
    box.hidden = allDates;
    summaryHelp.hidden = allDates;
    if (allDates) return;
    const overview = nutritionOverview(summary2, summaryContext || getState());
    incompleteNoteEl.textContent = overview.incompleteNote || "";
    incompleteNoteEl.hidden = !overview.incompleteNote;
    if (!summary2) return;
    if (!overview.count) return;
    const heading = el2("div", "diary-summary-heading");
    heading.append(el2("h2", "", "\u041F\u0438\u0442\u0430\u043D\u0438\u0435 \u0437\u0430 \u0434\u0435\u043D\u044C"), el2("span", "muted", "\u041F\u043E \u0437\u0430\u043F\u0438\u0441\u044F\u043C"));
    box.append(heading);
    const grid = el2("div", "diary-macros");
    for (const item of overview.cards) {
      const card = el2("article", "diary-macro " + item.icon);
      card.dataset.nutrient = item.key;
      card.dataset.status = item.tone;
      const title = el2("div", "macro-heading"), icon = el2("span", "macro-icon");
      icon.dataset.icon = item.icon;
      icon.setAttribute("aria-hidden", "true");
      title.append(icon, el2("h3", "", item.label));
      const value = el2("p", "macro-value", item.text), target = el2("p", "macro-target", item.goal ? item.goal : item.icon === "fat" ? "\u0411\u0435\u0437 \u0446\u0435\u043B\u0438" : overview.paused ? "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u043D\u0430 \u043F\u0430\u0443\u0437\u0435" : overview.stale ? "\u041D\u0443\u0436\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440" : "\u0426\u0435\u043B\u044C \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u0430");
      card.append(title, value, target);
      if (item.progress !== null) {
        const meter = el2("progress", "macro-progress");
        meter.max = 1;
        meter.value = item.progress;
        meter.setAttribute("aria-label", `${item.label}: ${item.text}; \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440 ${item.goal}`);
        card.append(meter);
      }
      const status = el2("span", "macro-status sr-only", item.status);
      card.setAttribute("aria-label", `${item.label}: ${item.text}. ${item.goal ? "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440 " + item.goal + ". " : ""}${item.status}`);
      card.append(status);
      grid.append(card);
    }
    box.append(grid);
    const note = el2("p", overview.incomplete ? "diary-summary-note" : "sr-only", overview.incomplete ? `\u041D\u0435\u043F\u043E\u043B\u043D\u044B\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439: ${overview.incomplete}. \u0423\u0447\u0442\u0435\u043D\u0430 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u0447\u0430\u0441\u0442\u044C \u0441\u043E\u0441\u0442\u0430\u0432\u0430.` : "\u0418\u0442\u043E\u0433\u0438 \u0432\u0441\u0435\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u0437\u0430 \u0434\u0435\u043D\u044C, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u0435.");
    box.append(note);
    if (overview.paused || overview.stale) box.append(el2("p", "diary-summary-note", overview.targetsNote));
    const goals = el2("button", "text-btn diary-goals", overview.stale ? "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B" : overview.agreed ? "\u0422\u0435\u043A\u0443\u0449\u0438\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B" : "\u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B");
    goals.type = "button";
    goals.setAttribute("aria-label", goals.textContent);
    goals.title = goals.textContent;
    goals.textContent = "";
    goals.classList.add("icon-only");
    goals.dataset.icon = "plan";
    goals.onclick = () => setView2(overview.agreed ? "targets" : "setup");
    heading.append(goals);
  }
  function renderRows() {
    const box = $3("diary-entries");
    box.replaceChildren();
    $3("diary-discuss").hidden = allDates || !rows.length;
    if (!rows.length && !loading && loadedKey === historyKey()) {
      const empty = el2("div", "diary-empty"), icon = el2("span", "diary-empty-icon");
      icon.dataset.icon = "plate";
      icon.setAttribute("aria-hidden", "true");
      empty.append(icon, el2("h2", "", allDates ? "\u0417\u0434\u0435\u0441\u044C \u0431\u0443\u0434\u0435\u0442 \u0432\u0430\u0448\u0430 \u0438\u0441\u0442\u043E\u0440\u0438\u044F" : "\u0427\u0442\u043E \u0431\u044B\u043B\u043E \u043D\u0430 \u0442\u0430\u0440\u0435\u043B\u043A\u0435?"), el2("p", "muted", allDates ? "\u0417\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435 \u2014 \u043E\u043D\u043E \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u0441\u043E\u0441\u0442\u0430\u0432\u043E\u043C \u0438 \u0432\u0440\u0435\u043C\u0435\u043D\u0435\u043C." : "\u0417\u0430 \u044D\u0442\u043E\u0442 \u0434\u0435\u043D\u044C \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0431\u043B\u044E\u0434\u043E \u0438\u043B\u0438 \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u2014 \u0437\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0435\u0434\u0430 \u0438 \u0438\u0442\u043E\u0433\u0438 \u0434\u043D\u044F."));
      const add = el2("button", "primary", "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0435\u0434\u0443");
      add.dataset.icon = "plus";
      add.onclick = () => open();
      empty.append(add);
      box.append(empty);
    }
    const visible = !allDates && receiptEntry?.date === day && receiptEntry.receiptRevision === historyRevision && !rows.some((entry) => entry.entry_id === receiptEntry.entry_id) ? [receiptEntry, ...rows] : rows;
    const ordered = allDates ? visible : [...visible].sort((a2, b2) => (entryClock(a2) || "99:99").localeCompare(entryClock(b2) || "99:99"));
    const groups = /* @__PURE__ */ new Map();
    for (const entry of ordered) {
      const key = [allDates ? entry.date : "", entry.meal || "other"].join("|");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }
    for (const entries of groups.values()) {
      const first = entries[0], group = el2("section", "diary-meal"), heading = el2("div", "diary-meal-heading"), icon = el2("span", "meal-icon");
      icon.dataset.icon = { breakfast: "sunrise", lunch: "sun", dinner: "moon", snack: "apple" }[first.meal] || "plate";
      icon.setAttribute("aria-hidden", "true");
      heading.append(icon, el2("h2", "", [allDates ? dayLabel(first.date) : null, MEALS[first.meal] || first.meal || "\u0411\u0435\u0437 \u043F\u0440\u0438\u0451\u043C\u0430 \u043F\u0438\u0449\u0438"].filter(Boolean).join(" \xB7 ")));
      group.append(heading);
      for (const entry of entries) {
        const card = el2("article", "diary-entry");
        card.dataset.entryId = entry.entry_id;
        if (entry.entry_id === receiptEntry?.entry_id) card.classList.add("just-saved");
        const clock = entryClock(entry), meta = el2("p", "diary-entry-meta", clock || "\u0412\u0440\u0435\u043C\u044F \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E");
        meta.dataset.icon = "clock";
        const title = el2("div", "diary-entry-title");
        title.append(el2("h3", "", intakeName(entry)), meta);
        card.append(title);
        const amount = intakeAmount(entry);
        if (amount) card.append(el2("p", "", amountLabel(amount)));
        if (entry.note && entry.note !== intakeName(entry)) card.append(el2("p", "muted", entry.note));
        const calc = entry.calculation || entry.nutrition_snapshot?.calculation;
        if (calc?.nutrition) {
          const nutrients = el2("div", "entry-nutrients");
          for (const [key, label, unit] of NUTRIENTS.slice(0, 4)) {
            const value = calc.nutrition[key], complete = value != null && calc.coverage?.[key]?.complete !== false;
            nutrients.append(el2("span", "", `${key === "energy_kcal" ? "" : label + " "}${complete ? number(value, key === "energy_kcal" ? 0 : 1) + " " + unit : "\u2014"}`));
          }
          card.append(nutrients);
        }
        if (!entry.complete) card.append(el2("p", "entry-coverage", "\u0421\u043E\u0441\u0442\u0430\u0432 \u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D \u043D\u0435 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E"));
        if (entry.legacy_estimate) card.append(el2("p", "muted", "\u0421\u043E\u0441\u0442\u0430\u0432 \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u043D \u043F\u043E \u0442\u0435\u043A\u0443\u0449\u0435\u043C\u0443 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0443."));
        const actions = el2("div", "diary-actions");
        for (const [label, operation] of [["\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C", "update"], ["\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C", "repeat"]]) {
          const b2 = el2("button", "text-btn", label);
          b2.type = "button";
          if (operation === "repeat") {
            b2.title = "\u041E\u0442\u043A\u0440\u043E\u0435\u0442\u0441\u044F \u043D\u043E\u0432\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C \u0441 \u044D\u0442\u0438\u043C \u0431\u043B\u044E\u0434\u043E\u043C \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0438 \u0434\u0430\u0442\u0443";
            b2.setAttribute("aria-description", b2.title);
          }
          b2.onclick = () => open({ operation, entry, revision: historyRevision });
          actions.append(b2);
        }
        const more = el2("details", "diary-entry-more"), toggle = el2("summary", "icon-only");
        toggle.dataset.icon = "more";
        toggle.setAttribute("aria-label", "\u0415\u0449\u0451: " + intakeName(entry));
        more.append(toggle);
        const del = el2("button", "text-btn danger-button", "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C");
        del.type = "button";
        del.onclick = () => run2(() => propose2("diary.delete", { entry_id: entry.entry_id }, historyRevision));
        more.append(del);
        actions.append(more);
        card.append(actions);
        group.append(card);
      }
      box.append(group);
    }
    $3("diary-more").hidden = !hasMore;
    $3("diary-more").disabled = loading;
  }
  async function load(append = false) {
    if (!getState()?.profile?.consent?.storage || !getState()?.profile?.consent?.health_data) return;
    if (!day) day = stateDay();
    const token = ++historyGeneration, stamp = epoch(), key = historyKey(), current = () => token === historyGeneration && stamp === epoch(), values2 = { offset: append ? nextOffset : 0, limit: 30 };
    if (!allDates) values2.date = day;
    const args = { action: "diary_history", values: values2 };
    if (append) args.expected_revision = historyRevision;
    loading = true;
    loadingKey = key;
    $3("diary-status").textContent = "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u0437\u0430\u043F\u0438\u0441\u0438\u2026";
    $3("diary-more").disabled = true;
    if (!append && displayKey !== [day, allDates].join("|")) {
      rows = [];
      hasMore = false;
      summary = null;
      displayKey = [day, allDates].join("|");
      renderSummary(null);
      renderRows();
    }
    try {
      const result = await call2("keto_kitchen", args);
      if (!current()) return;
      if (receiptEntry && result.revision < historyRevision) throw Error("\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0435\u0449\u0451 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u0442\u0441\u044F. \u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435.");
      $3("diary-refresh").hidden = true;
      rows = [...new Map((append ? [...rows, ...result.entries] : result.entries).map((entry) => [entry.entry_id, entry])).values()];
      historyRevision = result.revision;
      loadedKey = key;
      hasMore = result.has_more;
      nextOffset = (result.offset || 0) + result.entries.length;
      loading = false;
      summary = result.summary;
      summaryContext = result.nutrition_context || (result.revision === getState()?.revision ? null : { profile: {} });
      renderSummary(summary);
      renderRows();
      $3("diary-status").textContent = allDates && rows.length ? `\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u043E ${rows.length} \u0438\u0437 ${result.total}` : "";
    } catch (error) {
      if (!current()) return;
      loading = false;
      loadedKey = null;
      hasMore = false;
      $3("diary-status").textContent = (rows.length ? "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u0442\u043E\u0440\u0438\u044E. \u041F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u0443\u0436\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043D\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438. " : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u0438. ") + error.message;
      renderRows();
      $3("diary-more").hidden = true;
      $3("diary-refresh").hidden = false;
    } finally {
      if (current()) {
        loading = false;
        loadingKey = null;
        if ($3("diary-status").textContent.startsWith("\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C")) $3("diary-status").textContent = "";
      }
    }
  }
  function historyKey() {
    return [day, allDates, getState()?.revision].join("|");
  }
  function render() {
    ensureNavigation();
    if (summaryContext && getState()?.revision > historyRevision) summaryContext = null;
    if (!day) day = stateDay();
    $3("diary-day").value = day;
    $3("diary-day-label").textContent = dayLabel(day);
    $3("diary-all").textContent = allDates ? "\u041A \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C\u0443 \u0434\u043D\u044E" : "\u0412\u0441\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044F";
    $3("diary-day-controls").hidden = allDates;
    const zone = getState()?.profile?.timezone;
    $3("diary-zone-note").textContent = [profileClock(zone) ? `\u0414\u0435\u043D\u044C \u0434\u043D\u0435\u0432\u043D\u0438\u043A\u0430 \u2014 \u043F\u043E \u0447\u0430\u0441\u043E\u0432\u043E\u043C\u0443 \u043F\u043E\u044F\u0441\u0443 \u043F\u0440\u043E\u0444\u0438\u043B\u044F: ${zone}.` : "\u0414\u0430\u0442\u0430 \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u2014 \u043F\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430.", allDates ? "\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u0437\u0430\u043F\u0438\u0441\u0438 \u0437\u0430 \u0440\u0430\u0437\u043D\u044B\u0435 \u0434\u0430\u0442\u044B. \u0414\u043D\u0435\u0432\u043D\u044B\u0435 \u0438\u0442\u043E\u0433\u0438 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u043F\u0440\u0438 \u0432\u044B\u0431\u043E\u0440\u0435 \u043E\u0434\u043D\u043E\u0433\u043E \u0434\u043D\u044F." : ""].filter(Boolean).join(" ");
    if (!loading && $3("diary-status").textContent.startsWith("\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C")) $3("diary-status").textContent = "";
    renderSummary(displayKey === [day, allDates].join("|") ? summary : null);
    if (isDiaryActive() && loadedKey !== historyKey() && (!loading || loadingKey !== historyKey())) run2(() => load());
  }
  function selectDate(next) {
    if (!validDiaryDay(next)) {
      render();
      return;
    }
    day = next;
    allDates = false;
    loadedKey = null;
    rememberNavigation();
    $3("diary-receipt").hidden = receiptEntry?.date !== day;
    render();
    if (!isDiaryActive()) setView2("diary");
  }
  $3("diary-day").onchange = () => selectDate($3("diary-day").value);
  for (const [id, delta] of [["diary-prev", -1], ["diary-next", 1]]) $3(id).onclick = () => {
    if (!day) return;
    const d2 = /* @__PURE__ */ new Date(day + "T12:00:00Z");
    d2.setUTCDate(d2.getUTCDate() + delta);
    selectDate(d2.toISOString().slice(0, 10));
  };
  $3("diary-today").onclick = () => selectDate(stateDay());
  $3("diary-all").onclick = () => {
    allDates = !allDates;
    loadedKey = null;
    rememberNavigation();
    $3("diary-receipt").hidden = true;
    render();
  };
  $3("diary-more").onclick = () => run2(() => load(true));
  $3("diary-refresh").onclick = () => {
    $3("diary-refresh").hidden = true;
    run2(() => load());
  };
  $3("diary-add").onclick = () => open();
  $3("diary-discuss").onclick = () => {
    setView2("chat");
    const input = $3("message");
    input.value = (input.value.trim() ? input.value.trim() + "\n\n" : "") + `\u041E\u0431\u0441\u0443\u0434\u0438\u043C \u043C\u043E\u0439 \u0434\u043D\u0435\u0432\u043D\u0438\u043A \u0437\u0430 ${day}: \u0447\u0442\u043E \u0443\u0436\u0435 \u0441\u044A\u0435\u0434\u0435\u043D\u043E, \u043A\u0430\u043A \u044D\u0442\u043E \u0441\u043E\u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u0441 \u043C\u043E\u0438\u043C\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u043C\u0438 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u0430\u043C\u0438 \u0438 \u0447\u0442\u043E \u0443\u0447\u0435\u0441\u0442\u044C \u043F\u0440\u0438 \u0432\u044B\u0431\u043E\u0440\u0435 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0433\u043E \u043F\u0440\u0438\u0451\u043C\u0430 \u043F\u0438\u0449\u0438?`;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  };
  function afterApplied(result) {
    if (zoneProposal && result?.state && !result.state.pending?.some((p) => p.id === zoneProposal)) {
      zoneProposal = null;
      if (selection) {
        selection.revision = result.state.revision;
        zoneControls();
        if (selection.generation_id && result.receipt?.type === "profile.update") {
          $3("intake-choice").hidden = false;
          form.hidden = true;
          $3("intake-name").textContent = "\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D. \u041F\u043E\u0434\u0431\u043E\u0440 \u043E\u0431\u043D\u043E\u0432\u0438\u043B\u0441\u044F \u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0431\u043B\u044E\u0434\u043E \u0437\u0430\u043D\u043E\u0432\u043E.";
          selection = null;
          openDialog("intake", "intake-recipe");
        } else openDialog("intake", "intake-date");
      }
    }
    if (!result?.receipt) return;
    summaryContext = null;
    loadedKey = null;
    if (result.receipt.type === "diary.delete") {
      $3("diary-receipt").hidden = true;
      receiptEntry = null;
      historyGeneration++;
      loading = false;
      rows = rows.filter((entry) => entry.entry_id !== result.deleted_entry_id);
      historyRevision = result.receipt.revision;
      if (result.diary_summary?.date === day) summary = result.diary_summary;
      else summary = null;
      renderSummary(summary);
      renderRows();
    }
    if (result.entry) {
      historyGeneration++;
      loading = false;
      receiptEntry = { ...result.entry, receiptRevision: result.receipt.revision };
      day = result.entry.date;
      allDates = false;
      rememberNavigation();
      rows = [result.entry, ...rows.filter((entry) => entry.date === day && entry.entry_id !== result.entry.entry_id)];
      historyRevision = result.receipt.revision;
      summary = result.diary_summary;
      displayKey = [day, allDates].join("|");
      hasMore = false;
      renderSummary(summary);
      renderRows();
      const box = $3("diary-receipt");
      box.hidden = false;
      const text = el2("p", "receipt-heading");
      text.append(savedCheck(el2), el2("span", "", "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A\u0435 \xB7 " + dayLabel(day)));
      box.replaceChildren(text, el2("p", "receipt-food", intakeName(result.entry) + " \xB7 " + amountLabel(intakeAmount(result.entry))));
      setView2("diary", { resetScroll: true });
      $3("content").scrollTop = 0;
    }
    render();
  }
  function reset() {
    generation++;
    historyGeneration++;
    navigation?.clear();
    navigation = null;
    navigationAccount = null;
    zoneProposal = null;
    selection = null;
    submitting = false;
    day = "";
    allDates = false;
    rows = [];
    summary = null;
    summaryContext = null;
    displayKey = null;
    historyRevision = null;
    loadedKey = null;
    loadingKey = null;
    loading = false;
    hasMore = false;
    receiptEntry = null;
    form.reset();
    showStatus("");
    $3("intake-name").textContent = "";
    $3("intake-zone").textContent = "";
    $3("diary-summary").replaceChildren();
    incompleteNoteEl.textContent = "";
    incompleteNoteEl.hidden = true;
    netGuide.open = false;
    summaryHelp.hidden = true;
    $3("diary-receipt").replaceChildren();
    $3("diary-receipt").hidden = true;
    $3("diary-status").textContent = "";
    $3("diary-day").value = "";
    $3("diary-more").hidden = true;
    $3("diary-discuss").hidden = true;
    buttons();
  }
  return { open, render, afterApplied, reset, selectDate, reload: () => load(), get selectedDate() {
    return day;
  } };
}

// cloudflare-saas/vendor/firebase-13.2.0/firebase-app.js
/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var getDefaultsFromPostinstall = () => void 0;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var stringToByteArray$1 = function(str) {
  const out = [];
  let p = 0;
  for (let i = 0; i < str.length; i++) {
    let c2 = str.charCodeAt(i);
    if (c2 < 128) {
      out[p++] = c2;
    } else if (c2 < 2048) {
      out[p++] = c2 >> 6 | 192;
      out[p++] = c2 & 63 | 128;
    } else if ((c2 & 64512) === 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) === 56320) {
      c2 = 65536 + ((c2 & 1023) << 10) + (str.charCodeAt(++i) & 1023);
      out[p++] = c2 >> 18 | 240;
      out[p++] = c2 >> 12 & 63 | 128;
      out[p++] = c2 >> 6 & 63 | 128;
      out[p++] = c2 & 63 | 128;
    } else {
      out[p++] = c2 >> 12 | 224;
      out[p++] = c2 >> 6 & 63 | 128;
      out[p++] = c2 & 63 | 128;
    }
  }
  return out;
};
var byteArrayToString = function(bytes) {
  const out = [];
  let pos = 0, c2 = 0;
  while (pos < bytes.length) {
    const c1 = bytes[pos++];
    if (c1 < 128) {
      out[c2++] = String.fromCharCode(c1);
    } else if (c1 > 191 && c1 < 224) {
      const c22 = bytes[pos++];
      out[c2++] = String.fromCharCode((c1 & 31) << 6 | c22 & 63);
    } else if (c1 > 239 && c1 < 365) {
      const c22 = bytes[pos++];
      const c3 = bytes[pos++];
      const c4 = bytes[pos++];
      const u2 = ((c1 & 7) << 18 | (c22 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 65536;
      out[c2++] = String.fromCharCode(55296 + (u2 >> 10));
      out[c2++] = String.fromCharCode(56320 + (u2 & 1023));
    } else {
      const c22 = bytes[pos++];
      const c3 = bytes[pos++];
      out[c2++] = String.fromCharCode((c1 & 15) << 12 | (c22 & 63) << 6 | c3 & 63);
    }
  }
  return out.join("");
};
var base64 = {
  /**
   * Maps bytes to characters.
   */
  byteToCharMap_: null,
  /**
   * Maps characters to bytes.
   */
  charToByteMap_: null,
  /**
   * Maps bytes to websafe characters.
   * @private
   */
  byteToCharMapWebSafe_: null,
  /**
   * Maps websafe characters to bytes.
   * @private
   */
  charToByteMapWebSafe_: null,
  /**
   * Our default alphabet, shared between
   * ENCODED_VALS and ENCODED_VALS_WEBSAFE
   */
  ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  /**
   * Our default alphabet. Value 64 (=) is special; it means "nothing."
   */
  get ENCODED_VALS() {
    return this.ENCODED_VALS_BASE + "+/=";
  },
  /**
   * Our websafe alphabet.
   */
  get ENCODED_VALS_WEBSAFE() {
    return this.ENCODED_VALS_BASE + "-_.";
  },
  /**
   * Whether this browser supports the atob and btoa functions. This extension
   * started at Mozilla but is now implemented by many browsers. We use the
   * ASSUME_* variables to avoid pulling in the full useragent detection library
   * but still allowing the standard per-browser compilations.
   *
   */
  HAS_NATIVE_SUPPORT: typeof atob === "function",
  /**
   * Base64-encode an array of bytes.
   *
   * @param input An array of bytes (numbers with
   *     value in [0, 255]) to encode.
   * @param webSafe Boolean indicating we should use the
   *     alternative alphabet.
   * @return The base64 encoded string.
   */
  encodeByteArray(input, webSafe) {
    if (!Array.isArray(input)) {
      throw Error("encodeByteArray takes an array as a parameter");
    }
    this.init_();
    const byteToCharMap = webSafe ? this.byteToCharMapWebSafe_ : this.byteToCharMap_;
    const output = [];
    for (let i = 0; i < input.length; i += 3) {
      const byte1 = input[i];
      const haveByte2 = i + 1 < input.length;
      const byte2 = haveByte2 ? input[i + 1] : 0;
      const haveByte3 = i + 2 < input.length;
      const byte3 = haveByte3 ? input[i + 2] : 0;
      const outByte1 = byte1 >> 2;
      const outByte2 = (byte1 & 3) << 4 | byte2 >> 4;
      let outByte3 = (byte2 & 15) << 2 | byte3 >> 6;
      let outByte4 = byte3 & 63;
      if (!haveByte3) {
        outByte4 = 64;
        if (!haveByte2) {
          outByte3 = 64;
        }
      }
      output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
    }
    return output.join("");
  },
  /**
   * Base64-encode a string.
   *
   * @param input A string to encode.
   * @param webSafe If true, we should use the
   *     alternative alphabet.
   * @return The base64 encoded string.
   */
  encodeString(input, webSafe) {
    if (this.HAS_NATIVE_SUPPORT && !webSafe) {
      return btoa(input);
    }
    return this.encodeByteArray(stringToByteArray$1(input), webSafe);
  },
  /**
   * Base64-decode a string.
   *
   * @param input to decode.
   * @param webSafe True if we should use the
   *     alternative alphabet.
   * @return string representing the decoded value.
   */
  decodeString(input, webSafe) {
    if (this.HAS_NATIVE_SUPPORT && !webSafe) {
      return atob(input);
    }
    return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
  },
  /**
   * Base64-decode a string.
   *
   * In base-64 decoding, groups of four characters are converted into three
   * bytes.  If the encoder did not apply padding, the input length may not
   * be a multiple of 4.
   *
   * In this case, the last group will have fewer than 4 characters, and
   * padding will be inferred.  If the group has one or two characters, it decodes
   * to one byte.  If the group has three characters, it decodes to two bytes.
   *
   * @param input Input to decode.
   * @param webSafe True if we should use the web-safe alphabet.
   * @return bytes representing the decoded value.
   */
  decodeStringToByteArray(input, webSafe) {
    this.init_();
    const charToByteMap = webSafe ? this.charToByteMapWebSafe_ : this.charToByteMap_;
    const output = [];
    for (let i = 0; i < input.length; ) {
      const byte1 = charToByteMap[input.charAt(i++)];
      const haveByte2 = i < input.length;
      const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
      ++i;
      const haveByte3 = i < input.length;
      const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
      ++i;
      const haveByte4 = i < input.length;
      const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
      ++i;
      if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
        throw new DecodeBase64StringError();
      }
      const outByte1 = byte1 << 2 | byte2 >> 4;
      output.push(outByte1);
      if (byte3 !== 64) {
        const outByte2 = byte2 << 4 & 240 | byte3 >> 2;
        output.push(outByte2);
        if (byte4 !== 64) {
          const outByte3 = byte3 << 6 & 192 | byte4;
          output.push(outByte3);
        }
      }
    }
    return output;
  },
  /**
   * Lazy static initialization function. Called before
   * accessing any of the static map variables.
   * @private
   */
  init_() {
    if (!this.byteToCharMap_) {
      this.byteToCharMap_ = {};
      this.charToByteMap_ = {};
      this.byteToCharMapWebSafe_ = {};
      this.charToByteMapWebSafe_ = {};
      for (let i = 0; i < this.ENCODED_VALS.length; i++) {
        this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
        this.charToByteMap_[this.byteToCharMap_[i]] = i;
        this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
        this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
        if (i >= this.ENCODED_VALS_BASE.length) {
          this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
          this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
        }
      }
    }
  }
};
var DecodeBase64StringError = class extends Error {
  constructor() {
    super(...arguments);
    this.name = "DecodeBase64StringError";
  }
};
var base64Encode = function(str) {
  const utf8Bytes = stringToByteArray$1(str);
  return base64.encodeByteArray(utf8Bytes, true);
};
var base64urlEncodeWithoutPadding = function(str) {
  return base64Encode(str).replace(/\./g, "");
};
var base64Decode = function(str) {
  try {
    return base64.decodeString(str, true);
  } catch (e) {
    console.error("base64Decode failed: ", e);
  }
  return null;
};
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function getGlobal() {
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw new Error("Unable to locate global object.");
}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
var getDefaultsFromEnvVariable = () => {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return;
  }
  const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
  if (defaultsJsonString) {
    return JSON.parse(defaultsJsonString);
  }
};
var getDefaultsFromCookie = () => {
  if (typeof document === "undefined") {
    return;
  }
  let match;
  try {
    match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
  } catch (e) {
    return;
  }
  const decoded = match && base64Decode(match[1]);
  return decoded && JSON.parse(decoded);
};
var getDefaults = () => {
  try {
    return getDefaultsFromPostinstall() || getDefaultsFromGlobal() || getDefaultsFromEnvVariable() || getDefaultsFromCookie();
  } catch (e) {
    console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
    return;
  }
};
var getDefaultAppConfig = () => getDefaults()?.config;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Deferred = class {
  constructor() {
    this.reject = () => {
    };
    this.resolve = () => {
    };
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  /**
   * Our API internals are not promisified and cannot because our callback APIs have subtle expectations around
   * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
   * and returns a node-style callback which will resolve or reject the Deferred's promise.
   */
  wrapCallback(callback) {
    return (error, value) => {
      if (error) {
        this.reject(error);
      } else {
        this.resolve(value);
      }
      if (typeof callback === "function") {
        this.promise.catch(() => {
        });
        if (callback.length === 1) {
          callback(error);
        } else {
          callback(error, value);
        }
      }
    };
  }
};
function isIndexedDBAvailable() {
  try {
    return typeof indexedDB === "object";
  } catch (e) {
    return false;
  }
}
function validateIndexedDBOpenable() {
  return new Promise((resolve, reject) => {
    try {
      let preExist = true;
      const DB_CHECK_NAME = "validate-browser-context-for-indexeddb-analytics-module";
      const request = self.indexedDB.open(DB_CHECK_NAME);
      request.onsuccess = () => {
        request.result.close();
        if (!preExist) {
          self.indexedDB.deleteDatabase(DB_CHECK_NAME);
        }
        resolve(true);
      };
      request.onupgradeneeded = () => {
        preExist = false;
      };
      request.onerror = () => {
        reject(request.error?.message || "");
      };
    } catch (error) {
      reject(error);
    }
  });
}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var ERROR_NAME = "FirebaseError";
var FirebaseError = class _FirebaseError extends Error {
  constructor(code, message, customData) {
    super(message);
    this.code = code;
    this.customData = customData;
    this.name = ERROR_NAME;
    Object.setPrototypeOf(this, _FirebaseError.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorFactory.prototype.create);
    }
  }
};
var ErrorFactory = class {
  constructor(service, serviceName, errors) {
    this.service = service;
    this.serviceName = serviceName;
    this.errors = errors;
  }
  create(code, ...data) {
    const customData = data[0] || {};
    const fullCode = `${this.service}/${code}`;
    const template = this.errors[code];
    const message = template ? replaceTemplate(template, customData) : "Error";
    const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
    const error = new FirebaseError(fullCode, fullMessage, customData);
    return error;
  }
};
function replaceTemplate(template, data) {
  try {
    let ptr = 0;
    let result = "";
    while (ptr < template.length) {
      const start2 = template.indexOf("{$", ptr);
      if (start2 === -1) {
        result += template.substring(ptr);
        break;
      }
      const end = template.indexOf("}", start2 + 2);
      if (end === -1) {
        result += template.substring(ptr);
        break;
      }
      const key = template.substring(start2 + 2, end);
      const value = data[key];
      result += template.substring(ptr, start2) + (value != null ? String(value) : `<${key}?>`);
      ptr = end + 1;
    }
    return result;
  } catch (e) {
    return template;
  }
}
function deepEqual(a2, b2) {
  if (a2 === b2) {
    return true;
  }
  const aKeys = Object.keys(a2);
  const bKeys = Object.keys(b2);
  for (const k of aKeys) {
    if (!bKeys.includes(k)) {
      return false;
    }
    const aProp = a2[k];
    const bProp = b2[k];
    if (isObject(aProp) && isObject(bProp)) {
      if (!deepEqual(aProp, bProp)) {
        return false;
      }
    } else if (aProp !== bProp) {
      return false;
    }
  }
  for (const k of bKeys) {
    if (!aKeys.includes(k)) {
      return false;
    }
  }
  return true;
}
function isObject(thing) {
  return thing !== null && typeof thing === "object";
}
var Component = class {
  /**
   *
   * @param name The public service name, e.g. app, auth, firestore, database
   * @param instanceFactory Service factory responsible for creating the public interface
   * @param type whether the service provided by the component is public or private
   */
  constructor(name2, instanceFactory, type) {
    this.name = name2;
    this.instanceFactory = instanceFactory;
    this.type = type;
    this.multipleInstances = false;
    this.serviceProps = {};
    this.instantiationMode = "LAZY";
    this.onInstanceCreated = null;
  }
  setInstantiationMode(mode) {
    this.instantiationMode = mode;
    return this;
  }
  setMultipleInstances(multipleInstances) {
    this.multipleInstances = multipleInstances;
    return this;
  }
  setServiceProps(props) {
    this.serviceProps = props;
    return this;
  }
  setInstanceCreatedCallback(callback) {
    this.onInstanceCreated = callback;
    return this;
  }
};
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DEFAULT_ENTRY_NAME$1 = "[DEFAULT]";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Provider = class {
  constructor(name2, container) {
    this.name = name2;
    this.container = container;
    this.component = null;
    this.instances = /* @__PURE__ */ new Map();
    this.instancesDeferred = /* @__PURE__ */ new Map();
    this.instancesOptions = /* @__PURE__ */ new Map();
    this.onInitCallbacks = /* @__PURE__ */ new Map();
  }
  /**
   * @param identifier A provider can provide multiple instances of a service
   * if this.component.multipleInstances is true.
   */
  get(identifier) {
    const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
    if (!this.instancesDeferred.has(normalizedIdentifier)) {
      const deferred = new Deferred();
      this.instancesDeferred.set(normalizedIdentifier, deferred);
      if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
        try {
          const instance = this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
          if (instance) {
            deferred.resolve(instance);
          }
        } catch (e) {
        }
      }
    }
    return this.instancesDeferred.get(normalizedIdentifier).promise;
  }
  getImmediate(options) {
    const normalizedIdentifier = this.normalizeInstanceIdentifier(options?.identifier);
    const optional = options?.optional ?? false;
    if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
      try {
        return this.getOrInitializeService({
          instanceIdentifier: normalizedIdentifier
        });
      } catch (e) {
        if (optional) {
          return null;
        } else {
          throw e;
        }
      }
    } else {
      if (optional) {
        return null;
      } else {
        throw Error(`Service ${this.name} is not available`);
      }
    }
  }
  getComponent() {
    return this.component;
  }
  setComponent(component) {
    if (component.name !== this.name) {
      throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
    }
    if (this.component) {
      throw Error(`Component for ${this.name} has already been provided`);
    }
    this.component = component;
    if (!this.shouldAutoInitialize()) {
      return;
    }
    if (isComponentEager(component)) {
      try {
        this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME$1 });
      } catch (e) {
      }
    }
    for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
      const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
      try {
        const instance = this.getOrInitializeService({
          instanceIdentifier: normalizedIdentifier
        });
        instanceDeferred.resolve(instance);
      } catch (e) {
      }
    }
  }
  clearInstance(identifier = DEFAULT_ENTRY_NAME$1) {
    this.instancesDeferred.delete(identifier);
    this.instancesOptions.delete(identifier);
    this.instances.delete(identifier);
  }
  // app.delete() will call this method on every provider to delete the services
  // TODO: should we mark the provider as deleted?
  async delete() {
    const services = Array.from(this.instances.values());
    await Promise.all([
      ...services.filter((service) => "INTERNAL" in service).map((service) => service.INTERNAL.delete()),
      ...services.filter((service) => "_delete" in service).map((service) => service._delete())
    ]);
  }
  isComponentSet() {
    return this.component != null;
  }
  isInitialized(identifier = DEFAULT_ENTRY_NAME$1) {
    return this.instances.has(identifier);
  }
  getOptions(identifier = DEFAULT_ENTRY_NAME$1) {
    return this.instancesOptions.get(identifier) || {};
  }
  initialize(opts = {}) {
    const { options = {} } = opts;
    const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
    if (this.isInitialized(normalizedIdentifier)) {
      throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
    }
    if (!this.isComponentSet()) {
      throw Error(`Component ${this.name} has not been registered yet`);
    }
    const instance = this.getOrInitializeService({
      instanceIdentifier: normalizedIdentifier,
      options
    });
    for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
      const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
      if (normalizedIdentifier === normalizedDeferredIdentifier) {
        instanceDeferred.resolve(instance);
      }
    }
    return instance;
  }
  /**
   *
   * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
   * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
   *
   * @param identifier An optional instance identifier
   * @returns a function to unregister the callback
   */
  onInit(callback, identifier) {
    const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
    const existingCallbacks = this.onInitCallbacks.get(normalizedIdentifier) ?? /* @__PURE__ */ new Set();
    existingCallbacks.add(callback);
    this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
    const existingInstance = this.instances.get(normalizedIdentifier);
    if (existingInstance) {
      callback(existingInstance, normalizedIdentifier);
    }
    return () => {
      existingCallbacks.delete(callback);
    };
  }
  /**
   * Invoke onInit callbacks synchronously
   * @param instance the service instance`
   */
  invokeOnInitCallbacks(instance, identifier) {
    const callbacks = this.onInitCallbacks.get(identifier);
    if (!callbacks) {
      return;
    }
    for (const callback of callbacks) {
      try {
        callback(instance, identifier);
      } catch {
      }
    }
  }
  getOrInitializeService({ instanceIdentifier, options = {} }) {
    let instance = this.instances.get(instanceIdentifier);
    if (!instance && this.component) {
      instance = this.component.instanceFactory(this.container, {
        instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
        options
      });
      this.instances.set(instanceIdentifier, instance);
      this.instancesOptions.set(instanceIdentifier, options);
      this.invokeOnInitCallbacks(instance, instanceIdentifier);
      if (this.component.onInstanceCreated) {
        try {
          this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
        } catch {
        }
      }
    }
    return instance || null;
  }
  normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME$1) {
    if (this.component) {
      return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME$1;
    } else {
      return identifier;
    }
  }
  shouldAutoInitialize() {
    return !!this.component && this.component.instantiationMode !== "EXPLICIT";
  }
};
function normalizeIdentifierForFactory(identifier) {
  return identifier === DEFAULT_ENTRY_NAME$1 ? void 0 : identifier;
}
function isComponentEager(component) {
  return component.instantiationMode === "EAGER";
}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var ComponentContainer = class {
  constructor(name2) {
    this.name = name2;
    this.providers = /* @__PURE__ */ new Map();
  }
  /**
   *
   * @param component Component being added
   * @param overwrite When a component with the same name has already been registered,
   * if overwrite is true: overwrite the existing component with the new component and create a new
   * provider with the new component. It can be useful in tests where you want to use different mocks
   * for different tests.
   * if overwrite is false: throw an exception
   */
  addComponent(component) {
    const provider = this.getProvider(component.name);
    if (provider.isComponentSet()) {
      throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
    }
    provider.setComponent(component);
  }
  addOrOverwriteComponent(component) {
    const provider = this.getProvider(component.name);
    if (provider.isComponentSet()) {
      this.providers.delete(component.name);
    }
    this.addComponent(component);
  }
  /**
   * getProvider provides a type safe interface where it can only be called with a field name
   * present in NameServiceMapping interface.
   *
   * Firebase SDKs providing services should extend NameServiceMapping interface to register
   * themselves.
   */
  getProvider(name2) {
    if (this.providers.has(name2)) {
      return this.providers.get(name2);
    }
    const provider = new Provider(name2, this);
    this.providers.set(name2, provider);
    return provider;
  }
  getProviders() {
    return Array.from(this.providers.values());
  }
};
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var InstantiationMode;
(function(InstantiationMode2) {
  InstantiationMode2["LAZY"] = "LAZY";
  InstantiationMode2["EAGER"] = "EAGER";
  InstantiationMode2["EXPLICIT"] = "EXPLICIT";
})(InstantiationMode || (InstantiationMode = {}));
var ComponentType;
(function(ComponentType2) {
  ComponentType2["PUBLIC"] = "PUBLIC";
  ComponentType2["PRIVATE"] = "PRIVATE";
  ComponentType2["VERSION"] = "VERSION";
})(ComponentType || (ComponentType = {}));
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var instances = [];
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
  LogLevel2[LogLevel2["VERBOSE"] = 1] = "VERBOSE";
  LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
  LogLevel2[LogLevel2["SILENT"] = 5] = "SILENT";
})(LogLevel || (LogLevel = {}));
var levelStringToEnum = {
  "debug": LogLevel.DEBUG,
  "verbose": LogLevel.VERBOSE,
  "info": LogLevel.INFO,
  "warn": LogLevel.WARN,
  "error": LogLevel.ERROR,
  "silent": LogLevel.SILENT
};
var defaultLogLevel = LogLevel.INFO;
var ConsoleMethod = {
  [LogLevel.DEBUG]: "log",
  [LogLevel.VERBOSE]: "log",
  [LogLevel.INFO]: "info",
  [LogLevel.WARN]: "warn",
  [LogLevel.ERROR]: "error"
};
var defaultLogHandler = (instance, logType, ...args) => {
  if (logType < instance.logLevel) {
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const method = ConsoleMethod[logType];
  if (method) {
    console[method](`[${now}]  ${instance.name}:`, ...args);
  } else {
    throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
  }
};
var Logger = class {
  /**
   * Gives you an instance of a Logger to capture messages according to
   * Firebase's logging scheme.
   *
   * @param name The name that the logs will be associated with
   */
  constructor(name2) {
    this.name = name2;
    this._logLevel = defaultLogLevel;
    this._logHandler = defaultLogHandler;
    this._userLogHandler = null;
    instances.push(this);
  }
  get logLevel() {
    return this._logLevel;
  }
  set logLevel(val) {
    if (!(val in LogLevel)) {
      throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
    }
    this._logLevel = val;
  }
  // Workaround for setter/getter having to be the same type.
  setLogLevel(val) {
    this._logLevel = typeof val === "string" ? levelStringToEnum[val] : val;
  }
  get logHandler() {
    return this._logHandler;
  }
  set logHandler(val) {
    if (typeof val !== "function") {
      throw new TypeError("Value assigned to `logHandler` must be a function");
    }
    this._logHandler = val;
  }
  get userLogHandler() {
    return this._userLogHandler;
  }
  set userLogHandler(val) {
    this._userLogHandler = val;
  }
  /**
   * The functions below are all based on the `console` interface
   */
  debug(...args) {
    this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
    this._logHandler(this, LogLevel.DEBUG, ...args);
  }
  log(...args) {
    this._userLogHandler && this._userLogHandler(this, LogLevel.VERBOSE, ...args);
    this._logHandler(this, LogLevel.VERBOSE, ...args);
  }
  info(...args) {
    this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
    this._logHandler(this, LogLevel.INFO, ...args);
  }
  warn(...args) {
    this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
    this._logHandler(this, LogLevel.WARN, ...args);
  }
  error(...args) {
    this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
    this._logHandler(this, LogLevel.ERROR, ...args);
  }
};
var instanceOfAny = (object, constructors) => constructors.some((c2) => object instanceof c2);
var idbProxyableTypes;
var cursorAdvanceMethods;
function getIdbProxyableTypes() {
  return idbProxyableTypes || (idbProxyableTypes = [
    IDBDatabase,
    IDBObjectStore,
    IDBIndex,
    IDBCursor,
    IDBTransaction
  ]);
}
function getCursorAdvanceMethods() {
  return cursorAdvanceMethods || (cursorAdvanceMethods = [
    IDBCursor.prototype.advance,
    IDBCursor.prototype.continue,
    IDBCursor.prototype.continuePrimaryKey
  ]);
}
var cursorRequestMap = /* @__PURE__ */ new WeakMap();
var transactionDoneMap = /* @__PURE__ */ new WeakMap();
var transactionStoreNamesMap = /* @__PURE__ */ new WeakMap();
var transformCache = /* @__PURE__ */ new WeakMap();
var reverseTransformCache = /* @__PURE__ */ new WeakMap();
function promisifyRequest(request) {
  const promise = new Promise((resolve, reject) => {
    const unlisten = () => {
      request.removeEventListener("success", success);
      request.removeEventListener("error", error);
    };
    const success = () => {
      resolve(wrap(request.result));
      unlisten();
    };
    const error = () => {
      reject(request.error);
      unlisten();
    };
    request.addEventListener("success", success);
    request.addEventListener("error", error);
  });
  promise.then((value) => {
    if (value instanceof IDBCursor) {
      cursorRequestMap.set(value, request);
    }
  }).catch(() => {
  });
  reverseTransformCache.set(promise, request);
  return promise;
}
function cacheDonePromiseForTransaction(tx) {
  if (transactionDoneMap.has(tx))
    return;
  const done = new Promise((resolve, reject) => {
    const unlisten = () => {
      tx.removeEventListener("complete", complete);
      tx.removeEventListener("error", error);
      tx.removeEventListener("abort", error);
    };
    const complete = () => {
      resolve();
      unlisten();
    };
    const error = () => {
      reject(tx.error || new DOMException("AbortError", "AbortError"));
      unlisten();
    };
    tx.addEventListener("complete", complete);
    tx.addEventListener("error", error);
    tx.addEventListener("abort", error);
  });
  transactionDoneMap.set(tx, done);
}
var idbProxyTraps = {
  get(target, prop, receiver) {
    if (target instanceof IDBTransaction) {
      if (prop === "done")
        return transactionDoneMap.get(target);
      if (prop === "objectStoreNames") {
        return target.objectStoreNames || transactionStoreNamesMap.get(target);
      }
      if (prop === "store") {
        return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
      }
    }
    return wrap(target[prop]);
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  },
  has(target, prop) {
    if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
      return true;
    }
    return prop in target;
  }
};
function replaceTraps(callback) {
  idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
  if (func === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype)) {
    return function(storeNames, ...args) {
      const tx = func.call(unwrap(this), storeNames, ...args);
      transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
      return wrap(tx);
    };
  }
  if (getCursorAdvanceMethods().includes(func)) {
    return function(...args) {
      func.apply(unwrap(this), args);
      return wrap(cursorRequestMap.get(this));
    };
  }
  return function(...args) {
    return wrap(func.apply(unwrap(this), args));
  };
}
function transformCachableValue(value) {
  if (typeof value === "function")
    return wrapFunction(value);
  if (value instanceof IDBTransaction)
    cacheDonePromiseForTransaction(value);
  if (instanceOfAny(value, getIdbProxyableTypes()))
    return new Proxy(value, idbProxyTraps);
  return value;
}
function wrap(value) {
  if (value instanceof IDBRequest)
    return promisifyRequest(value);
  if (transformCache.has(value))
    return transformCache.get(value);
  const newValue = transformCachableValue(value);
  if (newValue !== value) {
    transformCache.set(value, newValue);
    reverseTransformCache.set(newValue, value);
  }
  return newValue;
}
var unwrap = (value) => reverseTransformCache.get(value);
function openDB(name2, version2, { blocked, upgrade, blocking, terminated } = {}) {
  const request = indexedDB.open(name2, version2);
  const openPromise = wrap(request);
  if (upgrade) {
    request.addEventListener("upgradeneeded", (event) => {
      upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
    });
  }
  if (blocked) {
    request.addEventListener("blocked", (event) => blocked(
      // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
      event.oldVersion,
      event.newVersion,
      event
    ));
  }
  openPromise.then((db) => {
    if (terminated)
      db.addEventListener("close", () => terminated());
    if (blocking) {
      db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
    }
  }).catch(() => {
  });
  return openPromise;
}
var readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
var writeMethods = ["put", "add", "delete", "clear"];
var cachedMethods = /* @__PURE__ */ new Map();
function getMethod(target, prop) {
  if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
    return;
  }
  if (cachedMethods.get(prop))
    return cachedMethods.get(prop);
  const targetFuncName = prop.replace(/FromIndex$/, "");
  const useIndex = prop !== targetFuncName;
  const isWrite = writeMethods.includes(targetFuncName);
  if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
  ) {
    return;
  }
  const method = async function(storeName, ...args) {
    const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
    let target2 = tx.store;
    if (useIndex)
      target2 = target2.index(args.shift());
    return (await Promise.all([
      target2[targetFuncName](...args),
      isWrite && tx.done
    ]))[0];
  };
  cachedMethods.set(prop, method);
  return method;
}
replaceTraps((oldTraps) => ({
  ...oldTraps,
  get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
  has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
}));
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var PlatformLoggerServiceImpl = class {
  constructor(container) {
    this.container = container;
  }
  // In initial implementation, this will be called by installations on
  // auth token refresh, and installations will send this string.
  getPlatformInfoString() {
    const providers = this.container.getProviders();
    return providers.map((provider) => {
      if (isVersionServiceProvider(provider)) {
        const service = provider.getImmediate();
        return `${service.library}/${service.version}`;
      } else {
        return null;
      }
    }).filter((logString) => logString).join(" ");
  }
};
function isVersionServiceProvider(provider) {
  const component = provider.getComponent();
  return component?.type === "VERSION";
}
var name$r = "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
var version$1 = "0.16.5";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var logger = new Logger("https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js");
var name$q = "@firebase/app-compat";
var name$p = "@firebase/analytics-compat";
var name$o = "@firebase/analytics";
var name$n = "@firebase/app-check-compat";
var name$m = "@firebase/app-check";
var name$l = "@firebase/auth";
var name$k = "@firebase/auth-compat";
var name$j = "@firebase/crashlytics";
var name$i = "@firebase/database";
var name$h = "@firebase/data-connect";
var name$g = "@firebase/database-compat";
var name$f = "@firebase/functions";
var name$e = "@firebase/functions-compat";
var name$d = "@firebase/installations";
var name$c = "@firebase/installations-compat";
var name$b = "@firebase/messaging";
var name$a = "@firebase/messaging-compat";
var name$9 = "@firebase/performance";
var name$8 = "@firebase/performance-compat";
var name$7 = "@firebase/remote-config";
var name$6 = "@firebase/remote-config-compat";
var name$5 = "@firebase/storage";
var name$4 = "@firebase/storage-compat";
var name$3 = "@firebase/firestore";
var name$2 = "@firebase/ai";
var name$1 = "@firebase/firestore-compat";
var name$s = "firebase";
var version$2 = "13.2.0";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DEFAULT_ENTRY_NAME = "[DEFAULT]";
var PLATFORM_LOG_STRING = {
  [name$r]: "fire-core",
  [name$q]: "fire-core-compat",
  [name$o]: "fire-analytics",
  [name$p]: "fire-analytics-compat",
  [name$m]: "fire-app-check",
  [name$n]: "fire-app-check-compat",
  [name$l]: "fire-auth",
  [name$k]: "fire-auth-compat",
  [name$j]: "fire-cls",
  [name$i]: "fire-rtdb",
  [name$h]: "fire-data-connect",
  [name$g]: "fire-rtdb-compat",
  [name$f]: "fire-fn",
  [name$e]: "fire-fn-compat",
  [name$d]: "fire-iid",
  [name$c]: "fire-iid-compat",
  [name$b]: "fire-fcm",
  [name$a]: "fire-fcm-compat",
  [name$9]: "fire-perf",
  [name$8]: "fire-perf-compat",
  [name$7]: "fire-rc",
  [name$6]: "fire-rc-compat",
  [name$5]: "fire-gcs",
  [name$4]: "fire-gcs-compat",
  [name$3]: "fire-fst",
  [name$1]: "fire-fst-compat",
  [name$2]: "fire-vertex",
  "fire-js": "fire-js",
  // Platform identifier for JS SDK.
  [name$s]: "fire-js-all"
};
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _apps = /* @__PURE__ */ new Map();
var _serverApps = /* @__PURE__ */ new Map();
var _components = /* @__PURE__ */ new Map();
function _addComponent(app, component) {
  try {
    app.container.addComponent(component);
  } catch (e) {
    logger.debug(`Component ${component.name} failed to register with FirebaseApp ${app.name}`, e);
  }
}
function _registerComponent(component) {
  const componentName = component.name;
  if (_components.has(componentName)) {
    logger.debug(`There were multiple attempts to register component ${componentName}.`);
    return false;
  }
  _components.set(componentName, component);
  for (const app of _apps.values()) {
    _addComponent(app, component);
  }
  for (const serverApp of _serverApps.values()) {
    _addComponent(serverApp, component);
  }
  return true;
}
function _getProvider(app, name2) {
  const heartbeatController = app.container.getProvider("heartbeat").getImmediate({ optional: true });
  if (heartbeatController) {
    void heartbeatController.triggerHeartbeat();
  }
  return app.container.getProvider(name2);
}
function _isFirebaseServerApp(obj) {
  if (obj === null || obj === void 0) {
    return false;
  }
  return obj.settings !== void 0;
}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var ERRORS = {
  [
    "no-app"
    /* AppError.NO_APP */
  ]: "No Firebase App '{$appName}' has been created - call initializeApp() first",
  [
    "bad-app-name"
    /* AppError.BAD_APP_NAME */
  ]: "Illegal App name: '{$appName}'",
  [
    "duplicate-app"
    /* AppError.DUPLICATE_APP */
  ]: "Firebase App named '{$appName}' already exists with different {$mismatchedParam}. Existing: '{$oldValue}'. New: '{$newValue}'.",
  [
    "app-deleted"
    /* AppError.APP_DELETED */
  ]: "Firebase App named '{$appName}' already deleted",
  [
    "server-app-deleted"
    /* AppError.SERVER_APP_DELETED */
  ]: "Firebase Server App has been deleted",
  [
    "no-options"
    /* AppError.NO_OPTIONS */
  ]: "Need to provide options, when not being deployed to hosting via source.",
  [
    "invalid-app-argument"
    /* AppError.INVALID_APP_ARGUMENT */
  ]: "firebase.{$appName}() takes either no argument or a Firebase App instance.",
  [
    "invalid-log-argument"
    /* AppError.INVALID_LOG_ARGUMENT */
  ]: "First argument to `onLog` must be null or a function.",
  [
    "idb-open"
    /* AppError.IDB_OPEN */
  ]: "Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.",
  [
    "idb-get"
    /* AppError.IDB_GET */
  ]: "Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.",
  [
    "idb-set"
    /* AppError.IDB_WRITE */
  ]: "Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.",
  [
    "idb-delete"
    /* AppError.IDB_DELETE */
  ]: "Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.",
  [
    "finalization-registry-not-supported"
    /* AppError.FINALIZATION_REGISTRY_NOT_SUPPORTED */
  ]: "FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.",
  [
    "invalid-server-app-environment"
    /* AppError.INVALID_SERVER_APP_ENVIRONMENT */
  ]: "FirebaseServerApp is not for use in browser environments."
};
var ERROR_FACTORY = new ErrorFactory("app", "Firebase", ERRORS);
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var FirebaseAppImpl = class {
  constructor(options, config, container) {
    this._isDeleted = false;
    this._options = { ...options };
    this._config = { ...config };
    this._name = config.name;
    this._automaticDataCollectionEnabled = config.automaticDataCollectionEnabled;
    this._container = container;
    this.container.addComponent(new Component(
      "app",
      () => this,
      "PUBLIC"
      /* ComponentType.PUBLIC */
    ));
  }
  get automaticDataCollectionEnabled() {
    this.checkDestroyed();
    return this._automaticDataCollectionEnabled;
  }
  set automaticDataCollectionEnabled(val) {
    this.checkDestroyed();
    this._automaticDataCollectionEnabled = val;
  }
  get name() {
    this.checkDestroyed();
    return this._name;
  }
  get options() {
    this.checkDestroyed();
    return this._options;
  }
  get config() {
    this.checkDestroyed();
    return this._config;
  }
  get container() {
    return this._container;
  }
  get isDeleted() {
    return this._isDeleted;
  }
  set isDeleted(val) {
    this._isDeleted = val;
  }
  /**
   * This function will throw an Error if the App has already been deleted -
   * use before performing API actions on the App.
   */
  checkDestroyed() {
    if (this.isDeleted) {
      throw ERROR_FACTORY.create("app-deleted", { appName: this._name });
    }
  }
};
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var SDK_VERSION = version$2;
function initializeApp(_options, rawConfig = {}) {
  let options = _options;
  if (typeof rawConfig !== "object") {
    const name3 = rawConfig;
    rawConfig = { name: name3 };
  }
  const config = {
    name: DEFAULT_ENTRY_NAME,
    automaticDataCollectionEnabled: true,
    ...rawConfig
  };
  const name2 = config.name;
  if (typeof name2 !== "string" || !name2) {
    throw ERROR_FACTORY.create("bad-app-name", {
      appName: String(name2)
    });
  }
  options || (options = getDefaultAppConfig());
  if (!options) {
    throw ERROR_FACTORY.create(
      "no-options"
      /* AppError.NO_OPTIONS */
    );
  }
  const existingApp = _apps.get(name2);
  if (existingApp) {
    if (!deepEqual(options, existingApp.options)) {
      throw ERROR_FACTORY.create("duplicate-app", {
        appName: name2,
        mismatchedParam: "options",
        oldValue: JSON.stringify(existingApp.options),
        newValue: JSON.stringify(options)
      });
    } else if (!deepEqual(config, existingApp.config)) {
      throw ERROR_FACTORY.create("duplicate-app", {
        appName: name2,
        mismatchedParam: "config",
        oldValue: JSON.stringify(existingApp.config),
        newValue: JSON.stringify(config)
      });
    } else {
      return existingApp;
    }
  }
  const container = new ComponentContainer(name2);
  for (const component of _components.values()) {
    container.addComponent(component);
  }
  const newApp = new FirebaseAppImpl(options, config, container);
  _apps.set(name2, newApp);
  return newApp;
}
function getApps() {
  return Array.from(_apps.values());
}
function registerVersion(libraryKeyOrName, version2, variant) {
  let library = PLATFORM_LOG_STRING[libraryKeyOrName] ?? libraryKeyOrName;
  if (variant) {
    library += `-${variant}`;
  }
  const libraryMismatch = library.match(/\s|\//);
  const versionMismatch = version2.match(/\s|\//);
  if (libraryMismatch || versionMismatch) {
    const warning = [
      `Unable to register library "${library}" with version "${version2}":`
    ];
    if (libraryMismatch) {
      warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
    }
    if (libraryMismatch && versionMismatch) {
      warning.push("and");
    }
    if (versionMismatch) {
      warning.push(`version name "${version2}" contains illegal characters (whitespace or "/")`);
    }
    logger.warn(warning.join(" "));
    return;
  }
  _registerComponent(new Component(
    `${library}-version`,
    () => ({ library, version: version2 }),
    "VERSION"
    /* ComponentType.VERSION */
  ));
}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DB_NAME = "firebase-heartbeat-database";
var DB_VERSION = 1;
var STORE_NAME = "firebase-heartbeat-store";
var dbPromise = null;
function getDbPromise() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade: (db, oldVersion) => {
        switch (oldVersion) {
          case 0:
            try {
              db.createObjectStore(STORE_NAME);
            } catch (e) {
              console.warn(e);
            }
        }
      }
    }).catch((e) => {
      throw ERROR_FACTORY.create("idb-open", {
        originalErrorMessage: e.message
      });
    });
  }
  return dbPromise;
}
async function readHeartbeatsFromIndexedDB(app) {
  try {
    const db = await getDbPromise();
    const tx = db.transaction(STORE_NAME);
    const result = await tx.objectStore(STORE_NAME).get(computeKey(app));
    await tx.done;
    return result;
  } catch (e) {
    if (e instanceof FirebaseError) {
      logger.warn(e.message);
    } else {
      const idbGetError = ERROR_FACTORY.create("idb-get", {
        originalErrorMessage: e?.message
      });
      logger.warn(idbGetError.message);
    }
  }
}
async function writeHeartbeatsToIndexedDB(app, heartbeatObject) {
  try {
    const db = await getDbPromise();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const objectStore = tx.objectStore(STORE_NAME);
    await objectStore.put(heartbeatObject, computeKey(app));
    await tx.done;
  } catch (e) {
    if (e instanceof FirebaseError) {
      logger.warn(e.message);
    } else {
      const idbGetError = ERROR_FACTORY.create("idb-set", {
        originalErrorMessage: e?.message
      });
      logger.warn(idbGetError.message);
    }
  }
}
function computeKey(app) {
  return `${app.name}!${app.options.appId}`;
}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var MAX_HEADER_BYTES = 1024;
var MAX_NUM_STORED_HEARTBEATS = 30;
var HeartbeatServiceImpl = class {
  constructor(container) {
    this.container = container;
    this._heartbeatsCache = null;
    const app = this.container.getProvider("app").getImmediate();
    this._storage = new HeartbeatStorageImpl(app);
    this._heartbeatsCachePromise = this._storage.read().then((result) => {
      this._heartbeatsCache = result;
      return result;
    });
  }
  /**
   * Called to report a heartbeat. The function will generate
   * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
   * to IndexedDB.
   * Note that we only store one heartbeat per day. So if a heartbeat for today is
   * already logged, subsequent calls to this function in the same day will be ignored.
   */
  async triggerHeartbeat() {
    try {
      const platformLogger = this.container.getProvider("platform-logger").getImmediate();
      const agent = platformLogger.getPlatformInfoString();
      const date = getUTCDateString();
      if (this._heartbeatsCache?.heartbeats == null) {
        this._heartbeatsCache = await this._heartbeatsCachePromise;
        if (this._heartbeatsCache?.heartbeats == null) {
          return;
        }
      }
      if (this._heartbeatsCache.lastSentHeartbeatDate === date || this._heartbeatsCache.heartbeats.some((singleDateHeartbeat) => singleDateHeartbeat.date === date)) {
        return;
      } else {
        this._heartbeatsCache.heartbeats.push({ date, agent });
        if (this._heartbeatsCache.heartbeats.length > MAX_NUM_STORED_HEARTBEATS) {
          const earliestHeartbeatIdx = getEarliestHeartbeatIdx(this._heartbeatsCache.heartbeats);
          this._heartbeatsCache.heartbeats.splice(earliestHeartbeatIdx, 1);
        }
      }
      return this._storage.overwrite(this._heartbeatsCache);
    } catch (e) {
      logger.warn(e);
    }
  }
  /**
   * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
   * It also clears all heartbeats from memory as well as in IndexedDB.
   *
   * NOTE: Consuming product SDKs should not send the header if this method
   * returns an empty string.
   */
  async getHeartbeatsHeader() {
    try {
      if (this._heartbeatsCache === null) {
        await this._heartbeatsCachePromise;
      }
      if (this._heartbeatsCache?.heartbeats == null || this._heartbeatsCache.heartbeats.length === 0) {
        return "";
      }
      const date = getUTCDateString();
      const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
      const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
      this._heartbeatsCache.lastSentHeartbeatDate = date;
      if (unsentEntries.length > 0) {
        this._heartbeatsCache.heartbeats = unsentEntries;
        await this._storage.overwrite(this._heartbeatsCache);
      } else {
        this._heartbeatsCache.heartbeats = [];
        void this._storage.overwrite(this._heartbeatsCache);
      }
      return headerString;
    } catch (e) {
      logger.warn(e);
      return "";
    }
  }
};
function getUTCDateString() {
  const today = /* @__PURE__ */ new Date();
  return today.toISOString().substring(0, 10);
}
function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
  const heartbeatsToSend = [];
  let unsentEntries = heartbeatsCache.slice();
  for (const singleDateHeartbeat of heartbeatsCache) {
    const heartbeatEntry = heartbeatsToSend.find((hb) => hb.agent === singleDateHeartbeat.agent);
    if (!heartbeatEntry) {
      heartbeatsToSend.push({
        agent: singleDateHeartbeat.agent,
        dates: [singleDateHeartbeat.date]
      });
      if (countBytes(heartbeatsToSend) > maxSize) {
        heartbeatsToSend.pop();
        break;
      }
    } else {
      heartbeatEntry.dates.push(singleDateHeartbeat.date);
      if (countBytes(heartbeatsToSend) > maxSize) {
        heartbeatEntry.dates.pop();
        break;
      }
    }
    unsentEntries = unsentEntries.slice(1);
  }
  return {
    heartbeatsToSend,
    unsentEntries
  };
}
var HeartbeatStorageImpl = class {
  constructor(app) {
    this.app = app;
    this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
  }
  async runIndexedDBEnvironmentCheck() {
    if (!isIndexedDBAvailable()) {
      return false;
    } else {
      return validateIndexedDBOpenable().then(() => true).catch(() => false);
    }
  }
  /**
   * Read all heartbeats.
   */
  async read() {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return { heartbeats: [] };
    } else {
      const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
      if (idbHeartbeatObject?.heartbeats) {
        return idbHeartbeatObject;
      } else {
        return { heartbeats: [] };
      }
    }
  }
  // overwrite the storage with the provided heartbeats
  async overwrite(heartbeatsObject) {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return;
    } else {
      const existingHeartbeatsObject = await this.read();
      return writeHeartbeatsToIndexedDB(this.app, {
        lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ?? existingHeartbeatsObject.lastSentHeartbeatDate,
        heartbeats: heartbeatsObject.heartbeats
      });
    }
  }
  // add heartbeats
  async add(heartbeatsObject) {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return;
    } else {
      const existingHeartbeatsObject = await this.read();
      return writeHeartbeatsToIndexedDB(this.app, {
        lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ?? existingHeartbeatsObject.lastSentHeartbeatDate,
        heartbeats: [
          ...existingHeartbeatsObject.heartbeats,
          ...heartbeatsObject.heartbeats
        ]
      });
    }
  }
};
function countBytes(heartbeatsCache) {
  return base64urlEncodeWithoutPadding(
    // heartbeatsCache wrapper properties
    JSON.stringify({ version: 2, heartbeats: heartbeatsCache })
  ).length;
}
function getEarliestHeartbeatIdx(heartbeats) {
  if (heartbeats.length === 0) {
    return -1;
  }
  let earliestHeartbeatIdx = 0;
  let earliestHeartbeatDate = heartbeats[0].date;
  for (let i = 1; i < heartbeats.length; i++) {
    if (heartbeats[i].date < earliestHeartbeatDate) {
      earliestHeartbeatDate = heartbeats[i].date;
      earliestHeartbeatIdx = i;
    }
  }
  return earliestHeartbeatIdx;
}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function registerCoreComponents(variant) {
  _registerComponent(new Component(
    "platform-logger",
    (container) => new PlatformLoggerServiceImpl(container),
    "PRIVATE"
    /* ComponentType.PRIVATE */
  ));
  _registerComponent(new Component(
    "heartbeat",
    (container) => new HeartbeatServiceImpl(container),
    "PRIVATE"
    /* ComponentType.PRIVATE */
  ));
  registerVersion(name$r, version$1, variant);
  registerVersion(name$r, version$1, "esm2020");
  registerVersion("fire-js", "");
}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
registerCoreComponents("");
var name = "firebase";
var version = "13.2.0";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
registerVersion(name, version, "cdn");

// cloudflare-saas/vendor/firebase-13.2.0/firebase-auth.js
var s = { byteToCharMap_: null, charToByteMap_: null, byteToCharMapWebSafe_: null, charToByteMapWebSafe_: null, ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", get ENCODED_VALS() {
  return this.ENCODED_VALS_BASE + "+/=";
}, get ENCODED_VALS_WEBSAFE() {
  return this.ENCODED_VALS_BASE + "-_.";
}, HAS_NATIVE_SUPPORT: "function" == typeof atob, encodeByteArray(e, t) {
  if (!Array.isArray(e)) throw Error("encodeByteArray takes an array as a parameter");
  this.init_();
  const r = t ? this.byteToCharMapWebSafe_ : this.byteToCharMap_, n = [];
  for (let t2 = 0; t2 < e.length; t2 += 3) {
    const i = e[t2], s2 = t2 + 1 < e.length, o2 = s2 ? e[t2 + 1] : 0, a2 = t2 + 2 < e.length, c2 = a2 ? e[t2 + 2] : 0, u2 = i >> 2, d2 = (3 & i) << 4 | o2 >> 4;
    let l2 = (15 & o2) << 2 | c2 >> 6, h = 63 & c2;
    a2 || (h = 64, s2 || (l2 = 64)), n.push(r[u2], r[d2], r[l2], r[h]);
  }
  return n.join("");
}, encodeString(e, t) {
  return this.HAS_NATIVE_SUPPORT && !t ? btoa(e) : this.encodeByteArray((function(e2) {
    const t2 = [];
    let r = 0;
    for (let n = 0; n < e2.length; n++) {
      let i = e2.charCodeAt(n);
      i < 128 ? t2[r++] = i : i < 2048 ? (t2[r++] = i >> 6 | 192, t2[r++] = 63 & i | 128) : 55296 == (64512 & i) && n + 1 < e2.length && 56320 == (64512 & e2.charCodeAt(n + 1)) ? (i = 65536 + ((1023 & i) << 10) + (1023 & e2.charCodeAt(++n)), t2[r++] = i >> 18 | 240, t2[r++] = i >> 12 & 63 | 128, t2[r++] = i >> 6 & 63 | 128, t2[r++] = 63 & i | 128) : (t2[r++] = i >> 12 | 224, t2[r++] = i >> 6 & 63 | 128, t2[r++] = 63 & i | 128);
    }
    return t2;
  })(e), t);
}, decodeString(e, t) {
  return this.HAS_NATIVE_SUPPORT && !t ? atob(e) : (function(e2) {
    const t2 = [];
    let r = 0, n = 0;
    for (; r < e2.length; ) {
      const i = e2[r++];
      if (i < 128) t2[n++] = String.fromCharCode(i);
      else if (i > 191 && i < 224) {
        const s2 = e2[r++];
        t2[n++] = String.fromCharCode((31 & i) << 6 | 63 & s2);
      } else if (i > 239 && i < 365) {
        const s2 = ((7 & i) << 18 | (63 & e2[r++]) << 12 | (63 & e2[r++]) << 6 | 63 & e2[r++]) - 65536;
        t2[n++] = String.fromCharCode(55296 + (s2 >> 10)), t2[n++] = String.fromCharCode(56320 + (1023 & s2));
      } else {
        const s2 = e2[r++], o2 = e2[r++];
        t2[n++] = String.fromCharCode((15 & i) << 12 | (63 & s2) << 6 | 63 & o2);
      }
    }
    return t2.join("");
  })(this.decodeStringToByteArray(e, t));
}, decodeStringToByteArray(e, t) {
  this.init_();
  const r = t ? this.charToByteMapWebSafe_ : this.charToByteMap_, n = [];
  for (let t2 = 0; t2 < e.length; ) {
    const i = r[e.charAt(t2++)], s2 = t2 < e.length ? r[e.charAt(t2)] : 0;
    ++t2;
    const o2 = t2 < e.length ? r[e.charAt(t2)] : 64;
    ++t2;
    const a2 = t2 < e.length ? r[e.charAt(t2)] : 64;
    if (++t2, null == i || null == s2 || null == o2 || null == a2) throw new DecodeBase64StringError2();
    const c2 = i << 2 | s2 >> 4;
    if (n.push(c2), 64 !== o2) {
      const e2 = s2 << 4 & 240 | o2 >> 2;
      if (n.push(e2), 64 !== a2) {
        const e3 = o2 << 6 & 192 | a2;
        n.push(e3);
      }
    }
  }
  return n;
}, init_() {
  if (!this.byteToCharMap_) {
    this.byteToCharMap_ = {}, this.charToByteMap_ = {}, this.byteToCharMapWebSafe_ = {}, this.charToByteMapWebSafe_ = {};
    for (let e = 0; e < this.ENCODED_VALS.length; e++) this.byteToCharMap_[e] = this.ENCODED_VALS.charAt(e), this.charToByteMap_[this.byteToCharMap_[e]] = e, this.byteToCharMapWebSafe_[e] = this.ENCODED_VALS_WEBSAFE.charAt(e), this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]] = e, e >= this.ENCODED_VALS_BASE.length && (this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)] = e, this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)] = e);
  }
} };
var DecodeBase64StringError2 = class extends Error {
  constructor() {
    super(...arguments), this.name = "DecodeBase64StringError";
  }
};
var base64Decode2 = function(e) {
  try {
    return s.decodeString(e, true);
  } catch (e2) {
    console.error("base64Decode failed: ", e2);
  }
  return null;
};
var getDefaultsFromGlobal2 = () => (function getGlobal2() {
  if ("undefined" != typeof self) return self;
  if ("undefined" != typeof window) return window;
  if ("undefined" != typeof global) return global;
  throw new Error("Unable to locate global object.");
})().__FIREBASE_DEFAULTS__;
var getDefaults2 = () => {
  try {
    return getDefaultsFromGlobal2() || (() => {
      if ("undefined" == typeof process || void 0 === process.env) return;
      const e = process.env.__FIREBASE_DEFAULTS__;
      return e ? JSON.parse(e) : void 0;
    })() || (() => {
      if ("undefined" == typeof document) return;
      let e;
      try {
        e = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
      } catch (e2) {
        return;
      }
      const t = e && base64Decode2(e[1]);
      return t && JSON.parse(t);
    })();
  } catch (e) {
    return void console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
  }
};
var getExperimentalSetting = (e) => getDefaults2()?.[`_${e}`];
var Deferred2 = class {
  constructor() {
    this.reject = () => {
    }, this.resolve = () => {
    }, this.promise = new Promise(((e, t) => {
      this.resolve = e, this.reject = t;
    }));
  }
  wrapCallback(e) {
    return (t, r) => {
      t ? this.reject(t) : this.resolve(r), "function" == typeof e && (this.promise.catch((() => {
      })), 1 === e.length ? e(t) : e(t, r));
    };
  }
};
function getUA() {
  return "undefined" != typeof navigator && "string" == typeof navigator.userAgent ? navigator.userAgent : "";
}
var FirebaseError2 = class _FirebaseError extends Error {
  constructor(e, t, r) {
    super(t), this.code = e, this.customData = r, this.name = "FirebaseError", Object.setPrototypeOf(this, _FirebaseError.prototype), Error.captureStackTrace && Error.captureStackTrace(this, ErrorFactory2.prototype.create);
  }
};
var ErrorFactory2 = class {
  constructor(e, t, r) {
    this.service = e, this.serviceName = t, this.errors = r;
  }
  create(e, ...t) {
    const r = t[0] || {}, n = `${this.service}/${e}`, i = this.errors[e], s2 = i ? (function replaceTemplate2(e2, t2) {
      try {
        let r2 = 0, n2 = "";
        for (; r2 < e2.length; ) {
          const i2 = e2.indexOf("{$", r2);
          if (-1 === i2) {
            n2 += e2.substring(r2);
            break;
          }
          const s3 = e2.indexOf("}", i2 + 2);
          if (-1 === s3) {
            n2 += e2.substring(r2);
            break;
          }
          const o3 = e2.substring(i2 + 2, s3), a2 = t2[o3];
          n2 += e2.substring(r2, i2) + (null != a2 ? String(a2) : `<${o3}?>`), r2 = s3 + 1;
        }
        return n2;
      } catch (t3) {
        return e2;
      }
    })(i, r) : "Error", o2 = `${this.serviceName}: ${s2} (${n}).`;
    return new FirebaseError2(n, o2, r);
  }
};
function deepEqual2(e, t) {
  if (e === t) return true;
  const r = Object.keys(e), n = Object.keys(t);
  for (const i of r) {
    if (!n.includes(i)) return false;
    const r2 = e[i], s2 = t[i];
    if (isObject2(r2) && isObject2(s2)) {
      if (!deepEqual2(r2, s2)) return false;
    } else if (r2 !== s2) return false;
  }
  for (const e2 of n) if (!r.includes(e2)) return false;
  return true;
}
function isObject2(e) {
  return null !== e && "object" == typeof e;
}
function querystring(e) {
  const t = [];
  for (const [r, n] of Object.entries(e)) Array.isArray(n) ? n.forEach(((e2) => {
    t.push(encodeURIComponent(r) + "=" + encodeURIComponent(e2));
  })) : t.push(encodeURIComponent(r) + "=" + encodeURIComponent(n));
  return t.length ? "&" + t.join("&") : "";
}
function querystringDecode(e) {
  const t = {};
  return e.replace(/^\?/, "").split("&").forEach(((e2) => {
    if (e2) {
      const [r, n] = e2.split("=");
      t[decodeURIComponent(r)] = decodeURIComponent(n);
    }
  })), t;
}
function extractQuerystring(e) {
  const t = e.indexOf("?");
  if (!t) return "";
  const r = e.indexOf("#", t);
  return e.substring(t, r > 0 ? r : void 0);
}
var ObserverProxy = class {
  constructor(e, t) {
    this.observers = [], this.unsubscribes = [], this.observerCount = 0, this.task = Promise.resolve(), this.finalized = false, this.onNoObservers = t, this.task.then((() => {
      e(this);
    })).catch(((e2) => {
      this.error(e2);
    }));
  }
  next(e) {
    this.forEachObserver(((t) => {
      t.next(e);
    }));
  }
  error(e) {
    this.forEachObserver(((t) => {
      t.error(e);
    })), this.close(e);
  }
  complete() {
    this.forEachObserver(((e) => {
      e.complete();
    })), this.close();
  }
  subscribe(e, t, r) {
    let n;
    if (void 0 === e && void 0 === t && void 0 === r) throw new Error("Missing Observer.");
    n = (function implementsAnyMethods(e2, t2) {
      if ("object" != typeof e2 || null === e2) return false;
      for (const r2 of t2) if (r2 in e2 && "function" == typeof e2[r2]) return true;
      return false;
    })(e, ["next", "error", "complete"]) ? e : { next: e, error: t, complete: r }, void 0 === n.next && (n.next = noop), void 0 === n.error && (n.error = noop), void 0 === n.complete && (n.complete = noop);
    const i = this.unsubscribeOne.bind(this, this.observers.length);
    return this.finalized && this.task.then((() => {
      try {
        this.finalError ? n.error(this.finalError) : n.complete();
      } catch (e2) {
      }
    })), this.observers.push(n), i;
  }
  unsubscribeOne(e) {
    void 0 !== this.observers && void 0 !== this.observers[e] && (delete this.observers[e], this.observerCount -= 1, 0 === this.observerCount && void 0 !== this.onNoObservers && this.onNoObservers(this));
  }
  forEachObserver(e) {
    if (!this.finalized) for (let t = 0; t < this.observers.length; t++) this.sendOne(t, e);
  }
  sendOne(e, t) {
    this.task.then((() => {
      if (void 0 !== this.observers && void 0 !== this.observers[e]) try {
        t(this.observers[e]);
      } catch (e2) {
        "undefined" != typeof console && console.error && console.error(e2);
      }
    }));
  }
  close(e) {
    this.finalized || (this.finalized = true, void 0 !== e && (this.finalError = e), this.task.then((() => {
      this.observers = void 0, this.onNoObservers = void 0;
    })));
  }
};
function noop() {
}
function getModularInstance(e) {
  return e && e._delegate ? e._delegate : e;
}
function isCloudWorkstation(e) {
  try {
    return (e.startsWith("http://") || e.startsWith("https://") ? new URL(e).hostname : e).endsWith(".cloudworkstations.dev");
  } catch {
    return false;
  }
}
var o;
!(function(e) {
  e[e.DEBUG = 0] = "DEBUG", e[e.VERBOSE = 1] = "VERBOSE", e[e.INFO = 2] = "INFO", e[e.WARN = 3] = "WARN", e[e.ERROR = 4] = "ERROR", e[e.SILENT = 5] = "SILENT";
})(o || (o = {}));
var a = { debug: o.DEBUG, verbose: o.VERBOSE, info: o.INFO, warn: o.WARN, error: o.ERROR, silent: o.SILENT };
var c = o.INFO;
var u = { [o.DEBUG]: "log", [o.VERBOSE]: "log", [o.INFO]: "info", [o.WARN]: "warn", [o.ERROR]: "error" };
var defaultLogHandler2 = (e, t, ...r) => {
  if (t < e.logLevel) return;
  const n = (/* @__PURE__ */ new Date()).toISOString(), i = u[t];
  if (!i) throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`);
  console[i](`[${n}]  ${e.name}:`, ...r);
};
var Component2 = class {
  constructor(e, t, r) {
    this.name = e, this.instanceFactory = t, this.type = r, this.multipleInstances = false, this.serviceProps = {}, this.instantiationMode = "LAZY", this.onInstanceCreated = null;
  }
  setInstantiationMode(e) {
    return this.instantiationMode = e, this;
  }
  setMultipleInstances(e) {
    return this.multipleInstances = e, this;
  }
  setServiceProps(e) {
    return this.serviceProps = e, this;
  }
  setInstanceCreatedCallback(e) {
    return this.onInstanceCreated = e, this;
  }
};
var d;
var l;
!(function(e) {
  e.LAZY = "LAZY", e.EAGER = "EAGER", e.EXPLICIT = "EXPLICIT";
})(d || (d = {})), (function(e) {
  e.PUBLIC = "PUBLIC", e.PRIVATE = "PRIVATE", e.VERSION = "VERSION";
})(l || (l = {}));
function _prodErrorMap() {
  return { "dependent-sdk-initialized-before-auth": "Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK." };
}
var I = _prodErrorMap;
var v = new ErrorFactory2("auth", "Firebase", { "dependent-sdk-initialized-before-auth": "Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK." });
var A = new class Logger2 {
  constructor(e) {
    this.name = e, this._logLevel = c, this._logHandler = defaultLogHandler2, this._userLogHandler = null;
  }
  get logLevel() {
    return this._logLevel;
  }
  set logLevel(e) {
    if (!(e in o)) throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);
    this._logLevel = e;
  }
  setLogLevel(e) {
    this._logLevel = "string" == typeof e ? a[e] : e;
  }
  get logHandler() {
    return this._logHandler;
  }
  set logHandler(e) {
    if ("function" != typeof e) throw new TypeError("Value assigned to `logHandler` must be a function");
    this._logHandler = e;
  }
  get userLogHandler() {
    return this._userLogHandler;
  }
  set userLogHandler(e) {
    this._userLogHandler = e;
  }
  debug(...e) {
    this._userLogHandler && this._userLogHandler(this, o.DEBUG, ...e), this._logHandler(this, o.DEBUG, ...e);
  }
  log(...e) {
    this._userLogHandler && this._userLogHandler(this, o.VERBOSE, ...e), this._logHandler(this, o.VERBOSE, ...e);
  }
  info(...e) {
    this._userLogHandler && this._userLogHandler(this, o.INFO, ...e), this._logHandler(this, o.INFO, ...e);
  }
  warn(...e) {
    this._userLogHandler && this._userLogHandler(this, o.WARN, ...e), this._logHandler(this, o.WARN, ...e);
  }
  error(...e) {
    this._userLogHandler && this._userLogHandler(this, o.ERROR, ...e), this._logHandler(this, o.ERROR, ...e);
  }
}("@firebase/auth");
function _logWarn(e, ...t) {
  A.logLevel <= o.WARN && A.warn(`Auth (${SDK_VERSION}): ${e}`, ...t);
}
function _logError(e, ...t) {
  A.logLevel <= o.ERROR && A.error(`Auth (${SDK_VERSION}): ${e}`, ...t);
}
function _fail(e, ...t) {
  throw createErrorInternal(e, ...t);
}
function _createError(e, ...t) {
  return createErrorInternal(e, ...t);
}
function _errorWithCustomMessage(e, t, r) {
  const n = { ...I(), [t]: r };
  return new ErrorFactory2("auth", "Firebase", n).create(t, { appName: e.name });
}
function _serverAppCurrentUserOperationNotSupportedError(e) {
  return _errorWithCustomMessage(e, "operation-not-supported-in-this-environment", "Operations that alter the current user are not supported in conjunction with FirebaseServerApp");
}
function _assertInstanceOf(e, t, r) {
  if (!(t instanceof r)) throw r.name !== t.constructor.name && _fail(e, "argument-error"), _errorWithCustomMessage(e, "argument-error", `Type of ${t.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`);
}
function createErrorInternal(e, ...t) {
  if ("string" != typeof e) {
    const r = t[0], n = [...t.slice(1)];
    return n[0] && (n[0].appName = e.name), e._errorFactory.create(r, ...n);
  }
  return v.create(e, ...t);
}
function _assert(e, t, ...r) {
  if (!e) throw createErrorInternal(t, ...r);
}
function debugFail(e) {
  const t = "INTERNAL ASSERTION FAILED: " + e;
  throw _logError(t), new Error(t);
}
function debugAssert(e, t) {
  e || debugFail(t);
}
function _getCurrentUrl() {
  return "undefined" != typeof self && self.location?.href || "";
}
function _isHttpOrHttps() {
  return "http:" === _getCurrentScheme() || "https:" === _getCurrentScheme();
}
function _getCurrentScheme() {
  return "undefined" != typeof self && self.location?.protocol || null;
}
function _isOnline() {
  return !("undefined" != typeof navigator && navigator && "onLine" in navigator && "boolean" == typeof navigator.onLine && (_isHttpOrHttps() || (function isBrowserExtension() {
    const e = "object" == typeof chrome ? chrome.runtime : "object" == typeof browser ? browser.runtime : void 0;
    return "object" == typeof e && void 0 !== e.id;
  })() || "connection" in navigator)) || navigator.onLine;
}
var Delay = class {
  constructor(e, t) {
    this.shortDelay = e, this.longDelay = t, debugAssert(t > e, "Short delay should be less than long delay!"), this.isMobile = (function isMobileCordova() {
      return "undefined" != typeof window && !!(window.cordova || window.phonegap || window.PhoneGap) && /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA());
    })() || (function isReactNative() {
      return "object" == typeof navigator && "ReactNative" === navigator.product;
    })();
  }
  get() {
    return _isOnline() ? this.isMobile ? this.longDelay : this.shortDelay : Math.min(5e3, this.shortDelay);
  }
};
function _emulatorUrl(e, t) {
  debugAssert(e.emulator, "Emulator should always be set here");
  const { url: r } = e.emulator;
  return t ? `${r}${t.startsWith("/") ? t.slice(1) : t}` : r;
}
var FetchProvider = class {
  static initialize(e, t, r) {
    this.fetchImpl = e, t && (this.headersImpl = t), r && (this.responseImpl = r);
  }
  static fetch() {
    return this.fetchImpl ? this.fetchImpl : "undefined" != typeof self && "fetch" in self ? self.fetch : "undefined" != typeof globalThis && globalThis.fetch ? globalThis.fetch : "undefined" != typeof fetch ? fetch : void debugFail("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
  }
  static headers() {
    return this.headersImpl ? this.headersImpl : "undefined" != typeof self && "Headers" in self ? self.Headers : "undefined" != typeof globalThis && globalThis.Headers ? globalThis.Headers : "undefined" != typeof Headers ? Headers : void debugFail("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
  }
  static response() {
    return this.responseImpl ? this.responseImpl : "undefined" != typeof self && "Response" in self ? self.Response : "undefined" != typeof globalThis && globalThis.Response ? globalThis.Response : "undefined" != typeof Response ? Response : void debugFail("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
  }
};
var T = { CREDENTIAL_MISMATCH: "custom-token-mismatch", MISSING_CUSTOM_TOKEN: "internal-error", INVALID_IDENTIFIER: "invalid-email", MISSING_CONTINUE_URI: "internal-error", INVALID_PASSWORD: "wrong-password", MISSING_PASSWORD: "missing-password", INVALID_LOGIN_CREDENTIALS: "invalid-credential", EMAIL_EXISTS: "email-already-in-use", PASSWORD_LOGIN_DISABLED: "operation-not-allowed", INVALID_IDP_RESPONSE: "invalid-credential", INVALID_PENDING_TOKEN: "invalid-credential", FEDERATED_USER_ID_ALREADY_LINKED: "credential-already-in-use", MISSING_REQ_TYPE: "internal-error", EMAIL_NOT_FOUND: "user-not-found", RESET_PASSWORD_EXCEED_LIMIT: "too-many-requests", EXPIRED_OOB_CODE: "expired-action-code", INVALID_OOB_CODE: "invalid-action-code", MISSING_OOB_CODE: "internal-error", CREDENTIAL_TOO_OLD_LOGIN_AGAIN: "requires-recent-login", INVALID_ID_TOKEN: "invalid-user-token", TOKEN_EXPIRED: "user-token-expired", USER_NOT_FOUND: "user-token-expired", TOO_MANY_ATTEMPTS_TRY_LATER: "too-many-requests", PASSWORD_DOES_NOT_MEET_REQUIREMENTS: "password-does-not-meet-requirements", INVALID_CODE: "invalid-verification-code", INVALID_SESSION_INFO: "invalid-verification-id", INVALID_TEMPORARY_PROOF: "invalid-credential", MISSING_SESSION_INFO: "missing-verification-id", SESSION_EXPIRED: "code-expired", MISSING_ANDROID_PACKAGE_NAME: "missing-android-pkg-name", UNAUTHORIZED_DOMAIN: "unauthorized-continue-uri", INVALID_OAUTH_CLIENT_ID: "invalid-oauth-client-id", ADMIN_ONLY_OPERATION: "admin-restricted-operation", INVALID_MFA_PENDING_CREDENTIAL: "invalid-multi-factor-session", MFA_ENROLLMENT_NOT_FOUND: "multi-factor-info-not-found", MISSING_MFA_ENROLLMENT_ID: "missing-multi-factor-info", MISSING_MFA_PENDING_CREDENTIAL: "missing-multi-factor-session", SECOND_FACTOR_EXISTS: "second-factor-already-in-use", SECOND_FACTOR_LIMIT_EXCEEDED: "maximum-second-factor-count-exceeded", BLOCKING_FUNCTION_ERROR_RESPONSE: "internal-error", RECAPTCHA_NOT_ENABLED: "recaptcha-not-enabled", MISSING_RECAPTCHA_TOKEN: "missing-recaptcha-token", INVALID_RECAPTCHA_TOKEN: "invalid-recaptcha-token", INVALID_RECAPTCHA_ACTION: "invalid-recaptcha-action", MISSING_CLIENT_TYPE: "missing-client-type", MISSING_RECAPTCHA_VERSION: "missing-recaptcha-version", INVALID_RECAPTCHA_VERSION: "invalid-recaptcha-version", INVALID_REQ_TYPE: "invalid-req-type" };
var y = ["/v1/accounts:signInWithCustomToken", "/v1/accounts:signInWithEmailLink", "/v1/accounts:signInWithIdp", "/v1/accounts:signInWithPassword", "/v1/accounts:signInWithPhoneNumber", "/v1/token"];
var w = new Delay(3e4, 6e4);
function _addTidIfNecessary(e, t) {
  return e.tenantId && !t.tenantId ? { ...t, tenantId: e.tenantId } : t;
}
async function _performApiRequest(e, t, r, n, i = {}) {
  return _performFetchWithErrorHandling(e, i, (async () => {
    let i2 = {}, s2 = {};
    n && ("GET" === t ? s2 = n : i2 = { body: JSON.stringify(n) });
    const o2 = querystring({ ...s2, key: e.config.apiKey }).slice(1), a2 = await e._getAdditionalHeaders();
    a2["Content-Type"] = "application/json", e.languageCode && (a2["X-Firebase-Locale"] = e.languageCode);
    const c2 = { method: t, headers: a2, ...i2 };
    return (function isCloudflareWorker() {
      return "undefined" != typeof navigator && "Cloudflare-Workers" === navigator.userAgent;
    })() || (c2.referrerPolicy = "strict-origin-when-cross-origin"), e.emulatorConfig && isCloudWorkstation(e.emulatorConfig.host) && (c2.credentials = "include"), FetchProvider.fetch()(await _getFinalTarget(e, e.config.apiHost, r, o2), c2);
  }));
}
async function _performFetchWithErrorHandling(e, t, r) {
  e._canInitEmulator = false;
  const n = { ...T, ...t };
  try {
    const t2 = new NetworkTimeout(e), i = await Promise.race([r(), t2.promise]);
    t2.clearNetworkTimeout();
    const s2 = await i.json();
    if ("needConfirmation" in s2) throw _makeTaggedError(e, "account-exists-with-different-credential", s2);
    if (i.ok && !("errorMessage" in s2)) return s2;
    {
      const t3 = i.ok ? s2.errorMessage : s2.error.message, [r2, o2] = t3.split(" : ");
      if ("FEDERATED_USER_ID_ALREADY_LINKED" === r2) throw _makeTaggedError(e, "credential-already-in-use", s2);
      if ("EMAIL_EXISTS" === r2) throw _makeTaggedError(e, "email-already-in-use", s2);
      if ("USER_DISABLED" === r2) throw _makeTaggedError(e, "user-disabled", s2);
      const a2 = n[r2] || r2.toLowerCase().replace(/[_\s]+/g, "-");
      if (o2) throw _errorWithCustomMessage(e, a2, o2);
      _fail(e, a2);
    }
  } catch (t2) {
    if (t2 instanceof FirebaseError2) throw t2;
    _fail(e, "network-request-failed", { message: String(t2) });
  }
}
async function _performSignInRequest(e, t, r, n, i = {}) {
  const s2 = await _performApiRequest(e, t, r, n, i);
  return "mfaPendingCredential" in s2 && _fail(e, "multi-factor-auth-required", { _serverResponse: s2 }), s2;
}
async function _getFinalTarget(e, t, r, n) {
  const i = `${t}${r}?${n}`, s2 = e, o2 = s2.config.emulator ? _emulatorUrl(e.config, i) : `${e.config.apiScheme}://${i}`;
  if (y.includes(r) && (await s2._persistenceManagerAvailable, "COOKIE" === s2._getPersistenceType())) {
    return s2._getPersistence()._getFinalTarget(o2).toString();
  }
  return o2;
}
function _parseEnforcementState(e) {
  switch (e) {
    case "ENFORCE":
      return "ENFORCE";
    case "AUDIT":
      return "AUDIT";
    case "OFF":
      return "OFF";
    default:
      return "ENFORCEMENT_STATE_UNSPECIFIED";
  }
}
var NetworkTimeout = class {
  clearNetworkTimeout() {
    clearTimeout(this.timer);
  }
  constructor(e) {
    this.auth = e, this.timer = null, this.promise = new Promise(((e2, t) => {
      this.timer = setTimeout((() => t(_createError(this.auth, "network-request-failed"))), w.get());
    }));
  }
};
function _makeTaggedError(e, t, r) {
  const n = { appName: e.name };
  r.email && (n.email = r.email), r.phoneNumber && (n.phoneNumber = r.phoneNumber);
  const i = _createError(e, t, n);
  return i.customData._tokenResponse = r, i;
}
function isEnterprise(e) {
  return void 0 !== e && void 0 !== e.enterprise;
}
var RecaptchaConfig = class {
  constructor(e) {
    if (this.siteKey = "", this.recaptchaEnforcementState = [], void 0 === e.recaptchaKey) throw new Error("recaptchaKey undefined");
    this.siteKey = e.recaptchaKey.split("/")[3], this.recaptchaEnforcementState = e.recaptchaEnforcementState;
  }
  getProviderEnforcementState(e) {
    if (!this.recaptchaEnforcementState || 0 === this.recaptchaEnforcementState.length) return null;
    for (const t of this.recaptchaEnforcementState) if (t.provider && t.provider === e) return _parseEnforcementState(t.enforcementState);
    return null;
  }
  isProviderEnabled(e) {
    return "ENFORCE" === this.getProviderEnforcementState(e) || "AUDIT" === this.getProviderEnforcementState(e);
  }
  isAnyProviderEnabled() {
    return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER") || this.isProviderEnabled("PHONE_PROVIDER");
  }
};
async function getRecaptchaConfig(e, t) {
  return _performApiRequest(e, "GET", "/v2/recaptchaConfig", _addTidIfNecessary(e, t));
}
async function getAccountInfo(e, t) {
  return _performApiRequest(e, "POST", "/v1/accounts:lookup", t);
}
function utcTimestampToDateString(e) {
  if (e) try {
    const t = new Date(Number(e));
    if (!isNaN(t.getTime())) return t.toUTCString();
  } catch (e2) {
  }
}
async function getIdTokenResult(e, t = false) {
  const r = getModularInstance(e), n = await r.getIdToken(t), i = _parseToken(n);
  _assert(i && i.exp && i.auth_time && i.iat, r.auth, "internal-error");
  const s2 = "object" == typeof i.firebase ? i.firebase : void 0, o2 = s2?.sign_in_provider;
  return { claims: i, token: n, authTime: utcTimestampToDateString(secondsStringToMilliseconds(i.auth_time)), issuedAtTime: utcTimestampToDateString(secondsStringToMilliseconds(i.iat)), expirationTime: utcTimestampToDateString(secondsStringToMilliseconds(i.exp)), signInProvider: o2 || null, signInSecondFactor: s2?.sign_in_second_factor || null };
}
function secondsStringToMilliseconds(e) {
  return 1e3 * Number(e);
}
function _parseToken(e) {
  const [t, r, n] = e.split(".");
  if (void 0 === t || void 0 === r || void 0 === n) return _logError("JWT malformed, contained fewer than 3 sections"), null;
  try {
    const e2 = base64Decode2(r);
    return e2 ? JSON.parse(e2) : (_logError("Failed to decode base64 JWT payload"), null);
  } catch (e2) {
    return _logError("Caught error parsing JWT payload as JSON", e2?.toString()), null;
  }
}
function _tokenExpiresIn(e) {
  const t = _parseToken(e);
  return _assert(t, "internal-error"), _assert(void 0 !== t.exp, "internal-error"), _assert(void 0 !== t.iat, "internal-error"), Number(t.exp) - Number(t.iat);
}
async function _logoutIfInvalidated(e, t, r = false) {
  if (r) return t;
  try {
    return await t;
  } catch (t2) {
    throw _isUserInvalidated(t2) && e.auth.currentUser === e && await e.auth.signOut(), t2;
  }
}
function _isUserInvalidated(e) {
  return e instanceof FirebaseError2 && ("auth/user-disabled" === e.code || "auth/user-token-expired" === e.code);
}
var ProactiveRefresh = class {
  constructor(e) {
    this.user = e, this.isRunning = false, this.timerId = null, this.errorBackoff = 3e4;
  }
  _start() {
    this.isRunning || (this.isRunning = true, this.schedule());
  }
  _stop() {
    this.isRunning && (this.isRunning = false, null !== this.timerId && clearTimeout(this.timerId));
  }
  getInterval(e) {
    if (e) {
      const e2 = this.errorBackoff;
      return this.errorBackoff = Math.min(2 * this.errorBackoff, 96e4), e2;
    }
    {
      this.errorBackoff = 3e4;
      const e2 = (this.user.stsTokenManager.expirationTime ?? 0) - Date.now() - 3e5;
      return Math.max(0, e2);
    }
  }
  schedule(e = false) {
    if (!this.isRunning) return;
    const t = this.getInterval(e);
    this.timerId = setTimeout((async () => {
      await this.iteration();
    }), t);
  }
  async iteration() {
    try {
      await this.user.getIdToken(true);
    } catch (e) {
      return void ("auth/network-request-failed" === e?.code && this.schedule(true));
    }
    this.schedule();
  }
};
var UserMetadata = class {
  constructor(e, t) {
    this.createdAt = e, this.lastLoginAt = t, this._initializeTime();
  }
  _initializeTime() {
    this.lastSignInTime = utcTimestampToDateString(this.lastLoginAt), this.creationTime = utcTimestampToDateString(this.createdAt);
  }
  _copy(e) {
    this.createdAt = e.createdAt, this.lastLoginAt = e.lastLoginAt, this._initializeTime();
  }
  toJSON() {
    return { createdAt: this.createdAt, lastLoginAt: this.lastLoginAt };
  }
};
async function _reloadWithoutSaving(e) {
  const t = e.auth, r = await e.getIdToken(), n = await _logoutIfInvalidated(e, getAccountInfo(t, { idToken: r }));
  _assert(n?.users.length, t, "internal-error");
  const i = n.users[0];
  e._notifyReloadListener(i);
  const s2 = i.providerUserInfo?.length ? extractProviderData(i.providerUserInfo) : [], o2 = (function mergeProviderData(e2, t2) {
    return [...e2.filter(((e3) => !t2.some(((t3) => t3.providerId === e3.providerId)))), ...t2];
  })(e.providerData, s2), a2 = e.isAnonymous, c2 = !(e.email && i.passwordHash || o2?.length), u2 = !!a2 && c2, d2 = { uid: i.localId, displayName: i.displayName || null, photoURL: i.photoUrl || null, email: i.email || null, emailVerified: i.emailVerified || false, phoneNumber: i.phoneNumber || null, tenantId: i.tenantId || null, providerData: o2, metadata: new UserMetadata(i.createdAt, i.lastLoginAt), isAnonymous: u2 };
  Object.assign(e, d2);
}
async function reload(e) {
  const t = getModularInstance(e);
  await _reloadWithoutSaving(t), await t.auth._persistUserIfCurrent(t), t.auth._notifyListenersIfCurrent(t);
}
function extractProviderData(e) {
  return e.map((({ providerId: e2, ...t }) => ({ providerId: e2, uid: t.rawId || "", displayName: t.displayName || null, email: t.email || null, phoneNumber: t.phoneNumber || null, photoURL: t.photoUrl || null })));
}
var StsTokenManager = class _StsTokenManager {
  constructor() {
    this.refreshToken = null, this.accessToken = null, this.expirationTime = null;
  }
  get isExpired() {
    return !this.expirationTime || Date.now() > this.expirationTime - 3e5;
  }
  updateFromServerResponse(e) {
    _assert(e.idToken, "internal-error"), _assert(void 0 !== e.idToken, "internal-error"), _assert(void 0 !== e.refreshToken, "internal-error");
    const t = "expiresIn" in e && void 0 !== e.expiresIn ? Number(e.expiresIn) : _tokenExpiresIn(e.idToken);
    this.updateTokensAndExpiration(e.idToken, e.refreshToken, t);
  }
  updateFromIdToken(e) {
    _assert(0 !== e.length, "internal-error");
    const t = _tokenExpiresIn(e);
    this.updateTokensAndExpiration(e, null, t);
  }
  async getToken(e, t = false) {
    return t || !this.accessToken || this.isExpired ? (_assert(this.refreshToken, e, "user-token-expired"), this.refreshToken ? (await this.refresh(e, this.refreshToken), this.accessToken) : null) : this.accessToken;
  }
  clearRefreshToken() {
    this.refreshToken = null;
  }
  async refresh(e, t) {
    const { accessToken: r, refreshToken: n, expiresIn: i } = await (async function requestStsToken(e2, t2) {
      const r2 = await _performFetchWithErrorHandling(e2, {}, (async () => {
        const r3 = querystring({ grant_type: "refresh_token", refresh_token: t2 }).slice(1), { tokenApiHost: n2, apiKey: i2 } = e2.config, s2 = await _getFinalTarget(e2, n2, "/v1/token", `key=${i2}`), o2 = await e2._getAdditionalHeaders();
        o2["Content-Type"] = "application/x-www-form-urlencoded";
        const a2 = { method: "POST", headers: o2, body: r3 };
        return e2.emulatorConfig && isCloudWorkstation(e2.emulatorConfig.host) && (a2.credentials = "include"), FetchProvider.fetch()(s2, a2);
      }));
      return { accessToken: r2.access_token, expiresIn: r2.expires_in, refreshToken: r2.refresh_token };
    })(e, t);
    this.updateTokensAndExpiration(r, n, Number(i));
  }
  updateTokensAndExpiration(e, t, r) {
    this.refreshToken = t || null, this.accessToken = e || null, this.expirationTime = Date.now() + 1e3 * r;
  }
  static fromJSON(e, t) {
    const { refreshToken: r, accessToken: n, expirationTime: i } = t, s2 = new _StsTokenManager();
    return r && (_assert("string" == typeof r, "internal-error", { appName: e }), s2.refreshToken = r), n && (_assert("string" == typeof n, "internal-error", { appName: e }), s2.accessToken = n), i && (_assert("number" == typeof i, "internal-error", { appName: e }), s2.expirationTime = i), s2;
  }
  toJSON() {
    return { refreshToken: this.refreshToken, accessToken: this.accessToken, expirationTime: this.expirationTime };
  }
  _assign(e) {
    this.accessToken = e.accessToken, this.refreshToken = e.refreshToken, this.expirationTime = e.expirationTime;
  }
  _clone() {
    return Object.assign(new _StsTokenManager(), this.toJSON());
  }
  _performRefresh() {
    return debugFail("not implemented");
  }
};
function assertStringOrUndefined(e, t) {
  _assert("string" == typeof e || void 0 === e, "internal-error", { appName: t });
}
var UserImpl = class _UserImpl {
  constructor({ uid: e, auth: t, stsTokenManager: r, ...n }) {
    this.providerId = "firebase", this.proactiveRefresh = new ProactiveRefresh(this), this.reloadUserInfo = null, this.reloadListener = null, this.uid = e, this.auth = t, this.stsTokenManager = r, this.accessToken = r.accessToken, this.displayName = n.displayName || null, this.email = n.email || null, this.emailVerified = n.emailVerified || false, this.phoneNumber = n.phoneNumber || null, this.photoURL = n.photoURL || null, this.isAnonymous = n.isAnonymous || false, this.tenantId = n.tenantId || null, this.providerData = n.providerData ? [...n.providerData] : [], this.metadata = new UserMetadata(n.createdAt || void 0, n.lastLoginAt || void 0);
  }
  async getIdToken(e) {
    const t = await _logoutIfInvalidated(this, this.stsTokenManager.getToken(this.auth, e));
    return _assert(t, this.auth, "internal-error"), this.accessToken !== t && (this.accessToken = t, await this.auth._persistUserIfCurrent(this), this.auth._notifyListenersIfCurrent(this)), t;
  }
  getIdTokenResult(e) {
    return getIdTokenResult(this, e);
  }
  reload() {
    return reload(this);
  }
  _assign(e) {
    this !== e && (_assert(this.uid === e.uid, this.auth, "internal-error"), this.displayName = e.displayName, this.photoURL = e.photoURL, this.email = e.email, this.emailVerified = e.emailVerified, this.phoneNumber = e.phoneNumber, this.isAnonymous = e.isAnonymous, this.tenantId = e.tenantId, this.providerData = e.providerData.map(((e2) => ({ ...e2 }))), this.metadata._copy(e.metadata), this.stsTokenManager._assign(e.stsTokenManager));
  }
  _clone(e) {
    const t = new _UserImpl({ ...this, auth: e, stsTokenManager: this.stsTokenManager._clone() });
    return t.metadata._copy(this.metadata), t;
  }
  _onReload(e) {
    _assert(!this.reloadListener, this.auth, "internal-error"), this.reloadListener = e, this.reloadUserInfo && (this._notifyReloadListener(this.reloadUserInfo), this.reloadUserInfo = null);
  }
  _notifyReloadListener(e) {
    this.reloadListener ? this.reloadListener(e) : this.reloadUserInfo = e;
  }
  _startProactiveRefresh() {
    this.proactiveRefresh._start();
  }
  _stopProactiveRefresh() {
    this.proactiveRefresh._stop();
  }
  async _updateTokensIfNecessary(e, t = false) {
    let r = false;
    e.idToken && e.idToken !== this.stsTokenManager.accessToken && (this.stsTokenManager.updateFromServerResponse(e), r = true), t && await _reloadWithoutSaving(this), await this.auth._persistUserIfCurrent(this), r && this.auth._notifyListenersIfCurrent(this);
  }
  async delete() {
    if (_isFirebaseServerApp(this.auth.app)) return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this.auth));
    const e = await this.getIdToken();
    return await _logoutIfInvalidated(this, (async function deleteAccount(e2, t) {
      return _performApiRequest(e2, "POST", "/v1/accounts:delete", t);
    })(this.auth, { idToken: e })), this.stsTokenManager.clearRefreshToken(), this.auth.signOut();
  }
  toJSON() {
    return { uid: this.uid, email: this.email || void 0, emailVerified: this.emailVerified, displayName: this.displayName || void 0, isAnonymous: this.isAnonymous, photoURL: this.photoURL || void 0, phoneNumber: this.phoneNumber || void 0, tenantId: this.tenantId || void 0, providerData: this.providerData.map(((e) => ({ ...e }))), stsTokenManager: this.stsTokenManager.toJSON(), _redirectEventId: this._redirectEventId, ...this.metadata.toJSON(), apiKey: this.auth.config.apiKey, appName: this.auth.name };
  }
  get refreshToken() {
    return this.stsTokenManager.refreshToken || "";
  }
  static _fromJSON(e, t) {
    const r = t.displayName ?? void 0, n = t.email ?? void 0, i = t.phoneNumber ?? void 0, s2 = t.photoURL ?? void 0, o2 = t.tenantId ?? void 0, a2 = t._redirectEventId ?? void 0, c2 = t.createdAt ?? void 0, u2 = t.lastLoginAt ?? void 0, { uid: d2, emailVerified: l2, isAnonymous: h, providerData: p, stsTokenManager: f } = t;
    _assert(d2 && f, e, "internal-error");
    const m = StsTokenManager.fromJSON(this.name, f);
    _assert("string" == typeof d2, e, "internal-error"), assertStringOrUndefined(r, e.name), assertStringOrUndefined(n, e.name), _assert("boolean" == typeof l2, e, "internal-error"), _assert("boolean" == typeof h, e, "internal-error"), assertStringOrUndefined(i, e.name), assertStringOrUndefined(s2, e.name), assertStringOrUndefined(o2, e.name), assertStringOrUndefined(a2, e.name), assertStringOrUndefined(c2, e.name), assertStringOrUndefined(u2, e.name);
    const g = new _UserImpl({ uid: d2, auth: e, email: n, emailVerified: l2, displayName: r, isAnonymous: h, photoURL: s2, phoneNumber: i, tenantId: o2, stsTokenManager: m, createdAt: c2, lastLoginAt: u2 });
    return p && Array.isArray(p) && (g.providerData = p.map(((e2) => ({ ...e2 })))), a2 && (g._redirectEventId = a2), g;
  }
  static async _fromIdTokenResponse(e, t, r = false) {
    const n = new StsTokenManager();
    n.updateFromServerResponse(t);
    const i = new _UserImpl({ uid: t.localId, auth: e, stsTokenManager: n, isAnonymous: r });
    return await _reloadWithoutSaving(i), i;
  }
  static async _fromGetAccountInfoResponse(e, t, r) {
    const n = t.users[0];
    _assert(void 0 !== n.localId, "internal-error");
    const i = void 0 !== n.providerUserInfo ? extractProviderData(n.providerUserInfo) : [], s2 = !(n.email && n.passwordHash || i?.length), o2 = new StsTokenManager();
    o2.updateFromIdToken(r);
    const a2 = new _UserImpl({ uid: n.localId, auth: e, stsTokenManager: o2, isAnonymous: s2 }), c2 = { uid: n.localId, displayName: n.displayName || null, photoURL: n.photoUrl || null, email: n.email || null, emailVerified: n.emailVerified || false, phoneNumber: n.phoneNumber || null, tenantId: n.tenantId || null, providerData: i, metadata: new UserMetadata(n.createdAt, n.lastLoginAt), isAnonymous: !(n.email && n.passwordHash || i?.length) };
    return Object.assign(a2, c2), a2;
  }
};
var P = /* @__PURE__ */ new Map();
function _getInstance(e) {
  debugAssert(e instanceof Function, "Expected a class definition");
  let t = P.get(e);
  return t ? (debugAssert(t instanceof e, "Instance stored in cache mismatched with class"), t) : (t = new e(), P.set(e, t), t);
}
var InMemoryPersistence = class {
  constructor() {
    this.type = "NONE", this.storage = {};
  }
  async _isAvailable() {
    return true;
  }
  async _set(e, t) {
    this.storage[e] = t;
  }
  async _get(e) {
    const t = this.storage[e];
    return void 0 === t ? null : t;
  }
  async _remove(e) {
    delete this.storage[e];
  }
  _addListener(e, t) {
  }
  _removeListener(e, t) {
  }
};
InMemoryPersistence.type = "NONE";
var S = InMemoryPersistence;
function _persistenceKeyName(e, t, r) {
  return `firebase:${e}:${t}:${r}`;
}
var PersistenceUserManager = class _PersistenceUserManager {
  constructor(e, t, r) {
    this.persistence = e, this.auth = t, this.userKey = r;
    const { config: n, name: i } = this.auth;
    this.fullUserKey = _persistenceKeyName(this.userKey, n.apiKey, i), this.fullPersistenceKey = _persistenceKeyName("persistence", n.apiKey, i), this.boundEventHandler = t._onStorageEvent.bind(t);
    try {
      this.persistence._addListener(this.fullUserKey, this.boundEventHandler);
    } catch {
    }
  }
  setCurrentUser(e) {
    return this.persistence._set(this.fullUserKey, e.toJSON());
  }
  async getCurrentUser() {
    const e = await this.persistence._get(this.fullUserKey);
    if (!e) return null;
    if ("string" == typeof e) {
      const t = await getAccountInfo(this.auth, { idToken: e }).catch((() => {
      }));
      return t ? UserImpl._fromGetAccountInfoResponse(this.auth, t, e) : null;
    }
    return UserImpl._fromJSON(this.auth, e);
  }
  removeCurrentUser() {
    return this.persistence._remove(this.fullUserKey);
  }
  savePersistenceForRedirect() {
    return this.persistence._set(this.fullPersistenceKey, this.persistence.type);
  }
  async setPersistence(e) {
    if (this.persistence === e) return;
    const t = await this.getCurrentUser();
    return await this.removeCurrentUser(), this.persistence = e, t ? this.setCurrentUser(t) : void 0;
  }
  delete() {
    try {
      this.persistence._removeListener(this.fullUserKey, this.boundEventHandler);
    } catch {
    }
  }
  static async create(e, t, r = "authUser") {
    if (!t.length) return new _PersistenceUserManager(_getInstance(S), e, r);
    const n = (await Promise.all(t.map((async (e2) => {
      try {
        if (await e2._isAvailable()) return e2;
      } catch {
        return;
      }
    })))).filter(((e2) => e2));
    let i = n[0] || _getInstance(S);
    const s2 = _persistenceKeyName(r, e.config.apiKey, e.name);
    let o2 = null;
    for (const r2 of t) try {
      const t2 = await r2._get(s2);
      if (t2) {
        let n2;
        if ("string" == typeof t2) {
          const r3 = await getAccountInfo(e, { idToken: t2 }).catch((() => {
          }));
          if (!r3) break;
          n2 = await UserImpl._fromGetAccountInfoResponse(e, r3, t2);
        } else n2 = UserImpl._fromJSON(e, t2);
        r2 !== i && (o2 = n2), i = r2;
        break;
      }
    } catch {
    }
    const a2 = n.filter(((e2) => e2._shouldAllowMigration));
    return i._shouldAllowMigration && a2.length ? (i = a2[0], o2 && await i._set(s2, o2.toJSON()), await Promise.all(t.map((async (e2) => {
      if (e2 !== i) try {
        await e2._remove(s2);
      } catch {
      }
    }))), new _PersistenceUserManager(i, e, r)) : new _PersistenceUserManager(i, e, r);
  }
};
function _getBrowserName(e) {
  const t = e.toLowerCase();
  if (t.includes("opera/") || t.includes("opr/") || t.includes("opios/")) return "Opera";
  if (_isIEMobile(t)) return "IEMobile";
  if (t.includes("msie") || t.includes("trident/")) return "IE";
  if (t.includes("edge/")) return "Edge";
  if (_isFirefox(t)) return "Firefox";
  if (t.includes("silk/")) return "Silk";
  if (_isBlackBerry(t)) return "Blackberry";
  if (_isWebOS(t)) return "Webos";
  if (_isSafari(t)) return "Safari";
  if ((t.includes("chrome/") || _isChromeIOS(t)) && !t.includes("edge/")) return "Chrome";
  if (_isAndroid(t)) return "Android";
  {
    const t2 = /([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/, r = e.match(t2);
    if (2 === r?.length) return r[1];
  }
  return "Other";
}
function _isFirefox(e = getUA()) {
  return /firefox\//i.test(e);
}
function _isSafari(e = getUA()) {
  const t = e.toLowerCase();
  return t.includes("safari/") && !t.includes("chrome/") && !t.includes("crios/") && !t.includes("android");
}
function _isChromeIOS(e = getUA()) {
  return /crios\//i.test(e);
}
function _isIEMobile(e = getUA()) {
  return /iemobile/i.test(e);
}
function _isAndroid(e = getUA()) {
  return /android/i.test(e);
}
function _isBlackBerry(e = getUA()) {
  return /blackberry/i.test(e);
}
function _isWebOS(e = getUA()) {
  return /webos/i.test(e);
}
function _isIOS(e = getUA()) {
  return /iphone|ipad|ipod/i.test(e) || /macintosh/i.test(e) && /mobile/i.test(e);
}
function _isIE10() {
  return (function isIE() {
    const e = getUA();
    return e.indexOf("MSIE ") >= 0 || e.indexOf("Trident/") >= 0;
  })() && 10 === document.documentMode;
}
function _isMobileBrowser(e = getUA()) {
  return _isIOS(e) || _isAndroid(e) || _isWebOS(e) || _isBlackBerry(e) || /windows phone/i.test(e) || _isIEMobile(e);
}
function _getClientVersion(e, t = []) {
  let n;
  switch (e) {
    case "Browser":
      n = _getBrowserName(getUA());
      break;
    case "Worker":
      n = `${_getBrowserName(getUA())}-${e}`;
      break;
    default:
      n = e;
  }
  const i = t.length ? t.join(",") : "FirebaseCore-web";
  return `${n}/JsCore/${SDK_VERSION}/${i}`;
}
var AuthMiddlewareQueue = class {
  constructor(e) {
    this.auth = e, this.queue = [];
  }
  pushCallback(e, t) {
    const wrappedCallback = (t2) => new Promise(((r2, n) => {
      try {
        r2(e(t2));
      } catch (e2) {
        n(e2);
      }
    }));
    wrappedCallback.onAbort = t, this.queue.push(wrappedCallback);
    const r = this.queue.length - 1;
    return () => {
      this.queue[r] = () => Promise.resolve();
    };
  }
  async runMiddleware(e) {
    if (this.auth.currentUser === e) return;
    const t = [];
    try {
      for (const r of this.queue) await r(e), r.onAbort && t.push(r.onAbort);
    } catch (e2) {
      t.reverse();
      for (const e3 of t) try {
        e3();
      } catch (e4) {
      }
      throw this.auth._errorFactory.create("login-blocked", { originalMessage: e2?.message });
    }
  }
};
var PasswordPolicyImpl = class {
  constructor(e) {
    const t = e.customStrengthOptions;
    this.customStrengthOptions = {}, this.customStrengthOptions.minPasswordLength = t.minPasswordLength ?? 6, t.maxPasswordLength && (this.customStrengthOptions.maxPasswordLength = t.maxPasswordLength), void 0 !== t.containsLowercaseCharacter && (this.customStrengthOptions.containsLowercaseLetter = t.containsLowercaseCharacter), void 0 !== t.containsUppercaseCharacter && (this.customStrengthOptions.containsUppercaseLetter = t.containsUppercaseCharacter), void 0 !== t.containsNumericCharacter && (this.customStrengthOptions.containsNumericCharacter = t.containsNumericCharacter), void 0 !== t.containsNonAlphanumericCharacter && (this.customStrengthOptions.containsNonAlphanumericCharacter = t.containsNonAlphanumericCharacter), this.enforcementState = e.enforcementState, "ENFORCEMENT_STATE_UNSPECIFIED" === this.enforcementState && (this.enforcementState = "OFF"), this.allowedNonAlphanumericCharacters = e.allowedNonAlphanumericCharacters?.join("") ?? "", this.forceUpgradeOnSignin = e.forceUpgradeOnSignin ?? false, this.schemaVersion = e.schemaVersion;
  }
  validatePassword(e) {
    const t = { isValid: true, passwordPolicy: this };
    return this.validatePasswordLengthOptions(e, t), this.validatePasswordCharacterOptions(e, t), t.isValid && (t.isValid = t.meetsMinPasswordLength ?? true), t.isValid && (t.isValid = t.meetsMaxPasswordLength ?? true), t.isValid && (t.isValid = t.containsLowercaseLetter ?? true), t.isValid && (t.isValid = t.containsUppercaseLetter ?? true), t.isValid && (t.isValid = t.containsNumericCharacter ?? true), t.isValid && (t.isValid = t.containsNonAlphanumericCharacter ?? true), t;
  }
  validatePasswordLengthOptions(e, t) {
    const r = this.customStrengthOptions.minPasswordLength, n = this.customStrengthOptions.maxPasswordLength;
    r && (t.meetsMinPasswordLength = e.length >= r), n && (t.meetsMaxPasswordLength = e.length <= n);
  }
  validatePasswordCharacterOptions(e, t) {
    let r;
    this.updatePasswordCharacterOptionsStatuses(t, false, false, false, false);
    for (let n = 0; n < e.length; n++) r = e.charAt(n), this.updatePasswordCharacterOptionsStatuses(t, r >= "a" && r <= "z", r >= "A" && r <= "Z", r >= "0" && r <= "9", this.allowedNonAlphanumericCharacters.includes(r));
  }
  updatePasswordCharacterOptionsStatuses(e, t, r, n, i) {
    this.customStrengthOptions.containsLowercaseLetter && (e.containsLowercaseLetter || (e.containsLowercaseLetter = t)), this.customStrengthOptions.containsUppercaseLetter && (e.containsUppercaseLetter || (e.containsUppercaseLetter = r)), this.customStrengthOptions.containsNumericCharacter && (e.containsNumericCharacter || (e.containsNumericCharacter = n)), this.customStrengthOptions.containsNonAlphanumericCharacter && (e.containsNonAlphanumericCharacter || (e.containsNonAlphanumericCharacter = i));
  }
};
var AuthImpl = class {
  constructor(e, t, r, n) {
    this.app = e, this.heartbeatServiceProvider = t, this.appCheckServiceProvider = r, this.config = n, this.currentUser = null, this.emulatorConfig = null, this.operations = Promise.resolve(), this.authStateSubscription = new Subscription(this), this.idTokenSubscription = new Subscription(this), this.beforeStateQueue = new AuthMiddlewareQueue(this), this.redirectUser = null, this.isProactiveRefreshEnabled = false, this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION = 1, this._canInitEmulator = true, this._isInitialized = false, this._deleted = false, this._initializationPromise = null, this._popupRedirectResolver = null, this._errorFactory = v, this._agentRecaptchaConfig = null, this._tenantRecaptchaConfigs = {}, this._projectPasswordPolicy = null, this._tenantPasswordPolicies = {}, this._resolvePersistenceManagerAvailable = void 0, this.lastNotifiedUid = void 0, this.languageCode = null, this.tenantId = null, this.settings = { appVerificationDisabledForTesting: false }, this.frameworks = [], this.name = e.name, this.clientVersion = n.sdkClientVersion, this._persistenceManagerAvailable = new Promise(((e2) => this._resolvePersistenceManagerAvailable = e2));
  }
  _initializeWithPersistence(e, t) {
    return t && (this._popupRedirectResolver = _getInstance(t)), this._initializationPromise = this.queue((async () => {
      if (!this._deleted) {
        try {
          this.persistenceManager = await PersistenceUserManager.create(this, e);
        } catch (e2) {
          _logWarn(`Failed to initialize persistence: ${e2}`), this.persistenceManager = await PersistenceUserManager.create(this, []);
        } finally {
          this._resolvePersistenceManagerAvailable?.();
        }
        if (!this._deleted) {
          if (this._popupRedirectResolver?._shouldInitProactively) try {
            await this._popupRedirectResolver._initialize(this);
          } catch (e2) {
          }
          try {
            await this.initializeCurrentUser(t);
          } catch (e2) {
            _logWarn(`Failed to initialize current user: ${e2}`), await this.directlySetCurrentUser(null).catch((() => {
            }));
          }
          this.lastNotifiedUid = this.currentUser?.uid || null, this._deleted || (this._isInitialized = true);
        }
      }
    })), this._initializationPromise;
  }
  async _onStorageEvent() {
    if (this._deleted) return;
    const e = await this.assertedPersistence.getCurrentUser();
    return this.currentUser || e ? this.currentUser && e && this.currentUser.uid === e.uid ? (this._currentUser._assign(e), void await this.currentUser.getIdToken()) : void await this._updateCurrentUser(e, true) : void 0;
  }
  async initializeCurrentUserFromIdToken(e) {
    try {
      const t = await getAccountInfo(this, { idToken: e }), r = await UserImpl._fromGetAccountInfoResponse(this, t, e);
      await this.directlySetCurrentUser(r);
    } catch (e2) {
      console.warn("FirebaseServerApp could not login user with provided authIdToken: ", e2), await this.directlySetCurrentUser(null);
    }
  }
  async initializeCurrentUser(e) {
    if (_isFirebaseServerApp(this.app)) {
      const e2 = this.app.settings.authIdToken;
      return e2 ? new Promise(((t2) => {
        setTimeout((() => this.initializeCurrentUserFromIdToken(e2).then(t2, t2)));
      })) : this.directlySetCurrentUser(null);
    }
    const t = await this.assertedPersistence.getCurrentUser();
    let r = t, i = false;
    if (e && this.config.authDomain) {
      await this.getOrInitRedirectPersistenceManager();
      const t2 = this.redirectUser?._redirectEventId, n = r?._redirectEventId, s2 = await this.tryRedirectSignIn(e);
      t2 && t2 !== n || !s2?.user || (r = s2.user, i = true);
    }
    if (!r) return this.directlySetCurrentUser(null);
    if (!r._redirectEventId) {
      if (i) try {
        await this.beforeStateQueue.runMiddleware(r);
      } catch (e2) {
        r = t, this._popupRedirectResolver._overrideRedirectResult(this, (() => Promise.reject(e2)));
      }
      return r ? this.reloadAndSetCurrentUserOrClear(r) : this.directlySetCurrentUser(null);
    }
    return _assert(this._popupRedirectResolver, this, "argument-error"), await this.getOrInitRedirectPersistenceManager(), this.redirectUser && this.redirectUser._redirectEventId === r._redirectEventId ? this.directlySetCurrentUser(r) : this.reloadAndSetCurrentUserOrClear(r);
  }
  async tryRedirectSignIn(e) {
    let t = null;
    try {
      t = await this._popupRedirectResolver._completeRedirectFn(this, e, true);
    } catch (e2) {
      await this._setRedirectUser(null);
    }
    return t;
  }
  async reloadAndSetCurrentUserOrClear(e) {
    try {
      await _reloadWithoutSaving(e);
    } catch (e2) {
      if (_isUserInvalidated(e2)) return this.directlySetCurrentUser(null);
    }
    return this.directlySetCurrentUser(e);
  }
  useDeviceLanguage() {
    this.languageCode = (function _getUserLanguage() {
      if ("undefined" == typeof navigator) return null;
      const e = navigator;
      return e.languages && e.languages[0] || e.language || null;
    })();
  }
  async _delete() {
    this._deleted = true;
  }
  async updateCurrentUser(e) {
    if (_isFirebaseServerApp(this.app)) return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this));
    const t = e ? getModularInstance(e) : null;
    return t && _assert(t.auth.config.apiKey === this.config.apiKey, this, "invalid-user-token"), this._updateCurrentUser(t && t._clone(this));
  }
  async _updateCurrentUser(e, t = false) {
    if (!this._deleted) return e && _assert(this.tenantId === e.tenantId, this, "tenant-id-mismatch"), t || await this.beforeStateQueue.runMiddleware(e), this.queue((async () => {
      await this.directlySetCurrentUser(e), this.notifyAuthListeners();
    }));
  }
  async signOut() {
    return _isFirebaseServerApp(this.app) ? Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this)) : (await this.beforeStateQueue.runMiddleware(null), (this.redirectPersistenceManager || this._popupRedirectResolver) && await this._setRedirectUser(null), this._updateCurrentUser(null, true));
  }
  setPersistence(e) {
    return _isFirebaseServerApp(this.app) ? Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this)) : this.queue((async () => {
      await this.assertedPersistence.setPersistence(_getInstance(e));
    }));
  }
  _getRecaptchaConfig() {
    return null == this.tenantId ? this._agentRecaptchaConfig : this._tenantRecaptchaConfigs[this.tenantId];
  }
  async validatePassword(e) {
    this._getPasswordPolicyInternal() || await this._updatePasswordPolicy();
    const t = this._getPasswordPolicyInternal();
    return t.schemaVersion !== this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION ? Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version", {})) : t.validatePassword(e);
  }
  _getPasswordPolicyInternal() {
    return null === this.tenantId ? this._projectPasswordPolicy : this._tenantPasswordPolicies[this.tenantId];
  }
  async _updatePasswordPolicy() {
    const e = await (async function _getPasswordPolicy(e2, t2 = {}) {
      return _performApiRequest(e2, "GET", "/v2/passwordPolicy", _addTidIfNecessary(e2, t2));
    })(this), t = new PasswordPolicyImpl(e);
    null === this.tenantId ? this._projectPasswordPolicy = t : this._tenantPasswordPolicies[this.tenantId] = t;
  }
  _getPersistenceType() {
    return this.assertedPersistence.persistence.type;
  }
  _getPersistence() {
    return this.assertedPersistence.persistence;
  }
  _updateErrorMap(e) {
    this._errorFactory = new ErrorFactory2("auth", "Firebase", e());
  }
  onAuthStateChanged(e, t, r) {
    return this.registerStateListener(this.authStateSubscription, e, t, r);
  }
  beforeAuthStateChanged(e, t) {
    return this.beforeStateQueue.pushCallback(e, t);
  }
  onIdTokenChanged(e, t, r) {
    return this.registerStateListener(this.idTokenSubscription, e, t, r);
  }
  authStateReady() {
    return new Promise(((e, t) => {
      if (this.currentUser) e();
      else {
        const r = this.onAuthStateChanged((() => {
          r(), e();
        }), t);
      }
    }));
  }
  async revokeAccessToken(e) {
    if (this.currentUser) {
      const t = { providerId: "apple.com", tokenType: "ACCESS_TOKEN", token: e, idToken: await this.currentUser.getIdToken() };
      null != this.tenantId && (t.tenantId = this.tenantId), await (async function revokeToken(e2, t2) {
        return _performApiRequest(e2, "POST", "/v2/accounts:revokeToken", _addTidIfNecessary(e2, t2));
      })(this, t);
    }
  }
  toJSON() {
    return { apiKey: this.config.apiKey, authDomain: this.config.authDomain, appName: this.name, currentUser: this._currentUser?.toJSON() };
  }
  async _setRedirectUser(e, t) {
    const r = await this.getOrInitRedirectPersistenceManager(t);
    return null === e ? r.removeCurrentUser() : r.setCurrentUser(e);
  }
  async getOrInitRedirectPersistenceManager(e) {
    if (!this.redirectPersistenceManager) {
      const t = e && _getInstance(e) || this._popupRedirectResolver;
      _assert(t, this, "argument-error"), this.redirectPersistenceManager = await PersistenceUserManager.create(this, [_getInstance(t._redirectPersistence)], "redirectUser"), this.redirectUser = await this.redirectPersistenceManager.getCurrentUser();
    }
    return this.redirectPersistenceManager;
  }
  async _redirectUserForId(e) {
    return this._isInitialized && await this.queue((async () => {
    })), this._currentUser?._redirectEventId === e ? this._currentUser : this.redirectUser?._redirectEventId === e ? this.redirectUser : null;
  }
  async _persistUserIfCurrent(e) {
    if (e === this.currentUser) return this.queue((async () => this.directlySetCurrentUser(e)));
  }
  _notifyListenersIfCurrent(e) {
    e === this.currentUser && this.notifyAuthListeners();
  }
  _key() {
    return `${this.config.authDomain}:${this.config.apiKey}:${this.name}`;
  }
  _startProactiveRefresh() {
    this.isProactiveRefreshEnabled = true, this.currentUser && this._currentUser._startProactiveRefresh();
  }
  _stopProactiveRefresh() {
    this.isProactiveRefreshEnabled = false, this.currentUser && this._currentUser._stopProactiveRefresh();
  }
  get _currentUser() {
    return this.currentUser;
  }
  notifyAuthListeners() {
    if (!this._isInitialized) return;
    this.idTokenSubscription.next(this.currentUser);
    const e = this.currentUser?.uid ?? null;
    this.lastNotifiedUid !== e && (this.lastNotifiedUid = e, this.authStateSubscription.next(this.currentUser));
  }
  registerStateListener(e, t, r, n) {
    if (this._deleted) return () => {
    };
    const i = "function" == typeof t ? t : t.next.bind(t);
    let s2 = false;
    const o2 = this._isInitialized ? Promise.resolve() : this._initializationPromise;
    if (_assert(o2, this, "internal-error"), o2.then((() => {
      s2 || i(this.currentUser);
    })).catch(((e2) => {
      if (!s2) if ("function" != typeof t && t.error) t.error(e2);
      else {
        if (!r) throw e2;
        r(e2);
      }
    })), "function" == typeof t) {
      const i2 = e.addObserver(t, r, n);
      return () => {
        s2 = true, i2();
      };
    }
    {
      const r2 = e.addObserver(t);
      return () => {
        s2 = true, r2();
      };
    }
  }
  async directlySetCurrentUser(e) {
    if (this.currentUser && this.currentUser !== e && this._currentUser._stopProactiveRefresh(), e && this.isProactiveRefreshEnabled && e._startProactiveRefresh(), this.currentUser = e, this.persistenceManager) try {
      e ? await this.persistenceManager.setCurrentUser(e) : await this.persistenceManager.removeCurrentUser();
    } catch (e2) {
      const t = _errorWithCustomMessage(this, "internal-error", `An internal AuthError has occurred: ${e2?.message || String(e2)}`);
      throw t.customData = { originalError: e2 }, t;
    }
  }
  queue(e) {
    return this.operations = this.operations.then(e, e), this.operations;
  }
  get assertedPersistence() {
    return _assert(this.persistenceManager, this, "internal-error"), this.persistenceManager;
  }
  _logFramework(e) {
    e && !this.frameworks.includes(e) && (this.frameworks.push(e), this.frameworks.sort(), this.clientVersion = _getClientVersion(this.config.clientPlatform, this._getFrameworks()));
  }
  _getFrameworks() {
    return this.frameworks;
  }
  async _getAdditionalHeaders() {
    const e = { "X-Client-Version": this.clientVersion };
    this.app.options.appId && (e["X-Firebase-gmpid"] = this.app.options.appId);
    const t = await this.heartbeatServiceProvider.getImmediate({ optional: true })?.getHeartbeatsHeader();
    t && (e["X-Firebase-Client"] = t);
    const r = await this._getAppCheckToken();
    return r && (e["X-Firebase-AppCheck"] = r), e;
  }
  async _getAppCheckToken() {
    if (_isFirebaseServerApp(this.app) && this.app.settings.appCheckToken) return this.app.settings.appCheckToken;
    const e = await this.appCheckServiceProvider.getImmediate({ optional: true })?.getToken();
    return e?.error && _logWarn(`Error while retrieving App Check token: ${e.error}`), e?.token;
  }
};
function _castAuth(e) {
  return getModularInstance(e);
}
var Subscription = class {
  constructor(e) {
    this.auth = e, this.observer = null, this.addObserver = (function createSubscribe(e2, t) {
      const r = new ObserverProxy(e2, t);
      return r.subscribe.bind(r);
    })(((e2) => this.observer = e2));
  }
  get next() {
    return _assert(this.observer, this.auth, "internal-error"), this.observer.next.bind(this.observer);
  }
};
var R = { async loadJS() {
  throw new Error("Unable to load external scripts");
}, recaptchaV2Script: "", recaptchaEnterpriseScript: "", gapiScript: "" };
function _loadJS(e) {
  return R.loadJS(e);
}
function _generateCallbackName(e) {
  return `__${e}${Math.floor(1e6 * Math.random())}`;
}
var MockGreCAPTCHATopLevel = class {
  constructor() {
    this.enterprise = new MockGreCAPTCHA();
  }
  ready(e) {
    e();
  }
  execute(e, t) {
    return Promise.resolve("token");
  }
  render(e, t) {
    return "";
  }
};
var MockGreCAPTCHA = class {
  ready(e) {
    e();
  }
  execute(e, t) {
    return Promise.resolve("token");
  }
  render(e, t) {
    return "";
  }
};
var C = "NO_RECAPTCHA";
var b = "onFirebaseAuthREInstanceReady";
var RecaptchaEnterpriseVerifier = class _RecaptchaEnterpriseVerifier {
  constructor(e) {
    this.type = "recaptcha-enterprise", this.auth = _castAuth(e);
  }
  async verify(e = "verify", t = false) {
    function retrieveRecaptchaToken(t2, r, n) {
      const i = window.grecaptcha;
      isEnterprise(i) ? i.enterprise.ready((() => {
        i.enterprise.execute(t2, { action: e }).then(((e2) => {
          r(e2);
        })).catch((() => {
          r(C);
        }));
      })) : n(Error("No reCAPTCHA enterprise script loaded."));
    }
    if (this.auth.settings.appVerificationDisabledForTesting) {
      return new MockGreCAPTCHATopLevel().execute("siteKey", { action: "verify" });
    }
    return new Promise(((e2, r) => {
      (async function retrieveSiteKey(e3) {
        if (!t) {
          if (null == e3.tenantId && null != e3._agentRecaptchaConfig) return e3._agentRecaptchaConfig.siteKey;
          if (null != e3.tenantId && void 0 !== e3._tenantRecaptchaConfigs[e3.tenantId]) return e3._tenantRecaptchaConfigs[e3.tenantId].siteKey;
        }
        return new Promise((async (t2, r2) => {
          getRecaptchaConfig(e3, { clientType: "CLIENT_TYPE_WEB", version: "RECAPTCHA_ENTERPRISE" }).then(((n) => {
            if (void 0 !== n.recaptchaKey) {
              const r3 = new RecaptchaConfig(n);
              return null == e3.tenantId ? e3._agentRecaptchaConfig = r3 : e3._tenantRecaptchaConfigs[e3.tenantId] = r3, t2(r3.siteKey);
            }
            r2(new Error("recaptcha Enterprise site key undefined"));
          })).catch(((e4) => {
            r2(e4);
          }));
        }));
      })(this.auth).then((async (n) => {
        if (!t && isEnterprise(window.grecaptcha) && _RecaptchaEnterpriseVerifier.scriptInjectionDeferred) await _RecaptchaEnterpriseVerifier.scriptInjectionDeferred.promise, retrieveRecaptchaToken(n, e2, r);
        else {
          if ("undefined" == typeof window) return void r(new Error("RecaptchaVerifier is only supported in browser"));
          let t2 = (function _recaptchaEnterpriseScriptUrl() {
            return R.recaptchaEnterpriseScript;
          })();
          0 !== t2.length && (t2 += n + `&onload=${b}`), _RecaptchaEnterpriseVerifier.scriptInjectionDeferred = new Deferred2(), window[b] = () => {
            _RecaptchaEnterpriseVerifier.scriptInjectionDeferred?.resolve();
          }, _loadJS(t2).then((() => _RecaptchaEnterpriseVerifier.scriptInjectionDeferred?.promise)).then((() => {
            retrieveRecaptchaToken(n, e2, r);
          })).catch(((e3) => {
            r(e3);
          }));
        }
      })).catch(((e3) => {
        r(e3);
      }));
    }));
  }
};
async function injectRecaptchaFields(e, t, r, n = false, i = false) {
  const s2 = new RecaptchaEnterpriseVerifier(e);
  let o2;
  if (i) o2 = C;
  else try {
    o2 = await s2.verify(r);
  } catch (e2) {
    o2 = await s2.verify(r, true);
  }
  const a2 = { ...t };
  if ("mfaSmsEnrollment" === r || "mfaSmsSignIn" === r) {
    if ("phoneEnrollmentInfo" in a2) {
      const e2 = a2.phoneEnrollmentInfo.phoneNumber, t2 = a2.phoneEnrollmentInfo.recaptchaToken;
      Object.assign(a2, { phoneEnrollmentInfo: { phoneNumber: e2, recaptchaToken: t2, captchaResponse: o2, clientType: "CLIENT_TYPE_WEB", recaptchaVersion: "RECAPTCHA_ENTERPRISE" } });
    } else if ("phoneSignInInfo" in a2) {
      const e2 = a2.phoneSignInInfo.recaptchaToken;
      Object.assign(a2, { phoneSignInInfo: { recaptchaToken: e2, captchaResponse: o2, clientType: "CLIENT_TYPE_WEB", recaptchaVersion: "RECAPTCHA_ENTERPRISE" } });
    }
    return a2;
  }
  return n ? Object.assign(a2, { captchaResp: o2 }) : Object.assign(a2, { captchaResponse: o2 }), Object.assign(a2, { clientType: "CLIENT_TYPE_WEB" }), Object.assign(a2, { recaptchaVersion: "RECAPTCHA_ENTERPRISE" }), a2;
}
async function handleRecaptchaFlow(e, t, r, n, i) {
  if ("EMAIL_PASSWORD_PROVIDER" === i) {
    if (e._getRecaptchaConfig()?.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")) {
      const i2 = await injectRecaptchaFields(e, t, r, "getOobCode" === r);
      return n(e, i2);
    }
    return n(e, t).catch((async (i2) => {
      if ("auth/missing-recaptcha-token" === i2.code) {
        console.log(`${r} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);
        const i3 = await injectRecaptchaFields(e, t, r, "getOobCode" === r);
        return n(e, i3);
      }
      return Promise.reject(i2);
    }));
  }
  if ("PHONE_PROVIDER" === i) {
    if (e._getRecaptchaConfig()?.isProviderEnabled("PHONE_PROVIDER")) {
      const i2 = await injectRecaptchaFields(e, t, r);
      return n(e, i2).catch((async (i3) => {
        if ("AUDIT" === e._getRecaptchaConfig()?.getProviderEnforcementState("PHONE_PROVIDER") && ("auth/missing-recaptcha-token" === i3.code || "auth/invalid-app-credential" === i3.code)) {
          console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${r} flow.`);
          const i4 = await injectRecaptchaFields(e, t, r, false, true);
          return n(e, i4);
        }
        return Promise.reject(i3);
      }));
    }
    {
      const i2 = await injectRecaptchaFields(e, t, r, false, true);
      return n(e, i2);
    }
  }
  return Promise.reject(i + " provider is not supported.");
}
async function _initializeRecaptchaConfig(e) {
  const t = _castAuth(e), r = await getRecaptchaConfig(t, { clientType: "CLIENT_TYPE_WEB", version: "RECAPTCHA_ENTERPRISE" }), n = new RecaptchaConfig(r);
  if (null == t.tenantId ? t._agentRecaptchaConfig = n : t._tenantRecaptchaConfigs[t.tenantId] = n, n.isAnyProviderEnabled()) {
    new RecaptchaEnterpriseVerifier(t).verify().catch((() => {
    }));
  }
}
function initializeAuth(e, t) {
  const r = _getProvider(e, "auth");
  if (r.isInitialized()) {
    const e2 = r.getImmediate();
    if (deepEqual2(r.getOptions(), t ?? {})) return e2;
    _fail(e2, "already-initialized");
  }
  return r.initialize({ options: t });
}
RecaptchaEnterpriseVerifier.scriptInjectionDeferred = null;
var AuthCredential = class {
  constructor(e, t) {
    this.providerId = e, this.signInMethod = t;
  }
  toJSON() {
    return debugFail("not implemented");
  }
  _getIdTokenResponse(e) {
    return debugFail("not implemented");
  }
  _linkToIdToken(e, t) {
    return debugFail("not implemented");
  }
  _getReauthenticationResolver(e) {
    return debugFail("not implemented");
  }
};
async function linkEmailPassword(e, t) {
  return _performApiRequest(e, "POST", "/v1/accounts:signUp", t);
}
async function signInWithPassword(e, t) {
  return _performSignInRequest(e, "POST", "/v1/accounts:signInWithPassword", _addTidIfNecessary(e, t));
}
var EmailAuthCredential = class _EmailAuthCredential extends AuthCredential {
  constructor(e, t, r, n = null) {
    super("password", r), this._email = e, this._password = t, this._tenantId = n;
  }
  static _fromEmailAndPassword(e, t) {
    return new _EmailAuthCredential(e, t, "password");
  }
  static _fromEmailAndCode(e, t, r = null) {
    return new _EmailAuthCredential(e, t, "emailLink", r);
  }
  toJSON() {
    return { email: this._email, password: this._password, signInMethod: this.signInMethod, tenantId: this._tenantId };
  }
  static fromJSON(e) {
    const t = "string" == typeof e ? JSON.parse(e) : e;
    if (t?.email && t?.password) {
      if ("password" === t.signInMethod) return this._fromEmailAndPassword(t.email, t.password);
      if ("emailLink" === t.signInMethod) return this._fromEmailAndCode(t.email, t.password, t.tenantId);
    }
    return null;
  }
  async _getIdTokenResponse(e) {
    switch (this.signInMethod) {
      case "password":
        return handleRecaptchaFlow(e, { returnSecureToken: true, email: this._email, password: this._password, clientType: "CLIENT_TYPE_WEB" }, "signInWithPassword", signInWithPassword, "EMAIL_PASSWORD_PROVIDER");
      case "emailLink":
        return (async function signInWithEmailLink$1(e2, t) {
          return _performSignInRequest(e2, "POST", "/v1/accounts:signInWithEmailLink", _addTidIfNecessary(e2, t));
        })(e, { email: this._email, oobCode: this._password });
      default:
        _fail(e, "internal-error");
    }
  }
  async _linkToIdToken(e, t) {
    switch (this.signInMethod) {
      case "password":
        return handleRecaptchaFlow(e, { idToken: t, returnSecureToken: true, email: this._email, password: this._password, clientType: "CLIENT_TYPE_WEB" }, "signUpPassword", linkEmailPassword, "EMAIL_PASSWORD_PROVIDER");
      case "emailLink":
        return (async function signInWithEmailLinkForLinking(e2, t2) {
          return _performSignInRequest(e2, "POST", "/v1/accounts:signInWithEmailLink", _addTidIfNecessary(e2, t2));
        })(e, { idToken: t, email: this._email, oobCode: this._password });
      default:
        _fail(e, "internal-error");
    }
  }
  _getReauthenticationResolver(e) {
    return this._getIdTokenResponse(e);
  }
};
async function signInWithIdp(e, t) {
  return _performSignInRequest(e, "POST", "/v1/accounts:signInWithIdp", _addTidIfNecessary(e, t));
}
var OAuthCredential = class _OAuthCredential extends AuthCredential {
  constructor() {
    super(...arguments), this.pendingToken = null;
  }
  static _fromParams(e) {
    const t = new _OAuthCredential(e.providerId, e.signInMethod);
    return e.idToken || e.accessToken ? (e.idToken && (t.idToken = e.idToken), e.accessToken && (t.accessToken = e.accessToken), e.nonce && !e.pendingToken && (t.nonce = e.nonce), e.pendingToken && (t.pendingToken = e.pendingToken)) : e.oauthToken && e.oauthTokenSecret ? (t.accessToken = e.oauthToken, t.secret = e.oauthTokenSecret) : _fail("argument-error"), t;
  }
  toJSON() {
    return { idToken: this.idToken, accessToken: this.accessToken, secret: this.secret, nonce: this.nonce, pendingToken: this.pendingToken, providerId: this.providerId, signInMethod: this.signInMethod };
  }
  static fromJSON(e) {
    const t = "string" == typeof e ? JSON.parse(e) : e, { providerId: r, signInMethod: n, ...i } = t;
    if (!r || !n) return null;
    const s2 = new _OAuthCredential(r, n);
    return s2.idToken = i.idToken || void 0, s2.accessToken = i.accessToken || void 0, s2.secret = i.secret, s2.nonce = i.nonce, s2.pendingToken = i.pendingToken || null, s2;
  }
  _getIdTokenResponse(e) {
    return signInWithIdp(e, this.buildRequest());
  }
  _linkToIdToken(e, t) {
    const r = this.buildRequest();
    return r.idToken = t, signInWithIdp(e, r);
  }
  _getReauthenticationResolver(e) {
    const t = this.buildRequest();
    return t.autoCreate = false, signInWithIdp(e, t);
  }
  buildRequest() {
    const e = { requestUri: "http://localhost", returnSecureToken: true };
    if (this.pendingToken) e.pendingToken = this.pendingToken;
    else {
      const t = {};
      this.idToken && (t.id_token = this.idToken), this.accessToken && (t.access_token = this.accessToken), this.secret && (t.oauth_token_secret = this.secret), t.providerId = this.providerId, this.nonce && !this.pendingToken && (t.nonce = this.nonce), e.postBody = querystring(t);
    }
    return e;
  }
};
async function sendPhoneVerificationCode(e, t) {
  return _performApiRequest(e, "POST", "/v1/accounts:sendVerificationCode", _addTidIfNecessary(e, t));
}
var N = { USER_NOT_FOUND: "user-not-found" };
var PhoneAuthCredential = class _PhoneAuthCredential extends AuthCredential {
  constructor(e) {
    super("phone", "phone"), this.params = e;
  }
  static _fromVerification(e, t) {
    return new _PhoneAuthCredential({ verificationId: e, verificationCode: t });
  }
  static _fromTokenResponse(e, t) {
    return new _PhoneAuthCredential({ phoneNumber: e, temporaryProof: t });
  }
  _getIdTokenResponse(e) {
    return (async function signInWithPhoneNumber$1(e2, t) {
      return _performSignInRequest(e2, "POST", "/v1/accounts:signInWithPhoneNumber", _addTidIfNecessary(e2, t));
    })(e, this._makeVerificationRequest());
  }
  _linkToIdToken(e, t) {
    return (async function linkWithPhoneNumber$1(e2, t2) {
      const r = await _performSignInRequest(e2, "POST", "/v1/accounts:signInWithPhoneNumber", _addTidIfNecessary(e2, t2));
      if (r.temporaryProof) throw _makeTaggedError(e2, "account-exists-with-different-credential", r);
      return r;
    })(e, { idToken: t, ...this._makeVerificationRequest() });
  }
  _getReauthenticationResolver(e) {
    return (async function verifyPhoneNumberForExisting(e2, t) {
      return _performSignInRequest(e2, "POST", "/v1/accounts:signInWithPhoneNumber", _addTidIfNecessary(e2, { ...t, operation: "REAUTH" }), N);
    })(e, this._makeVerificationRequest());
  }
  _makeVerificationRequest() {
    const { temporaryProof: e, phoneNumber: t, verificationId: r, verificationCode: n } = this.params;
    return e && t ? { temporaryProof: e, phoneNumber: t } : { sessionInfo: r, code: n };
  }
  toJSON() {
    const e = { providerId: this.providerId };
    return this.params.phoneNumber && (e.phoneNumber = this.params.phoneNumber), this.params.temporaryProof && (e.temporaryProof = this.params.temporaryProof), this.params.verificationCode && (e.verificationCode = this.params.verificationCode), this.params.verificationId && (e.verificationId = this.params.verificationId), e;
  }
  static fromJSON(e) {
    "string" == typeof e && (e = JSON.parse(e));
    const { verificationId: t, verificationCode: r, phoneNumber: n, temporaryProof: i } = e;
    return r || t || n || i ? new _PhoneAuthCredential({ verificationId: t, verificationCode: r, phoneNumber: n, temporaryProof: i }) : null;
  }
};
var ActionCodeURL = class _ActionCodeURL {
  constructor(e) {
    const t = querystringDecode(extractQuerystring(e)), r = t.apiKey ?? null, n = t.oobCode ?? null, i = (function parseMode(e2) {
      switch (e2) {
        case "recoverEmail":
          return "RECOVER_EMAIL";
        case "resetPassword":
          return "PASSWORD_RESET";
        case "signIn":
          return "EMAIL_SIGNIN";
        case "verifyEmail":
          return "VERIFY_EMAIL";
        case "verifyAndChangeEmail":
          return "VERIFY_AND_CHANGE_EMAIL";
        case "revertSecondFactorAddition":
          return "REVERT_SECOND_FACTOR_ADDITION";
        default:
          return null;
      }
    })(t.mode ?? null);
    _assert(r && n && i, "argument-error"), this.apiKey = r, this.operation = i, this.code = n, this.continueUrl = t.continueUrl ?? null, this.languageCode = t.lang ?? null, this.tenantId = t.tenantId ?? null;
  }
  static parseLink(e) {
    const t = (function parseDeepLink(e2) {
      const t2 = querystringDecode(extractQuerystring(e2)).link, r = t2 ? querystringDecode(extractQuerystring(t2)).deep_link_id : null, n = querystringDecode(extractQuerystring(e2)).deep_link_id;
      return (n ? querystringDecode(extractQuerystring(n)).link : null) || n || r || t2 || e2;
    })(e);
    try {
      return new _ActionCodeURL(t);
    } catch {
      return null;
    }
  }
};
var EmailAuthProvider = class _EmailAuthProvider {
  constructor() {
    this.providerId = _EmailAuthProvider.PROVIDER_ID;
  }
  static credential(e, t) {
    return EmailAuthCredential._fromEmailAndPassword(e, t);
  }
  static credentialWithLink(e, t) {
    const r = ActionCodeURL.parseLink(t);
    return _assert(r, "argument-error"), EmailAuthCredential._fromEmailAndCode(e, r.code, r.tenantId);
  }
};
EmailAuthProvider.PROVIDER_ID = "password", EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD = "password", EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD = "emailLink";
var FederatedAuthProvider = class {
  constructor(e) {
    this.providerId = e, this.defaultLanguageCode = null, this.customParameters = {};
  }
  setDefaultLanguage(e) {
    this.defaultLanguageCode = e;
  }
  setCustomParameters(e) {
    return this.customParameters = e, this;
  }
  getCustomParameters() {
    return this.customParameters;
  }
};
var BaseOAuthProvider = class extends FederatedAuthProvider {
  constructor() {
    super(...arguments), this.scopes = [];
  }
  addScope(e) {
    return this.scopes.includes(e) || this.scopes.push(e), this;
  }
  getScopes() {
    return [...this.scopes];
  }
};
var FacebookAuthProvider = class _FacebookAuthProvider extends BaseOAuthProvider {
  constructor() {
    super("facebook.com");
  }
  static credential(e) {
    return OAuthCredential._fromParams({ providerId: _FacebookAuthProvider.PROVIDER_ID, signInMethod: _FacebookAuthProvider.FACEBOOK_SIGN_IN_METHOD, accessToken: e });
  }
  static credentialFromResult(e) {
    return _FacebookAuthProvider.credentialFromTaggedObject(e);
  }
  static credentialFromError(e) {
    return _FacebookAuthProvider.credentialFromTaggedObject(e.customData || {});
  }
  static credentialFromTaggedObject({ _tokenResponse: e }) {
    if (!e || !("oauthAccessToken" in e)) return null;
    if (!e.oauthAccessToken) return null;
    try {
      return _FacebookAuthProvider.credential(e.oauthAccessToken);
    } catch {
      return null;
    }
  }
};
FacebookAuthProvider.FACEBOOK_SIGN_IN_METHOD = "facebook.com", FacebookAuthProvider.PROVIDER_ID = "facebook.com";
var GoogleAuthProvider = class _GoogleAuthProvider extends BaseOAuthProvider {
  constructor() {
    super("google.com"), this.addScope("profile");
  }
  static credential(e, t) {
    return OAuthCredential._fromParams({ providerId: _GoogleAuthProvider.PROVIDER_ID, signInMethod: _GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD, idToken: e, accessToken: t });
  }
  static credentialFromResult(e) {
    return _GoogleAuthProvider.credentialFromTaggedObject(e);
  }
  static credentialFromError(e) {
    return _GoogleAuthProvider.credentialFromTaggedObject(e.customData || {});
  }
  static credentialFromTaggedObject({ _tokenResponse: e }) {
    if (!e) return null;
    const { oauthIdToken: t, oauthAccessToken: r } = e;
    if (!t && !r) return null;
    try {
      return _GoogleAuthProvider.credential(t, r);
    } catch {
      return null;
    }
  }
};
GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD = "google.com", GoogleAuthProvider.PROVIDER_ID = "google.com";
var GithubAuthProvider = class _GithubAuthProvider extends BaseOAuthProvider {
  constructor() {
    super("github.com");
  }
  static credential(e) {
    return OAuthCredential._fromParams({ providerId: _GithubAuthProvider.PROVIDER_ID, signInMethod: _GithubAuthProvider.GITHUB_SIGN_IN_METHOD, accessToken: e });
  }
  static credentialFromResult(e) {
    return _GithubAuthProvider.credentialFromTaggedObject(e);
  }
  static credentialFromError(e) {
    return _GithubAuthProvider.credentialFromTaggedObject(e.customData || {});
  }
  static credentialFromTaggedObject({ _tokenResponse: e }) {
    if (!e || !("oauthAccessToken" in e)) return null;
    if (!e.oauthAccessToken) return null;
    try {
      return _GithubAuthProvider.credential(e.oauthAccessToken);
    } catch {
      return null;
    }
  }
};
GithubAuthProvider.GITHUB_SIGN_IN_METHOD = "github.com", GithubAuthProvider.PROVIDER_ID = "github.com";
var TwitterAuthProvider = class _TwitterAuthProvider extends BaseOAuthProvider {
  constructor() {
    super("twitter.com");
  }
  static credential(e, t) {
    return OAuthCredential._fromParams({ providerId: _TwitterAuthProvider.PROVIDER_ID, signInMethod: _TwitterAuthProvider.TWITTER_SIGN_IN_METHOD, oauthToken: e, oauthTokenSecret: t });
  }
  static credentialFromResult(e) {
    return _TwitterAuthProvider.credentialFromTaggedObject(e);
  }
  static credentialFromError(e) {
    return _TwitterAuthProvider.credentialFromTaggedObject(e.customData || {});
  }
  static credentialFromTaggedObject({ _tokenResponse: e }) {
    if (!e) return null;
    const { oauthAccessToken: t, oauthTokenSecret: r } = e;
    if (!t || !r) return null;
    try {
      return _TwitterAuthProvider.credential(t, r);
    } catch {
      return null;
    }
  }
};
TwitterAuthProvider.TWITTER_SIGN_IN_METHOD = "twitter.com", TwitterAuthProvider.PROVIDER_ID = "twitter.com";
var UserCredentialImpl = class _UserCredentialImpl {
  constructor(e) {
    this.user = e.user, this.providerId = e.providerId, this._tokenResponse = e._tokenResponse, this.operationType = e.operationType;
  }
  static async _fromIdTokenResponse(e, t, r, n = false) {
    const i = await UserImpl._fromIdTokenResponse(e, r, n), s2 = providerIdForResponse(r);
    return new _UserCredentialImpl({ user: i, providerId: s2, _tokenResponse: r, operationType: t });
  }
  static async _forOperation(e, t, r) {
    await e._updateTokensIfNecessary(r, true);
    const n = providerIdForResponse(r);
    return new _UserCredentialImpl({ user: e, providerId: n, _tokenResponse: r, operationType: t });
  }
};
function providerIdForResponse(e) {
  return e.providerId ? e.providerId : "phoneNumber" in e ? "phone" : null;
}
var MultiFactorError = class _MultiFactorError extends FirebaseError2 {
  constructor(e, t, r, n) {
    super(t.code, t.message), this.operationType = r, this.user = n, Object.setPrototypeOf(this, _MultiFactorError.prototype), this.customData = { appName: e.name, tenantId: e.tenantId ?? void 0, _serverResponse: t.customData._serverResponse, operationType: r };
  }
  static _fromErrorAndOperation(e, t, r, n) {
    return new _MultiFactorError(e, t, r, n);
  }
};
function _processCredentialSavingMfaContextIfNecessary(e, t, r, n) {
  return ("reauthenticate" === t ? r._getReauthenticationResolver(e) : r._getIdTokenResponse(e)).catch(((r2) => {
    if ("auth/multi-factor-auth-required" === r2.code) throw MultiFactorError._fromErrorAndOperation(e, r2, t, n);
    throw r2;
  }));
}
async function _link$1(e, t, r = false) {
  const n = await _logoutIfInvalidated(e, t._linkToIdToken(e.auth, await e.getIdToken()), r);
  return UserCredentialImpl._forOperation(e, "link", n);
}
async function _reauthenticate(e, t, r = false) {
  const { auth: i } = e;
  if (_isFirebaseServerApp(i.app)) return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(i));
  const s2 = "reauthenticate";
  try {
    const n = await _logoutIfInvalidated(e, _processCredentialSavingMfaContextIfNecessary(i, s2, t, e), r);
    _assert(n.idToken, i, "internal-error");
    const o2 = _parseToken(n.idToken);
    _assert(o2, i, "internal-error");
    const { sub: a2 } = o2;
    return _assert(e.uid === a2, i, "user-mismatch"), UserCredentialImpl._forOperation(e, s2, n);
  } catch (e2) {
    throw "auth/user-not-found" === e2?.code && _fail(i, "user-mismatch"), e2;
  }
}
async function _signInWithCredential(e, t, r = false) {
  if (_isFirebaseServerApp(e.app)) return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(e));
  const i = "signIn", s2 = await _processCredentialSavingMfaContextIfNecessary(e, i, t), o2 = await UserCredentialImpl._fromIdTokenResponse(e, i, s2);
  return r || await e._updateCurrentUser(o2.user), o2;
}
function signOut(e) {
  return getModularInstance(e).signOut();
}
function startEnrollPhoneMfa(e, t) {
  return _performApiRequest(e, "POST", "/v2/accounts/mfaEnrollment:start", _addTidIfNecessary(e, t));
}
var D = "__sak";
var BrowserPersistenceClass = class {
  constructor(e, t) {
    this.storageRetriever = e, this.type = t;
  }
  _isAvailable() {
    try {
      return this.storage ? (this.storage.setItem(D, "1"), this.storage.removeItem(D), Promise.resolve(true)) : Promise.resolve(false);
    } catch {
      return Promise.resolve(false);
    }
  }
  _set(e, t) {
    return this.storage.setItem(e, JSON.stringify(t)), Promise.resolve();
  }
  _get(e) {
    const t = this.storage.getItem(e);
    return Promise.resolve(t ? JSON.parse(t) : null);
  }
  _remove(e) {
    return this.storage.removeItem(e), Promise.resolve();
  }
  get storage() {
    return this.storageRetriever();
  }
};
var BrowserLocalPersistence = class extends BrowserPersistenceClass {
  constructor() {
    super((() => window.localStorage), "LOCAL"), this.boundEventHandler = (e, t) => this.onStorageEvent(e, t), this.listeners = {}, this.localCache = {}, this.pollTimer = null, this.fallbackToPolling = _isMobileBrowser(), this._shouldAllowMigration = true;
  }
  forAllChangedKeys(e) {
    for (const t of Object.keys(this.listeners)) {
      const r = this.storage.getItem(t), n = this.localCache[t];
      r !== n && e(t, n, r);
    }
  }
  onStorageEvent(e, t = false) {
    if (!e.key) return void this.forAllChangedKeys(((e2, t2, r2) => {
      this.notifyListeners(e2, r2);
    }));
    const r = e.key;
    t ? this.detachListener() : this.stopPolling();
    const triggerListeners = () => {
      const e2 = this.storage.getItem(r);
      (t || this.localCache[r] !== e2) && this.notifyListeners(r, e2);
    }, n = this.storage.getItem(r);
    _isIE10() && n !== e.newValue && e.newValue !== e.oldValue ? setTimeout(triggerListeners, 10) : triggerListeners();
  }
  notifyListeners(e, t) {
    this.localCache[e] = t;
    const r = this.listeners[e];
    if (r) for (const e2 of Array.from(r)) e2(t ? JSON.parse(t) : t);
  }
  startPolling() {
    this.stopPolling(), this.pollTimer = setInterval((() => {
      this.forAllChangedKeys(((e, t, r) => {
        this.onStorageEvent(new StorageEvent("storage", { key: e, oldValue: t, newValue: r }), true);
      }));
    }), 1e3);
  }
  stopPolling() {
    this.pollTimer && (clearInterval(this.pollTimer), this.pollTimer = null);
  }
  attachListener() {
    window.addEventListener("storage", this.boundEventHandler);
  }
  detachListener() {
    window.removeEventListener("storage", this.boundEventHandler);
  }
  _addListener(e, t) {
    0 === Object.keys(this.listeners).length && (this.fallbackToPolling ? this.startPolling() : this.attachListener()), this.listeners[e] || (this.listeners[e] = /* @__PURE__ */ new Set(), this.localCache[e] = this.storage.getItem(e)), this.listeners[e].add(t);
  }
  _removeListener(e, t) {
    this.listeners[e] && (this.listeners[e].delete(t), 0 === this.listeners[e].size && delete this.listeners[e]), 0 === Object.keys(this.listeners).length && (this.detachListener(), this.stopPolling());
  }
  async _set(e, t) {
    await super._set(e, t), this.localCache[e] = JSON.stringify(t);
  }
  async _get(e) {
    const t = await super._get(e);
    return this.localCache[e] = JSON.stringify(t), t;
  }
  async _remove(e) {
    await super._remove(e), delete this.localCache[e];
  }
};
BrowserLocalPersistence.type = "LOCAL";
function getDocumentCookie(e) {
  const t = e.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&"), r = RegExp(`${t}=([^;]+)`);
  return document.cookie.match(r)?.[1] ?? null;
}
function getCookieName(e) {
  return `${"http:" === window.location.protocol ? "__dev_" : "__HOST-"}FIREBASE_${e.split(":")[3]}`;
}
var CookiePersistence = class {
  constructor() {
    this.type = "COOKIE", this.listenerUnsubscribes = /* @__PURE__ */ new Map();
  }
  _getFinalTarget(e) {
    if (void 0 === typeof window) return e;
    const t = new URL(`${window.location.origin}/__cookies__`);
    return t.searchParams.set("finalTarget", e), t;
  }
  async _isAvailable() {
    return !("boolean" == typeof isSecureContext && !isSecureContext) && ("undefined" != typeof navigator && "undefined" != typeof document && (navigator.cookieEnabled ?? true));
  }
  async _set(e, t) {
  }
  async _get(e) {
    if (!this._isAvailable()) return null;
    const t = getCookieName(e);
    if (window.cookieStore) {
      const e2 = await window.cookieStore.get(t);
      return e2?.value;
    }
    return getDocumentCookie(t);
  }
  async _remove(e) {
    if (!this._isAvailable()) return;
    if (!await this._get(e)) return;
    const t = getCookieName(e);
    document.cookie = `${t}=;Max-Age=34560000;Partitioned;Secure;SameSite=Strict;Path=/;Priority=High`, await fetch("/__cookies__", { method: "DELETE" }).catch((() => {
    }));
  }
  _addListener(e, t) {
    if (!this._isAvailable()) return;
    const r = getCookieName(e);
    if (window.cookieStore) {
      const cb = (e2) => {
        const n2 = e2.changed.find(((e3) => e3.name === r));
        n2 && t(n2.value);
        e2.deleted.find(((e3) => e3.name === r)) && t(null);
      }, unsubscribe = () => window.cookieStore.removeEventListener("change", cb);
      return this.listenerUnsubscribes.set(t, unsubscribe), window.cookieStore.addEventListener("change", cb);
    }
    let n = getDocumentCookie(r);
    const i = setInterval((() => {
      const e2 = getDocumentCookie(r);
      e2 !== n && (t(e2), n = e2);
    }), 1e3);
    this.listenerUnsubscribes.set(t, (() => clearInterval(i)));
  }
  _removeListener(e, t) {
    const r = this.listenerUnsubscribes.get(t);
    r && (r(), this.listenerUnsubscribes.delete(t));
  }
};
CookiePersistence.type = "COOKIE";
var BrowserSessionPersistence = class extends BrowserPersistenceClass {
  constructor() {
    super((() => window.sessionStorage), "SESSION");
  }
  _addListener(e, t) {
  }
  _removeListener(e, t) {
  }
};
BrowserSessionPersistence.type = "SESSION";
var U = BrowserSessionPersistence;
var Receiver = class _Receiver {
  constructor(e) {
    this.eventTarget = e, this.handlersMap = {}, this.boundEventHandler = this.handleEvent.bind(this);
  }
  static _getInstance(e) {
    const t = this.receivers.find(((t2) => t2.isListeningto(e)));
    if (t) return t;
    const r = new _Receiver(e);
    return this.receivers.push(r), r;
  }
  isListeningto(e) {
    return this.eventTarget === e;
  }
  async handleEvent(e) {
    const t = e, { eventId: r, eventType: n, data: i } = t.data, s2 = this.handlersMap[n];
    if (!s2?.size) return;
    t.ports[0].postMessage({ status: "ack", eventId: r, eventType: n });
    const o2 = Array.from(s2).map((async (e2) => e2(t.origin, i))), a2 = await (function _allSettled(e2) {
      return Promise.all(e2.map((async (e3) => {
        try {
          return { fulfilled: true, value: await e3 };
        } catch (e4) {
          return { fulfilled: false, reason: e4 };
        }
      })));
    })(o2);
    t.ports[0].postMessage({ status: "done", eventId: r, eventType: n, response: a2 });
  }
  _subscribe(e, t) {
    0 === Object.keys(this.handlersMap).length && this.eventTarget.addEventListener("message", this.boundEventHandler), this.handlersMap[e] || (this.handlersMap[e] = /* @__PURE__ */ new Set()), this.handlersMap[e].add(t);
  }
  _unsubscribe(e, t) {
    this.handlersMap[e] && t && this.handlersMap[e].delete(t), t && 0 !== this.handlersMap[e].size || delete this.handlersMap[e], 0 === Object.keys(this.handlersMap).length && this.eventTarget.removeEventListener("message", this.boundEventHandler);
  }
};
function _generateEventId(e = "", t = 10) {
  let r = "";
  for (let e2 = 0; e2 < t; e2++) r += Math.floor(10 * Math.random());
  return e + r;
}
Receiver.receivers = [];
var Sender = class {
  constructor(e) {
    this.target = e, this.handlers = /* @__PURE__ */ new Set();
  }
  removeMessageHandler(e) {
    e.messageChannel && (e.messageChannel.port1.removeEventListener("message", e.onMessage), e.messageChannel.port1.close()), this.handlers.delete(e);
  }
  async _send(e, t, r = 50) {
    const n = "undefined" != typeof MessageChannel ? new MessageChannel() : null;
    if (!n) throw new Error("connection_unavailable");
    let i, s2;
    return new Promise(((o2, a2) => {
      const c2 = _generateEventId("", 20);
      n.port1.start();
      const u2 = setTimeout((() => {
        a2(new Error("unsupported_event"));
      }), r);
      s2 = { messageChannel: n, onMessage(e2) {
        const t2 = e2;
        if (t2.data.eventId === c2) switch (t2.data.status) {
          case "ack":
            clearTimeout(u2), i = setTimeout((() => {
              a2(new Error("timeout"));
            }), 3e3);
            break;
          case "done":
            clearTimeout(i), o2(t2.data.response);
            break;
          default:
            clearTimeout(u2), clearTimeout(i), a2(new Error("invalid_response"));
        }
      } }, this.handlers.add(s2), n.port1.addEventListener("message", s2.onMessage), this.target.postMessage({ eventType: e, eventId: c2, data: t }, [n.port2]);
    })).finally((() => {
      s2 && this.removeMessageHandler(s2);
    }));
  }
};
function _window() {
  return window;
}
function _isWorker() {
  return void 0 !== _window().WorkerGlobalScope && "function" == typeof _window().importScripts;
}
var F = "firebaseLocalStorageDb";
var V = "firebaseLocalStorage";
var W = "fbase_key";
var DBPromise = class {
  constructor(e) {
    this.request = e;
  }
  toPromise() {
    return new Promise(((e, t) => {
      this.request.addEventListener("success", (() => {
        e(this.request.result);
      })), this.request.addEventListener("error", (() => {
        t(this.request.error);
      }));
    }));
  }
};
function getObjectStore(e, t) {
  return e.transaction([V], t ? "readwrite" : "readonly").objectStore(V);
}
function _openDatabase() {
  const e = indexedDB.open(F, 1);
  return new Promise(((t, r) => {
    e.addEventListener("error", (() => {
      r(e.error);
    })), e.addEventListener("upgradeneeded", (() => {
      const t2 = e.result;
      try {
        t2.createObjectStore(V, { keyPath: W });
      } catch (e2) {
        r(e2);
      }
    })), e.addEventListener("success", (async () => {
      const r2 = e.result;
      r2.objectStoreNames.contains(V) ? t(r2) : (r2.close(), await (function _deleteDatabase() {
        const e2 = indexedDB.deleteDatabase(F);
        return new DBPromise(e2).toPromise();
      })(), t(await _openDatabase()));
    }));
  }));
}
async function _putObject(e, t, r) {
  const n = getObjectStore(e, true).put({ [W]: t, value: r });
  return new DBPromise(n).toPromise();
}
function _deleteObject(e, t) {
  const r = getObjectStore(e, true).delete(t);
  return new DBPromise(r).toPromise();
}
var IndexedDBLocalPersistence = class {
  registerLifecycleListeners() {
    "undefined" != typeof window && "function" == typeof window.addEventListener && (window.addEventListener("pagehide", this.onPageHide), window.addEventListener("pageshow", this.onPageShow));
  }
  unregisterLifecycleListeners() {
    "undefined" != typeof window && "function" == typeof window.removeEventListener && (window.removeEventListener("pagehide", this.onPageHide), window.removeEventListener("pageshow", this.onPageShow));
  }
  constructor() {
    this.type = "LOCAL", this.dbPromise = null, this._shouldAllowMigration = true, this.listeners = {}, this.localCache = {}, this.pollTimer = null, this.isClosing = false, this.pendingWrites = 0, this.receiver = null, this.sender = null, this.serviceWorkerReceiverAvailable = false, this.activeServiceWorker = null, this.onPageHide = () => {
      this.isClosing = true, this.stopPolling(), this.dbPromise && (this.dbPromise.then(((e) => e.close())).catch((() => {
      })), this.dbPromise = null);
    }, this.onPageShow = () => {
      this.isClosing && (this.isClosing = false, Object.keys(this.listeners).length > 0 && this.startPolling());
    }, this._workerInitializationPromise = this.initializeServiceWorkerMessaging().then((() => {
    }), (() => {
    }));
  }
  async _openDb() {
    return this.dbPromise || (this.dbPromise = _openDatabase(), this.dbPromise.catch((() => {
      this.dbPromise = null;
    }))), this.dbPromise;
  }
  async _withRetries(e) {
    let t = 0;
    for (; ; ) try {
      const t2 = await this._openDb();
      return await e(t2);
    } catch (e2) {
      if (t++ > 3) throw e2;
      if (this.dbPromise) {
        const e3 = this.dbPromise;
        this.dbPromise = null;
        try {
          (await e3).close();
        } catch {
        }
      }
    }
  }
  async initializeServiceWorkerMessaging() {
    return _isWorker() ? this.initializeReceiver() : this.initializeSender();
  }
  async initializeReceiver() {
    this.receiver = Receiver._getInstance((function _getWorkerGlobalScope() {
      return _isWorker() ? self : null;
    })()), this.receiver._subscribe("keyChanged", (async (e, t) => ({ keyProcessed: (await this._poll()).includes(t.key) }))), this.receiver._subscribe("ping", (async (e, t) => ["keyChanged"]));
  }
  async initializeSender() {
    if (this.activeServiceWorker = await (async function _getActiveServiceWorker() {
      if (!navigator?.serviceWorker) return null;
      try {
        return (await navigator.serviceWorker.ready).active;
      } catch {
        return null;
      }
    })(), !this.activeServiceWorker) return;
    this.sender = new Sender(this.activeServiceWorker);
    const e = await this.sender._send("ping", {}, 800);
    e && e[0]?.fulfilled && e[0]?.value.includes("keyChanged") && (this.serviceWorkerReceiverAvailable = true);
  }
  async notifyServiceWorker(e) {
    if (this.sender && this.activeServiceWorker && (function _getServiceWorkerController() {
      return navigator?.serviceWorker?.controller || null;
    })() === this.activeServiceWorker) try {
      await this.sender._send("keyChanged", { key: e }, this.serviceWorkerReceiverAvailable ? 800 : 50);
    } catch {
    }
  }
  async _isAvailable() {
    try {
      return !!indexedDB && (await this._withRetries((async (e) => {
        await _putObject(e, D, "1"), await _deleteObject(e, D);
      })), true);
    } catch {
    }
    return false;
  }
  async _withPendingWrite(e) {
    this.pendingWrites++;
    try {
      await e();
    } finally {
      this.pendingWrites--;
    }
  }
  async _set(e, t) {
    return this._withPendingWrite((async () => (await this._withRetries(((r) => _putObject(r, e, t))), this.localCache[e] = t, this.notifyServiceWorker(e))));
  }
  async _get(e) {
    const t = await this._withRetries(((t2) => (async function getObject(e2, t3) {
      const r = getObjectStore(e2, false).get(t3), n = await new DBPromise(r).toPromise();
      return void 0 === n ? null : n.value;
    })(t2, e)));
    return this.localCache[e] = t, t;
  }
  async _remove(e) {
    return this._withPendingWrite((async () => (await this._withRetries(((t) => _deleteObject(t, e))), delete this.localCache[e], this.notifyServiceWorker(e))));
  }
  async _poll() {
    if (this.isClosing) return [];
    try {
      const e = await this._withRetries(((e2) => {
        const t2 = getObjectStore(e2, false).getAll();
        return new DBPromise(t2).toPromise();
      }));
      if (this.isClosing) return [];
      if (!e) return [];
      if (0 !== this.pendingWrites) return [];
      const t = [], r = /* @__PURE__ */ new Set();
      if (0 !== e.length) for (const { fbase_key: n, value: i } of e) r.add(n), JSON.stringify(this.localCache[n]) !== JSON.stringify(i) && (this.notifyListeners(n, i), t.push(n));
      for (const e2 of Object.keys(this.localCache)) this.localCache[e2] && !r.has(e2) && (this.notifyListeners(e2, null), t.push(e2));
      return t;
    } catch (e) {
      return this.isClosing || _logWarn(`Firebase Auth cross-tab polling failed with error: ${e}`), [];
    }
  }
  notifyListeners(e, t) {
    this.localCache[e] = t;
    const r = this.listeners[e];
    if (r) for (const e2 of Array.from(r)) e2(t);
  }
  startPolling() {
    this.stopPolling(), this.pollTimer = setInterval((async () => this._poll()), 800);
  }
  stopPolling() {
    this.pollTimer && (clearInterval(this.pollTimer), this.pollTimer = null);
  }
  _addListener(e, t) {
    0 === Object.keys(this.listeners).length && (this.startPolling(), this.registerLifecycleListeners()), this.listeners[e] || (this.listeners[e] = /* @__PURE__ */ new Set(), this._get(e).catch((() => {
    }))), this.listeners[e].add(t);
  }
  _removeListener(e, t) {
    this.listeners[e] && (this.listeners[e].delete(t), 0 === this.listeners[e].size && delete this.listeners[e]), 0 === Object.keys(this.listeners).length && (this.stopPolling(), this.unregisterLifecycleListeners());
  }
};
IndexedDBLocalPersistence.type = "LOCAL";
function startSignInPhoneMfa(e, t) {
  return _performApiRequest(e, "POST", "/v2/accounts/mfaSignIn:start", _addTidIfNecessary(e, t));
}
var H = _generateCallbackName("rcb");
var j = new Delay(3e4, 6e4);
var q = "recaptcha";
async function _verifyPhoneNumber(e, t, r) {
  if (!e._getRecaptchaConfig()) try {
    await _initializeRecaptchaConfig(e);
  } catch (e2) {
    console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.");
  }
  try {
    let n;
    if (n = "string" == typeof t ? { phoneNumber: t } : t, "session" in n) {
      const t2 = n.session;
      if ("phoneNumber" in n) {
        _assert("enroll" === t2.type, e, "internal-error");
        const i = { idToken: t2.credential, phoneEnrollmentInfo: { phoneNumber: n.phoneNumber, clientType: "CLIENT_TYPE_WEB" } }, s2 = handleRecaptchaFlow(e, i, "mfaSmsEnrollment", (async (e2, t3) => {
          if (t3.phoneEnrollmentInfo.captchaResponse === C) {
            _assert(r?.type === q, e2, "argument-error");
            return startEnrollPhoneMfa(e2, await injectRecaptchaV2Token(e2, t3, r));
          }
          return startEnrollPhoneMfa(e2, t3);
        }), "PHONE_PROVIDER");
        return (await s2.catch(((e2) => Promise.reject(e2)))).phoneSessionInfo.sessionInfo;
      }
      {
        _assert("signin" === t2.type, e, "internal-error");
        const i = n.multiFactorHint?.uid || n.multiFactorUid;
        _assert(i, e, "missing-multi-factor-info");
        const s2 = { mfaPendingCredential: t2.credential, mfaEnrollmentId: i, phoneSignInInfo: { clientType: "CLIENT_TYPE_WEB" } }, o2 = handleRecaptchaFlow(e, s2, "mfaSmsSignIn", (async (e2, t3) => {
          if (t3.phoneSignInInfo.captchaResponse === C) {
            _assert(r?.type === q, e2, "argument-error");
            return startSignInPhoneMfa(e2, await injectRecaptchaV2Token(e2, t3, r));
          }
          return startSignInPhoneMfa(e2, t3);
        }), "PHONE_PROVIDER");
        return (await o2.catch(((e2) => Promise.reject(e2)))).phoneResponseInfo.sessionInfo;
      }
    }
    {
      const t2 = { phoneNumber: n.phoneNumber, clientType: "CLIENT_TYPE_WEB" }, i = handleRecaptchaFlow(e, t2, "sendVerificationCode", (async (e2, t3) => {
        if (t3.captchaResponse === C) {
          _assert(r?.type === q, e2, "argument-error");
          return sendPhoneVerificationCode(e2, await injectRecaptchaV2Token(e2, t3, r));
        }
        return sendPhoneVerificationCode(e2, t3);
      }), "PHONE_PROVIDER");
      return (await i.catch(((e2) => Promise.reject(e2)))).sessionInfo;
    }
  } finally {
    r?._reset();
  }
}
async function injectRecaptchaV2Token(e, t, r) {
  _assert(r.type === q, e, "argument-error");
  const n = await r.verify();
  _assert("string" == typeof n, e, "argument-error");
  const i = { ...t };
  if ("phoneEnrollmentInfo" in i) {
    const e2 = i.phoneEnrollmentInfo.phoneNumber, t2 = i.phoneEnrollmentInfo.captchaResponse, r2 = i.phoneEnrollmentInfo.clientType, s2 = i.phoneEnrollmentInfo.recaptchaVersion;
    return Object.assign(i, { phoneEnrollmentInfo: { phoneNumber: e2, recaptchaToken: n, captchaResponse: t2, clientType: r2, recaptchaVersion: s2 } }), i;
  }
  if ("phoneSignInInfo" in i) {
    const e2 = i.phoneSignInInfo.captchaResponse, t2 = i.phoneSignInInfo.clientType, r2 = i.phoneSignInInfo.recaptchaVersion;
    return Object.assign(i, { phoneSignInInfo: { recaptchaToken: n, captchaResponse: e2, clientType: t2, recaptchaVersion: r2 } }), i;
  }
  return Object.assign(i, { recaptchaToken: n }), i;
}
var PhoneAuthProvider = class _PhoneAuthProvider {
  constructor(e) {
    this.providerId = _PhoneAuthProvider.PROVIDER_ID, this.auth = _castAuth(e);
  }
  verifyPhoneNumber(e, t) {
    return _verifyPhoneNumber(this.auth, e, getModularInstance(t));
  }
  static credential(e, t) {
    return PhoneAuthCredential._fromVerification(e, t);
  }
  static credentialFromResult(e) {
    const t = e;
    return _PhoneAuthProvider.credentialFromTaggedObject(t);
  }
  static credentialFromError(e) {
    return _PhoneAuthProvider.credentialFromTaggedObject(e.customData || {});
  }
  static credentialFromTaggedObject({ _tokenResponse: e }) {
    if (!e) return null;
    const { phoneNumber: t, temporaryProof: r } = e;
    return t && r ? PhoneAuthCredential._fromTokenResponse(t, r) : null;
  }
};
function _withDefaultResolver(e, t) {
  return t ? _getInstance(t) : (_assert(e._popupRedirectResolver, e, "argument-error"), e._popupRedirectResolver);
}
PhoneAuthProvider.PROVIDER_ID = "phone", PhoneAuthProvider.PHONE_SIGN_IN_METHOD = "phone";
var IdpCredential = class extends AuthCredential {
  constructor(e) {
    super("custom", "custom"), this.params = e;
  }
  _getIdTokenResponse(e) {
    return signInWithIdp(e, this._buildIdpRequest());
  }
  _linkToIdToken(e, t) {
    return signInWithIdp(e, this._buildIdpRequest(t));
  }
  _getReauthenticationResolver(e) {
    return signInWithIdp(e, this._buildIdpRequest());
  }
  _buildIdpRequest(e) {
    const t = { requestUri: this.params.requestUri, sessionId: this.params.sessionId, postBody: this.params.postBody, tenantId: this.params.tenantId, pendingToken: this.params.pendingToken, returnSecureToken: true, returnIdpCredential: true };
    return e && (t.idToken = e), t;
  }
};
function _signIn(e) {
  return _signInWithCredential(e.auth, new IdpCredential(e), e.bypassAuthState);
}
function _reauth(e) {
  const { auth: t, user: r } = e;
  return _assert(r, t, "internal-error"), _reauthenticate(r, new IdpCredential(e), e.bypassAuthState);
}
async function _link(e) {
  const { auth: t, user: r } = e;
  return _assert(r, t, "internal-error"), _link$1(r, new IdpCredential(e), e.bypassAuthState);
}
var AbstractPopupRedirectOperation = class {
  constructor(e, t, r, n, i = false) {
    this.auth = e, this.resolver = r, this.user = n, this.bypassAuthState = i, this.pendingPromise = null, this.eventManager = null, this.filter = Array.isArray(t) ? t : [t];
  }
  execute() {
    return new Promise((async (e, t) => {
      this.pendingPromise = { resolve: e, reject: t };
      try {
        if (this.eventManager = await this.resolver._initialize(this.auth), !this.pendingPromise) return;
        if (await this.onExecution(), !this.pendingPromise) return;
        this.eventManager.registerConsumer(this);
      } catch (e2) {
        this.pendingPromise && this.reject(e2);
      }
    }));
  }
  async onAuthEvent(e) {
    if (!this.pendingPromise) return;
    const { urlResponse: t, sessionId: r, postBody: n, tenantId: i, error: s2, type: o2 } = e;
    if (s2) return void this.reject(s2);
    const a2 = { auth: this.auth, requestUri: t, sessionId: r, tenantId: i || void 0, postBody: n || void 0, user: this.user, bypassAuthState: this.bypassAuthState };
    try {
      this.resolve(await this.getIdpTask(o2)(a2));
    } catch (e2) {
      this.reject(e2);
    }
  }
  onError(e) {
    this.reject(e);
  }
  getIdpTask(e) {
    switch (e) {
      case "signInViaPopup":
      case "signInViaRedirect":
        return _signIn;
      case "linkViaPopup":
      case "linkViaRedirect":
        return _link;
      case "reauthViaPopup":
      case "reauthViaRedirect":
        return _reauth;
      default:
        _fail(this.auth, "internal-error");
    }
  }
  resolve(e) {
    debugAssert(this.pendingPromise, "Pending promise was never set"), this.pendingPromise.resolve(e), this.unregisterAndCleanUp();
  }
  reject(e) {
    debugAssert(this.pendingPromise, "Pending promise was never set"), this.pendingPromise.reject(e), this.unregisterAndCleanUp();
  }
  unregisterAndCleanUp() {
    this.eventManager && this.eventManager.unregisterConsumer(this), this.pendingPromise = null, this.cleanUp();
  }
};
var B = new Delay(2e3, 1e4);
async function signInWithPopup(e, t, r) {
  if (_isFirebaseServerApp(e.app)) return Promise.reject(_createError(e, "operation-not-supported-in-this-environment"));
  const i = _castAuth(e);
  _assertInstanceOf(e, t, FederatedAuthProvider);
  const s2 = _withDefaultResolver(i, r);
  return new PopupOperation(i, "signInViaPopup", t, s2).executeNotNull();
}
var PopupOperation = class _PopupOperation extends AbstractPopupRedirectOperation {
  constructor(e, t, r, n, i) {
    super(e, t, n, i), this.provider = r, this.authWindow = null, this.pollId = null, _PopupOperation.currentPopupAction && _PopupOperation.currentPopupAction.cancel(), _PopupOperation.currentPopupAction = this;
  }
  async executeNotNull() {
    const e = await this.execute();
    return _assert(e, this.auth, "internal-error"), e;
  }
  async onExecution() {
    debugAssert(1 === this.filter.length, "Popup operations only handle one event");
    const e = _generateEventId();
    this.authWindow = await this.resolver._openPopup(this.auth, this.provider, this.filter[0], e), this.authWindow.associatedEvent = e, this.resolver._originValidation(this.auth).catch(((e2) => {
      this.reject(e2);
    })), this.resolver._isIframeWebStorageSupported(this.auth, ((e2) => {
      e2 || this.reject(_createError(this.auth, "web-storage-unsupported"));
    })), this.pollUserCancellation();
  }
  get eventId() {
    return this.authWindow?.associatedEvent || null;
  }
  cancel() {
    this.reject(_createError(this.auth, "cancelled-popup-request"));
  }
  cleanUp() {
    this.authWindow && this.authWindow.close(), this.pollId && window.clearTimeout(this.pollId), this.authWindow = null, this.pollId = null, _PopupOperation.currentPopupAction = null;
  }
  pollUserCancellation() {
    const poll = () => {
      this.authWindow?.window?.closed ? this.pollId = window.setTimeout((() => {
        this.pollId = null, this.reject(_createError(this.auth, "popup-closed-by-user"));
      }), 8e3) : this.pollId = window.setTimeout(poll, B.get());
    };
    poll();
  }
};
PopupOperation.currentPopupAction = null;
var z = /* @__PURE__ */ new Map();
var RedirectAction = class extends AbstractPopupRedirectOperation {
  constructor(e, t, r = false) {
    super(e, ["signInViaRedirect", "linkViaRedirect", "reauthViaRedirect", "unknown"], t, void 0, r), this.eventId = null;
  }
  async execute() {
    let e = z.get(this.auth._key());
    if (!e) {
      try {
        const t = await (async function _getAndClearPendingRedirectStatus(e2, t2) {
          const r = pendingRedirectKey(t2), n = resolverPersistence(e2);
          if (!await n._isAvailable()) return false;
          const i = "true" === await n._get(r);
          return await n._remove(r), i;
        })(this.resolver, this.auth) ? await super.execute() : null;
        e = () => Promise.resolve(t);
      } catch (t) {
        e = () => Promise.reject(t);
      }
      z.set(this.auth._key(), e);
    }
    return this.bypassAuthState || z.set(this.auth._key(), (() => Promise.resolve(null))), e();
  }
  async onAuthEvent(e) {
    if ("signInViaRedirect" === e.type) return super.onAuthEvent(e);
    if ("unknown" !== e.type) {
      if (e.eventId) {
        const t = await this.auth._redirectUserForId(e.eventId);
        if (t) return this.user = t, super.onAuthEvent(e);
        this.resolve(null);
      }
    } else this.resolve(null);
  }
  async onExecution() {
  }
  cleanUp() {
  }
};
function _overrideRedirectResult(e, t) {
  z.set(e._key(), t);
}
function resolverPersistence(e) {
  return _getInstance(e._redirectPersistence);
}
function pendingRedirectKey(e) {
  return _persistenceKeyName("pendingRedirect", e.config.apiKey, e.name);
}
async function _getRedirectResult(e, t, r = false) {
  if (_isFirebaseServerApp(e.app)) return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(e));
  const i = _castAuth(e), s2 = _withDefaultResolver(i, t), o2 = new RedirectAction(i, s2, r), a2 = await o2.execute();
  return a2 && !r && (delete a2.user._redirectEventId, await i._persistUserIfCurrent(a2.user), await i._setRedirectUser(null, t)), a2;
}
var AuthEventManager = class {
  constructor(e) {
    this.auth = e, this.cachedEventUids = /* @__PURE__ */ new Set(), this.consumers = /* @__PURE__ */ new Set(), this.queuedRedirectEvent = null, this.hasHandledPotentialRedirect = false, this.lastProcessedEventTime = Date.now();
  }
  registerConsumer(e) {
    this.consumers.add(e), this.queuedRedirectEvent && this.isEventForConsumer(this.queuedRedirectEvent, e) && (this.sendToConsumer(this.queuedRedirectEvent, e), this.saveEventToCache(this.queuedRedirectEvent), this.queuedRedirectEvent = null);
  }
  unregisterConsumer(e) {
    this.consumers.delete(e);
  }
  onEvent(e) {
    if (this.hasEventBeenHandled(e)) return false;
    let t = false;
    return this.consumers.forEach(((r) => {
      this.isEventForConsumer(e, r) && (t = true, this.sendToConsumer(e, r), this.saveEventToCache(e));
    })), this.hasHandledPotentialRedirect || !(function isRedirectEvent(e2) {
      switch (e2.type) {
        case "signInViaRedirect":
        case "linkViaRedirect":
        case "reauthViaRedirect":
          return true;
        case "unknown":
          return isNullRedirectEvent(e2);
        default:
          return false;
      }
    })(e) || (this.hasHandledPotentialRedirect = true, t || (this.queuedRedirectEvent = e, t = true)), t;
  }
  sendToConsumer(e, t) {
    if (e.error && !isNullRedirectEvent(e)) {
      const r = e.error.code?.split("auth/")[1] || "internal-error";
      t.onError(_createError(this.auth, r));
    } else t.onAuthEvent(e);
  }
  isEventForConsumer(e, t) {
    const r = null === t.eventId || !!e.eventId && e.eventId === t.eventId;
    return t.filter.includes(e.type) && r;
  }
  hasEventBeenHandled(e) {
    return Date.now() - this.lastProcessedEventTime >= 6e5 && this.cachedEventUids.clear(), this.cachedEventUids.has(eventUid(e));
  }
  saveEventToCache(e) {
    this.cachedEventUids.add(eventUid(e)), this.lastProcessedEventTime = Date.now();
  }
};
function eventUid(e) {
  return [e.type, e.eventId, e.sessionId, e.tenantId].filter(((e2) => e2)).join("-");
}
function isNullRedirectEvent({ type: e, error: t }) {
  return "unknown" === e && "auth/no-auth-event" === t?.code;
}
var $ = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
var K = /^https?/;
async function _validateOrigin(e) {
  if (e.config.emulator) return;
  const { authorizedDomains: t } = await (async function _getProjectConfig(e2, t2 = {}) {
    return _performApiRequest(e2, "GET", "/v1/projects", t2);
  })(e);
  for (const e2 of t) try {
    if (matchDomain(e2)) return;
  } catch {
  }
  _fail(e, "unauthorized-domain");
}
function matchDomain(e) {
  const t = _getCurrentUrl(), { protocol: r, hostname: n } = new URL(t);
  if (e.startsWith("chrome-extension://")) {
    const i2 = new URL(e);
    return "" === i2.hostname && "" === n ? "chrome-extension:" === r && e.replace("chrome-extension://", "") === t.replace("chrome-extension://", "") : "chrome-extension:" === r && i2.hostname === n;
  }
  if (!K.test(r)) return false;
  if ($.test(e)) return n === e;
  const i = e.replace(/\./g, "\\.");
  return new RegExp("^(.+\\." + i + "|" + i + ")$", "i").test(n);
}
var J = new Delay(3e4, 6e4);
function resetUnloadedGapiModules() {
  const e = _window().___jsl;
  if (e?.H) {
    for (const t of Object.keys(e.H)) if (e.H[t].r = e.H[t].r || [], e.H[t].L = e.H[t].L || [], e.H[t].r = [...e.H[t].L], e.CP) for (let t2 = 0; t2 < e.CP.length; t2++) e.CP[t2] = null;
  }
}
function loadGapi(e) {
  return new Promise(((t, r) => {
    function loadGapiIframe() {
      resetUnloadedGapiModules(), gapi.load("gapi.iframes", { callback: () => {
        t(gapi.iframes.getContext());
      }, ontimeout: () => {
        resetUnloadedGapiModules(), r(_createError(e, "network-request-failed"));
      }, timeout: J.get() });
    }
    if (_window().gapi?.iframes?.Iframe) t(gapi.iframes.getContext());
    else {
      if (!_window().gapi?.load) {
        const t2 = _generateCallbackName("iframefcb");
        return _window()[t2] = () => {
          gapi.load ? loadGapiIframe() : r(_createError(e, "network-request-failed"));
        }, _loadJS(`${(function _gapiScriptUrl() {
          return R.gapiScript;
        })()}?onload=${t2}`).catch(((e2) => r(e2)));
      }
      loadGapiIframe();
    }
  })).catch(((e2) => {
    throw Y = null, e2;
  }));
}
var Y = null;
var X = new Delay(5e3, 15e3);
var Q = { style: { position: "absolute", top: "-100px", width: "1px", height: "1px" }, "aria-hidden": "true", tabindex: "-1" };
var Z = /* @__PURE__ */ new Map([["identitytoolkit.googleapis.com", "p"], ["staging-identitytoolkit.sandbox.googleapis.com", "s"], ["test-identitytoolkit.sandbox.googleapis.com", "t"]]);
function getIframeUrl(e) {
  const t = e.config;
  _assert(t.authDomain, e, "auth-domain-config-required");
  const n = t.emulator ? _emulatorUrl(t, "emulator/auth/iframe") : `https://${e.config.authDomain}/__/auth/iframe`, i = { apiKey: t.apiKey, appName: e.name, v: SDK_VERSION }, s2 = Z.get(e.config.apiHost);
  s2 && (i.eid = s2);
  const o2 = e._getFrameworks();
  return o2.length && (i.fw = o2.join(",")), `${n}?${querystring(i).slice(1)}`;
}
async function _openIframe(e) {
  const t = await (function _loadGapi(e2) {
    return Y = Y || loadGapi(e2), Y;
  })(e), r = _window().gapi;
  return _assert(r, e, "internal-error"), t.open({ where: document.body, url: getIframeUrl(e), messageHandlersFilter: r.iframes.CROSS_ORIGIN_IFRAMES_FILTER, attributes: Q, dontclear: true }, ((t2) => new Promise((async (r2, n) => {
    await t2.restyle({ setHideOnLeave: false });
    const i = _createError(e, "network-request-failed"), s2 = _window().setTimeout((() => {
      n(i);
    }), X.get());
    function clearTimerAndResolve() {
      _window().clearTimeout(s2), r2(t2);
    }
    t2.ping(clearTimerAndResolve).then(clearTimerAndResolve, (() => {
      n(i);
    }));
  }))));
}
var ee = { location: "yes", resizable: "yes", statusbar: "yes", toolbar: "no" };
var AuthPopup = class {
  constructor(e) {
    this.window = e, this.associatedEvent = null;
  }
  close() {
    if (this.window) try {
      this.window.close();
    } catch (e) {
    }
  }
};
function _open(e, t, r, n = 500, i = 600) {
  const s2 = Math.max((window.screen.availHeight - i) / 2, 0).toString(), o2 = Math.max((window.screen.availWidth - n) / 2, 0).toString();
  let a2 = "";
  const c2 = { ...ee, width: n.toString(), height: i.toString(), top: s2, left: o2 }, u2 = getUA().toLowerCase();
  r && (a2 = _isChromeIOS(u2) ? "_blank" : r), _isFirefox(u2) && (t = t || "http://localhost", c2.scrollbars = "yes");
  const d2 = Object.entries(c2).reduce(((e2, [t2, r2]) => `${e2}${t2}=${r2},`), "");
  if ((function _isIOSStandalone(e2 = getUA()) {
    return _isIOS(e2) && !!window.navigator?.standalone;
  })(u2) && "_self" !== a2) return (function openAsNewWindowIOS(e2, t2) {
    const r2 = document.createElement("a");
    r2.href = e2, r2.target = t2;
    const n2 = document.createEvent("MouseEvent");
    n2.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 1, null), r2.dispatchEvent(n2);
  })(t || "", a2), new AuthPopup(null);
  const l2 = window.open(t || "", a2, d2);
  _assert(l2, e, "popup-blocked");
  try {
    l2.focus();
  } catch (e2) {
  }
  return new AuthPopup(l2);
}
var te = "__/auth/handler";
var re = "emulator/auth/handler";
var ne = encodeURIComponent("fac");
async function _getRedirectUrl(e, t, n, i, s2, o2) {
  _assert(e.config.authDomain, e, "auth-domain-config-required"), _assert(e.config.apiKey, e, "invalid-api-key");
  const a2 = { apiKey: e.config.apiKey, appName: e.name, authType: n, redirectUrl: i, v: SDK_VERSION, eventId: s2 };
  if (t instanceof FederatedAuthProvider) {
    t.setDefaultLanguage(e.languageCode), a2.providerId = t.providerId || "", (function isEmpty(e2) {
      for (const t2 in e2) if (Object.prototype.hasOwnProperty.call(e2, t2)) return false;
      return true;
    })(t.getCustomParameters()) || (a2.customParameters = JSON.stringify(t.getCustomParameters()));
    for (const [e2, t2] of Object.entries({})) a2[e2] = t2;
  }
  if (t instanceof BaseOAuthProvider) {
    const e2 = t.getScopes().filter(((e3) => "" !== e3));
    e2.length > 0 && (a2.scopes = e2.join(","));
  }
  e.tenantId && (a2.tid = e.tenantId);
  const c2 = a2;
  for (const e2 of Object.keys(c2)) void 0 === c2[e2] && delete c2[e2];
  const u2 = await e._getAppCheckToken(), d2 = u2 ? `#${ne}=${encodeURIComponent(u2)}` : "";
  return `${(function getHandlerBase({ config: e2 }) {
    if (!e2.emulator) return `https://${e2.authDomain}/${te}`;
    return _emulatorUrl(e2, re);
  })(e)}?${querystring(c2).slice(1)}${d2}`;
}
var ie = "webStorageSupport";
var se = class BrowserPopupRedirectResolver {
  constructor() {
    this.eventManagers = {}, this.iframes = {}, this.originValidationPromises = {}, this._redirectPersistence = U, this._completeRedirectFn = _getRedirectResult, this._overrideRedirectResult = _overrideRedirectResult;
  }
  async _openPopup(e, t, r, n) {
    debugAssert(this.eventManagers[e._key()]?.manager, "_initialize() not called before _openPopup()");
    return _open(e, await _getRedirectUrl(e, t, r, _getCurrentUrl(), n), _generateEventId());
  }
  async _openRedirect(e, t, r, n) {
    await this._originValidation(e);
    return (function _setWindowLocation(e2) {
      _window().location.href = e2;
    })(await _getRedirectUrl(e, t, r, _getCurrentUrl(), n)), new Promise((() => {
    }));
  }
  _initialize(e) {
    const t = e._key();
    if (this.eventManagers[t]) {
      const { manager: e2, promise: r2 } = this.eventManagers[t];
      return e2 ? Promise.resolve(e2) : (debugAssert(r2, "If manager is not set, promise should be"), r2);
    }
    const r = this.initAndGetManager(e);
    return this.eventManagers[t] = { promise: r }, r.catch((() => {
      delete this.eventManagers[t];
    })), r;
  }
  async initAndGetManager(e) {
    const t = await _openIframe(e), r = new AuthEventManager(e);
    return t.register("authEvent", ((t2) => {
      _assert(t2?.authEvent, e, "invalid-auth-event");
      return { status: r.onEvent(t2.authEvent) ? "ACK" : "ERROR" };
    }), gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER), this.eventManagers[e._key()] = { manager: r }, this.iframes[e._key()] = t, r;
  }
  _isIframeWebStorageSupported(e, t) {
    this.iframes[e._key()].send(ie, { type: ie }, ((r) => {
      const n = r?.[0]?.[ie];
      void 0 !== n && t(!!n), _fail(e, "internal-error");
    }), gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
  }
  _originValidation(e) {
    const t = e._key();
    return this.originValidationPromises[t] || (this.originValidationPromises[t] = _validateOrigin(e)), this.originValidationPromises[t];
  }
  get _shouldInitProactively() {
    return _isMobileBrowser() || _isSafari() || _isIOS();
  }
};
var MultiFactorAssertionImpl = class {
  constructor(e) {
    this.factorId = e;
  }
  _process(e, t, r) {
    switch (t.type) {
      case "enroll":
        return this._finalizeEnroll(e, t.credential, r);
      case "signin":
        return this._finalizeSignIn(e, t.credential);
      default:
        return debugFail("unexpected MultiFactorSessionType");
    }
  }
};
var PhoneMultiFactorAssertionImpl = class _PhoneMultiFactorAssertionImpl extends MultiFactorAssertionImpl {
  constructor(e) {
    super("phone"), this.credential = e;
  }
  static _fromCredential(e) {
    return new _PhoneMultiFactorAssertionImpl(e);
  }
  _finalizeEnroll(e, t, r) {
    return (function finalizeEnrollPhoneMfa(e2, t2) {
      return _performApiRequest(e2, "POST", "/v2/accounts/mfaEnrollment:finalize", _addTidIfNecessary(e2, t2));
    })(e, { idToken: t, displayName: r, phoneVerificationInfo: this.credential._makeVerificationRequest() });
  }
  _finalizeSignIn(e, t) {
    return (function finalizeSignInPhoneMfa(e2, t2) {
      return _performApiRequest(e2, "POST", "/v2/accounts/mfaSignIn:finalize", _addTidIfNecessary(e2, t2));
    })(e, { mfaPendingCredential: t, phoneVerificationInfo: this.credential._makeVerificationRequest() });
  }
};
var PhoneMultiFactorGenerator = class {
  constructor() {
  }
  static assertion(e) {
    return PhoneMultiFactorAssertionImpl._fromCredential(e);
  }
};
PhoneMultiFactorGenerator.FACTOR_ID = "phone";
var TotpMultiFactorGenerator = class {
  static assertionForEnrollment(e, t) {
    return TotpMultiFactorAssertionImpl._fromSecret(e, t);
  }
  static assertionForSignIn(e, t) {
    return TotpMultiFactorAssertionImpl._fromEnrollmentId(e, t);
  }
  static async generateSecret(e) {
    const t = e;
    _assert(void 0 !== t.user?.auth, "internal-error");
    const r = await (function startEnrollTotpMfa(e2, t2) {
      return _performApiRequest(e2, "POST", "/v2/accounts/mfaEnrollment:start", _addTidIfNecessary(e2, t2));
    })(t.user.auth, { idToken: t.credential, totpEnrollmentInfo: {} });
    return TotpSecret._fromStartTotpMfaEnrollmentResponse(r, t.user.auth);
  }
};
TotpMultiFactorGenerator.FACTOR_ID = "totp";
var TotpMultiFactorAssertionImpl = class _TotpMultiFactorAssertionImpl extends MultiFactorAssertionImpl {
  constructor(e, t, r) {
    super("totp"), this.otp = e, this.enrollmentId = t, this.secret = r;
  }
  static _fromSecret(e, t) {
    return new _TotpMultiFactorAssertionImpl(t, void 0, e);
  }
  static _fromEnrollmentId(e, t) {
    return new _TotpMultiFactorAssertionImpl(t, e);
  }
  async _finalizeEnroll(e, t, r) {
    return _assert(void 0 !== this.secret, e, "argument-error"), (function finalizeEnrollTotpMfa(e2, t2) {
      return _performApiRequest(e2, "POST", "/v2/accounts/mfaEnrollment:finalize", _addTidIfNecessary(e2, t2));
    })(e, { idToken: t, displayName: r, totpVerificationInfo: this.secret._makeTotpVerificationInfo(this.otp) });
  }
  async _finalizeSignIn(e, t) {
    _assert(void 0 !== this.enrollmentId && void 0 !== this.otp, e, "argument-error");
    const r = { verificationCode: this.otp };
    return (function finalizeSignInTotpMfa(e2, t2) {
      return _performApiRequest(e2, "POST", "/v2/accounts/mfaSignIn:finalize", _addTidIfNecessary(e2, t2));
    })(e, { mfaPendingCredential: t, mfaEnrollmentId: this.enrollmentId, totpVerificationInfo: r });
  }
};
var TotpSecret = class _TotpSecret {
  constructor(e, t, r, n, i, s2, o2) {
    this.sessionInfo = s2, this.auth = o2, this.secretKey = e, this.hashingAlgorithm = t, this.codeLength = r, this.codeIntervalSeconds = n, this.enrollmentCompletionDeadline = i;
  }
  static _fromStartTotpMfaEnrollmentResponse(e, t) {
    return new _TotpSecret(e.totpSessionInfo.sharedSecretKey, e.totpSessionInfo.hashingAlgorithm, e.totpSessionInfo.verificationCodeLength, e.totpSessionInfo.periodSec, new Date(e.totpSessionInfo.finalizeEnrollmentTime).toUTCString(), e.totpSessionInfo.sessionInfo, t);
  }
  _makeTotpVerificationInfo(e) {
    return { sessionInfo: this.sessionInfo, verificationCode: e };
  }
  generateQrCodeUrl(e, t) {
    let r = false;
    return (_isEmptyString(e) || _isEmptyString(t)) && (r = true), r && (_isEmptyString(e) && (e = this.auth.currentUser?.email || "unknownuser"), _isEmptyString(t) && (t = this.auth.name)), `otpauth://totp/${t}:${e}?secret=${this.secretKey}&issuer=${t}&algorithm=${this.hashingAlgorithm}&digits=${this.codeLength}`;
  }
};
function _isEmptyString(e) {
  return void 0 === e || 0 === e?.length;
}
var oe = "@firebase/auth";
var ae = "1.13.9";
var AuthInterop = class {
  constructor(e) {
    this.auth = e, this.internalListeners = /* @__PURE__ */ new Map();
  }
  getUid() {
    return this.assertAuthConfigured(), this.auth.currentUser?.uid || null;
  }
  async getToken(e) {
    if (this.assertAuthConfigured(), await this.auth._initializationPromise, !this.auth.currentUser) return null;
    return { accessToken: await this.auth.currentUser.getIdToken(e) };
  }
  addAuthTokenListener(e) {
    if (this.assertAuthConfigured(), this.internalListeners.has(e)) return;
    const t = this.auth.onIdTokenChanged(((t2) => {
      e(t2?.stsTokenManager.accessToken || null);
    }));
    this.internalListeners.set(e, t), this.updateProactiveRefresh();
  }
  removeAuthTokenListener(e) {
    this.assertAuthConfigured();
    const t = this.internalListeners.get(e);
    t && (this.internalListeners.delete(e), t(), this.updateProactiveRefresh());
  }
  assertAuthConfigured() {
    _assert(this.auth._initializationPromise, "dependent-sdk-initialized-before-auth");
  }
  updateProactiveRefresh() {
    this.internalListeners.size > 0 ? this.auth._startProactiveRefresh() : this.auth._stopProactiveRefresh();
  }
};
var ce = getExperimentalSetting("authIdTokenMaxAge") || 300;
!(function _setExternalJSProvider(e) {
  R = e;
})({ loadJS: (e) => new Promise(((t, r) => {
  const n = document.createElement("script");
  n.setAttribute("src", e), n.onload = t, n.onerror = (e2) => {
    const t2 = _createError("internal-error");
    t2.customData = e2, r(t2);
  }, n.type = "text/javascript", n.charset = "UTF-8", (function getScriptParentElement() {
    return document.getElementsByTagName("head")?.[0] ?? document;
  })().appendChild(n);
})), gapiScript: "https://apis.google.com/js/api.js", recaptchaV2Script: "https://www.google.com/recaptcha/api.js", recaptchaEnterpriseScript: "https://www.google.com/recaptcha/enterprise.js?render=" }), (function registerAuth(r) {
  _registerComponent(new Component2("auth", ((e, { options: t }) => {
    const n = e.getProvider("app").getImmediate(), i = e.getProvider("heartbeat"), s2 = e.getProvider("app-check-internal"), { apiKey: o2, authDomain: a2 } = n.options;
    _assert(o2 && !o2.includes(":"), "invalid-api-key", { appName: n.name });
    const c2 = { apiKey: o2, authDomain: a2, clientPlatform: r, apiHost: "identitytoolkit.googleapis.com", tokenApiHost: "securetoken.googleapis.com", apiScheme: "https", sdkClientVersion: _getClientVersion(r) }, u2 = new AuthImpl(n, i, s2, c2);
    return (function _initializeAuthInstance(e2, t2) {
      const r2 = t2?.persistence || [], n2 = (Array.isArray(r2) ? r2 : [r2]).map(_getInstance);
      t2?.errorMap && e2._updateErrorMap(t2.errorMap), e2._initializeWithPersistence(n2, t2?.popupRedirectResolver);
    })(u2, t), u2;
  }), "PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback(((e, t, r2) => {
    e.getProvider("auth-internal").initialize();
  }))), _registerComponent(new Component2("auth-internal", ((e) => ((e2) => new AuthInterop(e2))(_castAuth(e.getProvider("auth").getImmediate()))), "PRIVATE").setInstantiationMode("EXPLICIT")), registerVersion(oe, ae, (function getVersionForPlatform(e) {
    switch (e) {
      case "Node":
        return "node";
      case "ReactNative":
        return "rn";
      case "Worker":
        return "webworker";
      case "Cordova":
        return "cordova";
      case "WebExtension":
        return "web-extension";
      default:
        return;
    }
  })(r)), registerVersion(oe, ae, "esm2020");
})("Browser");

// cloudflare-saas/public/firebase-flow.js
async function firebaseFlow(sdk, config, invite, request, { signal, timeoutMs = 12e4, requestTimeoutMs = 15e3, onPhase = () => {
}, isCurrent = () => true } = {}) {
  let auth2, finished = false, exchanging = false;
  try {
    return await bounded(async (attempt2) => {
      const app = sdk.getApps().length ? sdk.getApps()[0] : sdk.initializeApp(config);
      auth2 = sdk.getAuthInstance(app);
      const provider = new sdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const challenge = bounded((child) => request("/auth/firebase/start", { invite }, { signal: child }), { signal: attempt2, timeoutMs: requestTimeoutMs });
      const popup = sdk.signInWithPopup(auth2, provider);
      Promise.resolve(popup).then(() => {
        if (finished && isCurrent()) sdk.signOut(auth2).catch(() => {
        });
      }, () => {
      });
      const [transaction, result] = await Promise.all([challenge, popup]);
      if (attempt2.aborted) throw new AuthError("CANCELLED");
      const token = await result.user.getIdToken();
      if (attempt2.aborted) throw new AuthError("CANCELLED");
      onPhase("finishing");
      exchanging = true;
      await bounded((child) => request("/auth/firebase/complete", { transaction: transaction.transaction, token }, { signal: child }), { signal: attempt2, timeoutMs: requestTimeoutMs });
    }, { signal, timeoutMs });
  } catch (error) {
    const failure = error instanceof AuthError ? error : new AuthError(error?.code || "NETWORK_ERROR");
    if (exchanging && (!failure.status || failure.status >= 500 || failure.code === "INVALID_RESPONSE")) failure.ambiguous = true;
    failure.message = authMessage(failure);
    throw failure;
  } finally {
    finished = true;
    if (auth2 && isCurrent()) await bounded(() => sdk.signOut(auth2), { timeoutMs: 2e3 }).catch(() => {
    });
  }
}

// cloudflare-saas/public/firebase-login.js
var auth;
var flight = null;
var attempt = 0;
function firebaseLogin(config, invite, request, options = {}) {
  if (flight) return flight;
  const id = ++attempt;
  const sdk = { initializeApp, getApps, GoogleAuthProvider, signInWithPopup, signOut, getAuthInstance: (app) => auth ?? (auth = initializeAuth(app, { persistence: S, popupRedirectResolver: se })) };
  flight = firebaseFlow(sdk, config, invite, request, { ...options, isCurrent: () => id === attempt }).finally(() => {
    if (id === attempt) flight = null;
  });
  return flight;
}

// cloudflare-saas/public/app.js
var transient = transientStorage(() => sessionStorage);
var loginConfig = null;
var session = null;
var attachedSource = null;
var recipeSource = null;
var safetyHoldFloorRevision = 0;
var uncertainChatAttempt = null;
var actionIcons = { "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435": "plus", "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0435\u0434\u0443": "plus", "\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C": "edit", "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C": "edit", "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C": "repeat", "\u0423\u0434\u0430\u043B\u0438\u0442\u044C": "trash", "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C": "trash", "\u0423\u0431\u0440\u0430\u0442\u044C": "close", "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C": "save", "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0440\u0435\u0446\u0435\u043F\u0442": "save", "\u041F\u043E\u043D\u0440\u0430\u0432\u0438\u043B\u043E\u0441\u044C": "heart", "\u0412 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435": "heart", "\u041D\u0430\u0439\u0442\u0438": "search", "\u041D\u0430\u0437\u0430\u0434": "left", "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0451": "plus", "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0441\u043E\u0441\u0442\u0430\u0432\u0430": "sources", "\u041E\u0442\u043A\u0440\u044B\u0442\u044C": "right", "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C": "calendar" };
var $2 = (id) => document.getElementById(id);
var el = (tag, cls, txt) => {
  const x = document.createElement(tag);
  if (cls) x.className = cls;
  if (txt !== void 0) x.textContent = txt;
  if ((tag === "button" || tag === "summary") && actionIcons[txt]) x.setAttribute("data-icon", actionIcons[txt]);
  return x;
};
var uiConfirmation = null;
var screenEpoch = 0;
var scrollMemory = createScrollMemory();
var dialogs = createDialogController({ $: $2, getRouter: () => router });
var presentationEpoch = 0;
var renderedRoute = "";
var renderedChatThread = null;
var renderedChatKey = "";
var chatSubmitted = false;
var selectedProposal = null;
var proposalSubmissions = /* @__PURE__ */ new Set();
var nextFrame = (fn) => typeof requestAnimationFrame === "function" ? requestAnimationFrame(fn) : fn();
function chatScroll() {
  return document.querySelector("[data-testid=chat-scroll]");
}
function saveViewScroll() {
  if (renderedRoute) scrollMemory.saveRoute(renderedRoute, $2("content").scrollTop);
  if (view === "chat" && renderedChatThread) scrollMemory.saveThread(renderedChatThread, chatScroll()?.scrollTop || 0);
}
function restoreViewScroll(route) {
  const epoch = screenEpoch;
  nextFrame(() => {
    if (epoch !== screenEpoch || renderedRoute !== route) return;
    $2("content").scrollTop = scrollMemory.route(route);
    if (view === "chat") {
      const scroll = chatScroll();
      if (scroll) scroll.scrollTop = scrollMemory.thread(state?.active_thread || "main") ?? scroll.scrollHeight;
    }
  });
}
function renderChat() {
  const thread = state.active_thread || "main", key = JSON.stringify(state.chat || []), scroll = chatScroll();
  const position = chatScrollPosition({ previousThread: renderedChatThread, nextThread: thread, previousKey: renderedChatKey, nextKey: key, top: scroll?.scrollTop || 0, height: scroll?.scrollHeight || 0, clientHeight: scroll?.clientHeight || 0, saved: scrollMemory.thread(thread), submitted: chatSubmitted });
  if (renderedChatThread !== thread) {
    if (renderedChatThread && view === "chat") scrollMemory.saveThread(renderedChatThread, scroll?.scrollTop || 0);
    $2("chat-extras").replaceChildren();
  }
  $2("onboard-open").hidden = Boolean(state.guidance?.ready);
  $2("suggestions").hidden = Boolean(state.chat?.length && state.guidance?.ready);
  if (!position.render) return;
  renderedChatThread = thread;
  renderedChatKey = key;
  chatSubmitted = false;
  const focused = document.activeElement?.dataset?.actionId ? { message: document.activeElement.closest("[data-message-id]")?.dataset.messageId, action: document.activeElement.dataset.actionId } : null;
  if (state.chat?.length) $2("messages").replaceChildren(...state.chat.map((x) => chatActions.render(x)));
  else {
    const empty = el("div", "bubble assistant", "\u0427\u0442\u043E \u0432\u0430\u043C \u0441\u0435\u0439\u0447\u0430\u0441 \u043D\u0443\u0436\u043D\u043E: \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0431\u043B\u044E\u0434\u043E \u0438\u043B\u0438 \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A?");
    empty.append(el("p", "ux-hint", "\u041C\u043E\u0436\u043D\u043E \u043F\u0438\u0441\u0430\u0442\u044C \u0441\u0432\u043E\u0438\u043C\u0438 \u0441\u043B\u043E\u0432\u0430\u043C\u0438, \u043D\u0430\u0434\u0438\u043A\u0442\u043E\u0432\u0430\u0442\u044C \u0433\u043E\u043B\u043E\u0441\u043E\u043C \u0438\u043B\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0444\u043E\u0442\u043E \u0431\u043B\u044E\u0434\u0430 \u043B\u0438\u0431\u043E \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0438. \u041B\u044E\u0431\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A \u0438\u043B\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u043A\u0430\u0436\u0435\u0442\u0441\u044F \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435."));
    $2("messages").replaceChildren(empty);
  }
  if (focused) {
    const message = Array.from($2("messages").children).find((x) => x.dataset.messageId === focused.message);
    const action = message && Array.from(message.querySelectorAll("[data-action-id]")).find((x) => x.dataset.actionId === focused.action);
    action?.focus({ preventScroll: true });
  }
  const epoch = screenEpoch;
  nextFrame(() => {
    if (epoch !== screenEpoch || renderedChatThread !== thread) return;
    const target = chatScroll();
    if (!target) return;
    if (view === "chat") {
      target.scrollTop = position.bottom ? target.scrollHeight : position.top;
      scrollMemory.saveThread(thread, target.scrollTop);
    } else if (!position.bottom) scrollMemory.saveThread(thread, position.top);
  });
}
function showProposal(id = null) {
  selectedProposal = id;
  renderProposals();
  dialogs.open("proposal", "proposal-close");
}
function proposalTitle(p) {
  return { ui: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435", configuration: "\u041E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u0438 \u0440\u0435\u0436\u0438\u043C", "profile.update": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043E\u0442\u0432\u0435\u0442\u044B", "diary.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A?", "diary.delete": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C?", "kitchen.intake": "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435", "diary.update": "\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C", "plan.accept": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u043E \u043C\u0435\u043D\u044E", "catalog.food.add": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442", "catalog.recipe.add": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0440\u0435\u0446\u0435\u043F\u0442", "guidance.setup": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435", "guidance.targets": "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B", "targets.update": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B" }[p.type] || kitchenActionLabels[p.type.replace("kitchen.", "")] || "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435";
}
var recipeNavigation = 0;
var recipesLoaded = false;
var recipeLoadScheduledFor = null;
var automaticRecipeLoad = Promise.resolve();
var recipePageCalls = createRecipePageCalls({ call: (...args) => transport(...args), epoch: () => screenEpoch });
var recipePageCall = (...args) => recipePageCalls.invoke(...args);
var settleRecipePageRequests = (current) => recipePageCalls.settle(current);
var csrf = null;
var state = null;
var view = "chat";
var image = null;
var busy = false;
var screenDraft = {};
var questionPage = 0;
var currentPlan = null;
var currentPlanIsDraft = false;
var uiLabels = { theme: "\u041E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435", text_size: "\u0420\u0430\u0437\u043C\u0435\u0440 \u0442\u0435\u043A\u0441\u0442\u0430", density: "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0438", simple_mode: "\u041F\u0440\u043E\u0441\u0442\u043E\u0439 \u0440\u0435\u0436\u0438\u043C", home: "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0430\u0437\u0434\u0435\u043B", show_nutrition: "\u041F\u0438\u0449\u0435\u0432\u043E\u0439 \u0441\u043E\u0441\u0442\u0430\u0432", energy_min_kcal: "\u042D\u043D\u0435\u0440\u0433\u0438\u044F \u043E\u0442, \u043A\u043A\u0430\u043B", energy_max_kcal: "\u042D\u043D\u0435\u0440\u0433\u0438\u044F \u0434\u043E, \u043A\u043A\u0430\u043B", protein_min_g: "\u0411\u0435\u043B\u043E\u043A \u043E\u0442, \u0433", protein_max_g: "\u0411\u0435\u043B\u043E\u043A \u0434\u043E, \u0433", carb_basis: "\u0421\u043F\u043E\u0441\u043E\u0431 \u043F\u043E\u0434\u0441\u0447\u0451\u0442\u0430 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432", carb_max_g: "\u0423\u0433\u043B\u0435\u0432\u043E\u0434\u044B \u0434\u043E, \u0433", fiber_min_g: "\u041A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430 \u043E\u0442, \u0433", saturated_fat_max_pct: "\u041D\u0430\u0441\u044B\u0449\u0435\u043D\u043D\u044B\u0435 \u0436\u0438\u0440\u044B \u0434\u043E, %", max_active_minutes: "\u041C\u0438\u043D\u0443\u0442 \u043D\u0430 \u0433\u043E\u0442\u043E\u0432\u043A\u0443", meals_per_day: "\u041F\u0440\u0438\u0451\u043C\u043E\u0432 \u043F\u0438\u0449\u0438", max_recipe_repeats_per_week: "\u041F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 \u0431\u043B\u044E\u0434\u0430 \u0432 \u043D\u0435\u0434\u0435\u043B\u044E", show_calories: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043A\u0430\u043B\u043E\u0440\u0438\u0438", note: "\u0417\u0430\u043F\u0438\u0441\u044C", date: "\u0414\u0430\u0442\u0430", timezone: "\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441", display_name: "\u0418\u043C\u044F", goal: "\u0426\u0435\u043B\u044C", basis_note: "\u041E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435", source_ref: "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A" };
var values = { normal: "\u043E\u0431\u044B\u0447\u043D\u044B\u0439", large: "\u043A\u0440\u0443\u043F\u043D\u044B\u0439", compact: "\u043A\u043E\u043C\u043F\u0430\u043A\u0442\u043D\u044B\u0435", comfortable: "\u043F\u0440\u043E\u0441\u0442\u043E\u0440\u043D\u044B\u0435", dark: "\u0442\u0451\u043C\u043D\u0430\u044F", light: "\u0441\u0432\u0435\u0442\u043B\u0430\u044F", "ivory-plum": "\u0441\u0432\u0435\u0442\u043B\u0430\u044F", chat: "\u043E\u0431\u0449\u0435\u043D\u0438\u0435", today: "\u043C\u0435\u043D\u044E", recipes: "\u0440\u0435\u0446\u0435\u043F\u0442\u044B", diary: "\u0434\u043D\u0435\u0432\u043D\u0438\u043A" };
Object.assign(uiLabels, { age_years: "\u0412\u043E\u0437\u0440\u0430\u0441\u0442, \u043B\u0435\u0442", height_cm: "\u0420\u043E\u0441\u0442, \u0441\u043C", weight_kg: "\u0412\u0435\u0441, \u043A\u0433", equation_category: "\u041A\u043E\u044D\u0444\u0444\u0438\u0446\u0438\u0435\u043D\u0442 \u0443\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F", activity_factor: "\u041C\u043D\u043E\u0436\u0438\u0442\u0435\u043B\u044C \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438", activity_note: "\u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C", measured_at: "\u0414\u0430\u0442\u0430 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F", mode: "\u0420\u0435\u0436\u0438\u043C \u043F\u0438\u0442\u0430\u043D\u0438\u044F", status: "\u0421\u0442\u0430\u0442\u0443\u0441", agreed_at: "\u0412\u0440\u0435\u043C\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F" });
Object.assign(values, { female: "\u0436\u0435\u043D\u0441\u043A\u0438\u0439 \u043A\u043E\u044D\u0444\u0444\u0438\u0446\u0438\u0435\u043D\u0442", male: "\u043C\u0443\u0436\u0441\u043A\u043E\u0439 \u043A\u043E\u044D\u0444\u0444\u0438\u0446\u0438\u0435\u043D\u0442", not_selected: "\u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D", maintain: "\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0432\u0435\u0441\u0430", loss: "\u043C\u044F\u0433\u043A\u043E\u0435 \u0441\u043D\u0438\u0436\u0435\u043D\u0438\u0435 \u0432\u0435\u0441\u0430", gain: "\u043D\u0430\u0431\u043E\u0440 \u0432\u0435\u0441\u0430 \u2014 \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043B\u0430\u043D", starter: "\u043D\u0438\u0437\u043A\u043E\u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043D\u044B\u0439 \u0441\u0442\u0430\u0440\u0442: \u0434\u043E 100 \u0433 \u043E\u0431\u0449\u0438\u0445 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432", keto: "\u043A\u0435\u0442\u043E-\u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439: \u0434\u043E 50 \u0433 \u043E\u0431\u0449\u0438\u0445 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432", total: "\u043E\u0431\u0449\u0438\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B", net_estimate: "\u0440\u0430\u0441\u0447\u0451\u0442\u043D\u044B\u0435 net-\u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B", agreed: "\u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u043C" });
var QUESTIONS = [["adult", "\u0412\u0430\u043C \u0443\u0436\u0435 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u043B\u043E\u0441\u044C 18 \u043B\u0435\u0442?"], ["pregnant", "\u0415\u0441\u0442\u044C \u043B\u0438 \u0431\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0441\u0442\u044C?"], ["breastfeeding", "\u041A\u043E\u0440\u043C\u0438\u0442\u0435 \u0433\u0440\u0443\u0434\u044C\u044E?"], ["type1_diabetes", "\u0415\u0441\u0442\u044C \u043B\u0438 \u0434\u0438\u0430\u0431\u0435\u0442 1 \u0442\u0438\u043F\u0430?"], ["sglt2", "\u041F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442\u0435 SGLT2-\u043F\u0440\u0435\u043F\u0430\u0440\u0430\u0442 \u2014 \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \u0424\u043E\u0440\u0441\u0438\u0433\u0443 \u0438\u043B\u0438 \u0414\u0436\u0430\u0440\u0434\u0438\u043D\u0441?"], ["hypoglycemia_medication", "\u041F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442\u0435 \u0438\u043D\u0441\u0443\u043B\u0438\u043D \u0438\u043B\u0438 \u0434\u0440\u0443\u0433\u043E\u0439 \u043F\u0440\u0435\u043F\u0430\u0440\u0430\u0442, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043C\u043E\u0436\u0435\u0442 \u0432\u044B\u0437\u0432\u0430\u0442\u044C \u0433\u0438\u043F\u043E\u0433\u043B\u0438\u043A\u0435\u043C\u0438\u044E?"], ["kidney_disease", "\u0415\u0441\u0442\u044C \u043B\u0438 \u0437\u0430\u0431\u043E\u043B\u0435\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u0447\u0435\u043A?"], ["liver_pancreas_gallbladder_disease", "\u0415\u0441\u0442\u044C \u043B\u0438 \u0437\u0430\u0431\u043E\u043B\u0435\u0432\u0430\u043D\u0438\u0435 \u043F\u0435\u0447\u0435\u043D\u0438, \u043F\u043E\u0434\u0436\u0435\u043B\u0443\u0434\u043E\u0447\u043D\u043E\u0439 \u0436\u0435\u043B\u0435\u0437\u044B \u0438\u043B\u0438 \u0436\u0435\u043B\u0447\u043D\u043E\u0433\u043E \u043F\u0443\u0437\u044B\u0440\u044F?"], ["metabolic_contraindication", "\u0418\u0437\u0432\u0435\u0441\u0442\u043D\u044B \u043B\u0438 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u044F \u043E\u0431\u043C\u0435\u043D\u0430 \u0436\u0438\u0440\u043E\u0432 \u0438\u043B\u0438 \u0438\u043D\u044B\u0435 \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0438\u044F \u043A \u043A\u0435\u0442\u043E\u0433\u0435\u043D\u043D\u043E\u0439 \u0434\u0438\u0435\u0442\u0435?"], ["eating_disorder_risk", "\u0415\u0441\u0442\u044C \u043B\u0438 \u0441\u0435\u0439\u0447\u0430\u0441 \u0438\u043B\u0438 \u0432 \u043F\u0440\u043E\u0448\u043B\u043E\u043C \u0440\u0430\u0441\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043F\u0438\u0449\u0435\u0432\u043E\u0433\u043E \u043F\u043E\u0432\u0435\u0434\u0435\u043D\u0438\u044F?"], ["other_clinical_restrictions", "\u0415\u0441\u0442\u044C \u043B\u0438 \u0434\u0440\u0443\u0433\u0438\u0435 \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u043F\u0438\u0442\u0430\u043D\u0438\u044F?"], ["medications_reviewed", "\u0412\u044B \u043F\u0435\u0440\u0435\u0447\u0438\u0441\u043B\u0438\u043B\u0438 \u0432\u0441\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u043C\u044B\u0435 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0430 \u0438\u043B\u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B\u0438, \u0447\u0442\u043E \u0438\u0445 \u043D\u0435\u0442?"], ["allergies_reviewed", "\u0412\u044B \u0443\u043A\u0430\u0437\u0430\u043B\u0438 \u0432\u0441\u0435 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0435 \u043F\u0438\u0449\u0435\u0432\u044B\u0435 \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u0438?"]];
var ALLERGENS = [["egg", "\u042F\u0439\u0446\u0430"], ["milk", "\u041C\u043E\u043B\u043E\u043A\u043E"], ["fish", "\u0420\u044B\u0431\u0430"], ["crustacean_shellfish", "\u0420\u0430\u043A\u043E\u043E\u0431\u0440\u0430\u0437\u043D\u044B\u0435"], ["tree_nut", "\u041E\u0440\u0435\u0445\u0438"], ["peanut", "\u0410\u0440\u0430\u0445\u0438\u0441"], ["soy", "\u0421\u043E\u044F"], ["wheat", "\u041F\u0448\u0435\u043D\u0438\u0446\u0430"], ["sesame", "\u041A\u0443\u043D\u0436\u0443\u0442"], ["celery", "\u0421\u0435\u043B\u044C\u0434\u0435\u0440\u0435\u0439"], ["coconut", "\u041A\u043E\u043A\u043E\u0441"], ["mollusc", "\u041C\u043E\u043B\u043B\u044E\u0441\u043A\u0438"], ["gluten", "\u0413\u043B\u044E\u0442\u0435\u043D"], ["mustard", "\u0413\u043E\u0440\u0447\u0438\u0446\u0430"], ["lupin", "\u041B\u044E\u043F\u0438\u043D"], ["sulfite", "\u0421\u0443\u043B\u044C\u0444\u0438\u0442\u044B"]];
var foodStates = { raw: "\u0441\u044B\u0440\u043E\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442", ready_to_eat: "\u0433\u043E\u0442\u043E\u0432\u044B\u0439 \u043A \u0443\u043F\u043E\u0442\u0440\u0435\u0431\u043B\u0435\u043D\u0438\u044E", cooked_roasted: "\u0437\u0430\u043F\u0435\u0447\u0451\u043D\u043D\u044B\u0439", cooked_dry_heat: "\u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0439 \u0441\u0443\u0445\u0438\u043C \u0436\u0430\u0440\u043E\u043C", canned_drained: "\u043A\u043E\u043D\u0441\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0431\u0435\u0437 \u0436\u0438\u0434\u043A\u043E\u0441\u0442\u0438", ready_to_cook: "\u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0439 \u043A \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u044E", cooked_boiled: "\u0432\u0430\u0440\u0451\u043D\u044B\u0439", cooked: "\u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0439", dry: "\u0441\u0443\u0445\u043E\u0439", canned: "\u043A\u043E\u043D\u0441\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439", frozen: "\u0437\u0430\u043C\u043E\u0440\u043E\u0436\u0435\u043D\u043D\u044B\u0439" };
var numberRu = (n, precision = 3) => n == null ? "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: precision }).format(n);
var foodState = (x) => foodStates[x] || "\u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435: \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430";
function readable(message) {
  return String(message).replace(/(?:Сначала скрининг|План не разрешён):[^\n]*/g, "\u0414\u043B\u044F \u043C\u0435\u043D\u044E \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \xAB\u0417\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u043E \u0438 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F\xBB \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F.");
}
function notify(message) {
  if ($2("workspace").hidden) {
    $2("cf-login-message").textContent = readable(message);
    return;
  }
  $2("toast").textContent = readable(message);
  $2("toast").hidden = false;
  clearTimeout(notify.t);
  notify.t = setTimeout(() => $2("toast").hidden = true, 7e3);
}
function human(x) {
  if (typeof x === "string" && x.startsWith('{"source_id"')) {
    try {
      const s2 = JSON.parse(x);
      return [s2.title, s2.author, s2.url].filter(Boolean).join(" \xB7 ");
    } catch {
    }
  }
  return typeof x === "boolean" ? x ? "\u0432\u043A\u043B\u044E\u0447\u0435\u043D\u043E" : "\u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E" : values[x] ?? String(x ?? "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E");
}
async function run(fn) {
  try {
    return await fn();
  } catch (e) {
    if (["STALE_SESSION", "CANCELLED", "SIGN_IN"].includes(e.code) || e.name === "AbortError") return null;
    notify(e.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435.");
    return null;
  }
}
function call(name2, args = {}, options = {}) {
  const revoke = name2 === "keto_consent" && args.confirmed === true && ["processing", "storage", "health"].some((key) => args[key] === false);
  return options.urgent || revoke ? transport(name2, args, options) : recipePageCalls.invoke(name2, args, options);
}
async function transport(name2, args = {}, options = {}) {
  const epoch = screenEpoch;
  const r = await fetch("/api/tools/" + encodeURIComponent(name2), { method: "POST", headers: { "Content-Type": "application/json", "x-csrf-token": csrf ?? "" }, body: JSON.stringify(args), signal: options.signal });
  const d2 = await r.json();
  if (epoch !== screenEpoch) throw Object.assign(Error("\u0421\u0435\u0430\u043D\u0441 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u044D\u043A\u0440\u0430\u043D."), { code: "STALE_SESSION" });
  if (!r.ok) {
    if (r.status === 401 && d2.error === "SIGN_IN" && !options.authBootstrap) authSession.expired();
    throw Object.assign(Error({ BRIDGE_NOT_CONFIGURED: "\u0421\u0435\u0440\u0432\u0438\u0441 \u043F\u043E\u043A\u0430 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D.", COMPUTE_UNAVAILABLE: "\u0421\u0435\u0440\u0432\u0438\u0441 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u0451\u043D.", REQUEST_PENDING: "\u0417\u0430\u043F\u0440\u043E\u0441 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F.", REQUEST_FAILED: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0435\u0433\u043E \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0434 \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u043C.", STATE_CHANGED: "\u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u043B\u0438 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u044D\u043A\u0440\u0430\u043D.", BUSY_OR_CONSENT_OR_LIMIT: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.", VALIDATION_FAILED: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043E\u0442\u0432\u0435\u0442\u044B, \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u0438 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B." }[d2.error] || d2.message || d2.detail || "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435."), { status: r.status, code: d2.error });
  }
  return d2;
}
function tranquilSummary(next) {
  if (next?.processing_consent !== true || next?.profile?.consent?.storage !== true || next?.profile?.consent?.health_data !== true) return null;
  const profile = next.profile, screened = next.screening?.can_plan === true, held = Array.isArray(next.holds) ? next.holds.length > 0 : null, target = profile.targets, stale = next.guidance?.targets_stale, pantry = Array.isArray(next.kitchen?.pantry) ? next.kitchen.pantry : null, diary = Array.isArray(next.diary) ? next.diary : null, last = Array.isArray(next.plans) ? next.plans.at(-1) : null;
  const menu = Boolean(last && Array.isArray(last.days) && last.days.length && last.status === "user_accepted" && last.profile_revision === profile.profile_revision && Number.isInteger(profile.profile_revision) && held === false && screened && stale === false), targets = Boolean(target && stale === false && held === false), steps = [["\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u043D\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0443 \u0438 \u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435", true], ["\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u043F\u043E\u0437\u0432\u043E\u043B\u044F\u044E\u0442 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435", screened && held === false], ["\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B", targets], ["\u0412\u044B\u0431\u0440\u0430\u043D\u043E \u043C\u0435\u043D\u044E, \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0435 \u0434\u043B\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F", menu]];
  return { cards: [
    { label: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C", value: held === true ? "\u041D\u0443\u0436\u0435\u043D \u0440\u0430\u0437\u0431\u043E\u0440" : typeof next.screening?.can_plan !== "boolean" ? "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : screened && held === false ? "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D \u0434\u043B\u044F \u043C\u0435\u043D\u044E" : "\u041D\u0443\u0436\u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430", note: "\u041F\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u043C \u043E\u0442\u0432\u0435\u0442\u0430\u043C; \u043D\u0435 \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u043E\u0435 \u0437\u0430\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435.", view: "setup", icon: "profile" },
    { label: "\u041B\u0438\u0447\u043D\u044B\u0439 \u043F\u043B\u0430\u043D", value: target === void 0 ? "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : target === null ? "\u041D\u0435 \u0437\u0430\u0434\u0430\u043D" : stale === true ? "\u041D\u0443\u0436\u0435\u043D \u043F\u0435\u0440\u0435\u0441\u043C\u043E\u0442\u0440" : held === true ? "\u041F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D" : stale === false && held === false ? "\u041E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B" : "\u0421\u0442\u0430\u0442\u0443\u0441 \u043D\u0435 \u0443\u0442\u043E\u0447\u043D\u0451\u043D", note: "\u041E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u043F\u0438\u0442\u0430\u043D\u0438\u044F, \u043D\u0435 \u043E\u0446\u0435\u043D\u043A\u0430 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F.", view: "targets", icon: "plan" },
    { label: "\u041C\u043E\u0438 \u0437\u0430\u043F\u0430\u0441\u044B", value: pantry === null ? "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : String(pantry.length), note: pantry === null ? "\u0421\u043E\u0441\u0442\u0430\u0432 \u0437\u0430\u043F\u0430\u0441\u043E\u0432 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D." : "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u043F\u043E\u0437\u0438\u0446\u0438\u0439. \u041C\u0430\u0441\u0441\u0430 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430.", view: "recipes", icon: "pantry" },
    { label: "\u0414\u043D\u0435\u0432\u043D\u0438\u043A", value: diary === null ? "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : String(diary.length), note: diary === null ? "\u0417\u0430\u043F\u0438\u0441\u0438 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u044B." : "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439. \u042D\u0442\u043E \u043D\u0435 \u0441\u0443\u043C\u043C\u0430 \u043F\u043E\u0442\u0440\u0435\u0431\u043B\u0435\u043D\u0438\u044F.", view: "diary", icon: "diary" }
  ], steps, completed: steps.filter(([, done]) => done).length };
}
function renderTranquilSummary(next) {
  const host = $2("dawn-overview"), cards = $2("dawn-status-cards"), progress = $2("dawn-progress");
  cards.replaceChildren();
  progress.replaceChildren();
  host.hidden = true;
  const summary = tranquilSummary(next);
  if (!summary) return;
  const symbols = { profile: "profile", plan: "plan", pantry: "basket", diary: "note" };
  for (const item of summary.cards) {
    const card = el("article", "dawn-status-card"), badge = el("span", "dawn-status-icon");
    badge.setAttribute("data-icon", symbols[item.icon]);
    badge.setAttribute("aria-hidden", "true");
    const button = el("button", "", "\u041E\u0442\u043A\u0440\u044B\u0442\u044C");
    button.type = "button";
    button.dataset.view = item.view;
    button.setAttribute("aria-label", "\u041E\u0442\u043A\u0440\u044B\u0442\u044C: " + item.label);
    button.onclick = () => setView(item.view);
    card.append(badge, el("h3", "", item.label), el("p", "dawn-status-value", item.value), el("p", "dawn-status-note", item.note), button);
    cards.append(card);
  }
  const text = el("p", "", "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043B\u0438\u0447\u043D\u043E\u0433\u043E \u043C\u0435\u043D\u044E: " + summary.completed + " \u0438\u0437 " + summary.steps.length + " \u044D\u0442\u0430\u043F\u043E\u0432"), bar = el("progress");
  bar.max = summary.steps.length;
  bar.value = summary.completed;
  bar.setAttribute("aria-label", text.textContent);
  const list = el("ol");
  for (const [label, done] of summary.steps) list.append(el("li", "", label + " \xB7 " + (done ? "\u0433\u043E\u0442\u043E\u0432\u043E" : "\u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E \u0438\u043B\u0438 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E")));
  progress.append(text, bar, list);
  host.hidden = false;
}
function clearScreen() {
  document.querySelectorAll(".catalog-saved-receipt").forEach((node) => node.remove());
  dialogs.reset();
  chatActions.reset();
  intake.reset();
  scrollMemory.clear();
  renderedRoute = "";
  renderedChatThread = null;
  renderedChatKey = "";
  chatSubmitted = false;
  selectedProposal = null;
  proposalSubmissions.clear();
  $2("pending-open").hidden = true;
  $2("pending-count").textContent = "";
  $2("proposal-list").replaceChildren();
  $2("today-empty").hidden = false;
  recipeNavigation++;
  recipesLoaded = false;
  recipeLibrary.invalidate();
  setRecipeReadLoading(false);
  measurementEditing = null;
  measurementOriginal = null;
  measurementSavedDraft = null;
  measurementSubmissions.clear();
  portionFoods = [];
  portionCalcVersion++;
  portionPicker.reset();
  $2("portion-form").hidden = true;
  $2("portion-food").value = "";
  shop.reset();
  ownDish.reset();
  screenEpoch++;
  renderTranquilSummary(null);
  developer.reset();
  guided.reset();
  router.reset();
  busy = false;
  mobile.reset();
  safetyHoldFloorRevision = 0;
  uncertainChatAttempt = null;
  attachedSource = null;
  recipeSource = null;
  if ($2("source-recipe-dialog").open) $2("source-recipe-dialog").close();
  uiConfirmation = null;
  currentPlan = null;
  currentPlanIsDraft = false;
  image = null;
  screenDraft = {};
  questionPage = 0;
  document.querySelectorAll("form").forEach((form) => form.reset());
  kitchen.reset();
  $2("toast").hidden = true;
  for (const id of ["recipe-detail", "recipes", "history", "allergy-options", "screen-questions", "source-list", "admin-summary", "invite-link", "measurement-list", "portion-result"]) $2(id).replaceChildren();
  for (const id of ["display-name", "goal", "timezone", "medications", "diary-note", "recipe-query", "photo"]) $2(id).value = "";
  if ($2("recipe-dialog").open) $2("recipe-dialog").close();
  $2("messages").replaceChildren();
  $2("menu-result").replaceChildren();
  $2("chat-extras").replaceChildren();
  $2("diary-entries").replaceChildren();
  $2("proposals").replaceChildren();
  $2("photo-status").textContent = "";
  $2("message").value = "";
}
function showLogin() {
  clearScreen();
  $2("login").hidden = false;
  $2("workspace").hidden = true;
  $2("connection").textContent = "\u041B\u0438\u0447\u043D\u043E\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435";
}
function formatDate(d2) {
  try {
    return new Intl.DateTimeFormat("ru", { day: "numeric", month: "long" }).format(/* @__PURE__ */ new Date(d2 + "T12:00:00"));
  } catch {
    return d2;
  }
}
function localDate() {
  const d2 = /* @__PURE__ */ new Date();
  return [d2.getFullYear(), String(d2.getMonth() + 1).padStart(2, "0"), String(d2.getDate()).padStart(2, "0")].join("-");
}
function setView(next, options = {}) {
  const target = guided.resolve(next);
  if (options.resetScroll) scrollMemory.saveRoute(target, 0);
  router.go(target, options);
  if (options.resetScroll) {
    scrollMemory.saveRoute(renderedRoute || target, 0);
    $2("content").scrollTop = 0;
  }
}
function setRecipeReadLoading(loading) {
  $2("kitchen-studio").setAttribute("aria-busy", String(loading));
}
function renderView(next, { reason = "user", origin = "more", depth = 0 } = {}) {
  presentationEpoch++;
  if (next === "developer" && (!session || session.user.role !== "admin" || image || attachedSource || recipeSource)) {
    notify("\u0420\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0431\u0435\u0437 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0451\u043D\u043D\u044B\u0445 \u0444\u043E\u0442\u043E \u0438\u043B\u0438 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432.");
    router.go("more", { replace: true });
    return;
  }
  const route = next;
  saveViewScroll();
  renderedRoute = route;
  next = next.startsWith("setup-") ? "setup" : next;
  const previousView = view;
  const navigation = previousView === next ? recipeNavigation : ++recipeNavigation;
  if (previousView === "chat" && next !== "chat") mobile.leave?.();
  if (previousView === "products" && next !== "products") shop.leave();
  if (["recipes", "products"].includes(previousView) && previousView !== next) {
    recipeLibrary.invalidate();
    kitchen.invalidatePageLookups();
    setRecipeReadLoading(false);
  }
  view = next;
  document.body.dataset.view = next;
  document.querySelectorAll("[data-page]").forEach((p) => p.hidden = p.dataset.page !== next);
  document.querySelectorAll("#nav [data-view],.head-actions [data-view]").forEach((b2) => {
    b2.classList.toggle("active", b2.dataset.view === mainTab(next));
    b2.setAttribute("aria-current", b2.dataset.view === mainTab(next) ? "page" : "false");
  });
  if (["recipes", "products"].includes(next) && recipeLoadScheduledFor !== navigation && (reason !== "history" || !recipesLoaded)) {
    recipeLoadScheduledFor = navigation;
    setRecipeReadLoading(true);
    const sessionEpoch = screenEpoch, current = () => navigation === recipeNavigation && sessionEpoch === screenEpoch && view === next;
    automaticRecipeLoad = automaticRecipeLoad.catch(() => {
    }).then(async () => {
      if (!current() || !await settleRecipePageRequests(current)) return;
      let recipesOK = next === "products";
      if (next === "recipes") $2("recipe-note").textContent = "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u0440\u0435\u0446\u0435\u043F\u0442\u044B\u2026";
      try {
        if (next === "recipes") {
          await loadRecipes();
          recipesOK = true;
        }
      } catch (e) {
        if (current()) notify(e.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0440\u0435\u0446\u0435\u043F\u0442\u044B.");
      }
      if (!current()) return;
      const kitchenOK = await kitchen.load(current);
      if (current() && next === "recipes" && recipesOK && kitchenOK) recipesLoaded = true;
    }).finally(() => {
      if (recipeLoadScheduledFor === navigation) {
        recipeLoadScheduledFor = null;
        if (current()) setRecipeReadLoading(false);
      }
    });
  }
  if (route === "setup-restrictions") fillOnboard();
  if (next === "settings") fillSettings();
  if (next === "sources" && reason !== "history") run(sources);
  if (next === "admin" && reason !== "history") run(admin);
  if (next === "developer") run(() => developer.load());
  guided.render(route);
  $2("nav-back").hidden = MAIN_ROUTES.includes(next);
  const parents = { "setup-consent": "recipes", "setup-about": "setup-consent", "setup-restrictions": "setup-about", "setup-targets": "setup-restrictions" };
  const parent = route === "today" ? "recipes" : route === "more" && depth === 0 ? "chat" : depth > 0 ? origin : parents[route] || "more";
  const parentLabel = { chat: "\u0427\u0430\u0442", today: "\u041C\u043E\u0451 \u043C\u0435\u043D\u044E", more: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C", recipes: "\u0420\u0435\u0446\u0435\u043F\u0442\u044B", targets: "\u041F\u043B\u0430\u043D \u043F\u0438\u0442\u0430\u043D\u0438\u044F", knowledge: "\u0411\u0430\u0437\u0430 \u0437\u043D\u0430\u043D\u0438\u0439", "setup-consent": "\u0421\u043E\u0433\u043B\u0430\u0441\u0438\u0435", "setup-about": "\u041E \u0432\u0430\u0441", "setup-restrictions": "\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F", "setup-targets": "\u041E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B" }[parent] || "\u0415\u0449\u0451";
  $2("nav-back").textContent = "";
  $2("nav-back").setAttribute("data-icon", "left");
  $2("nav-back").setAttribute("aria-label", "\u041D\u0430\u0437\u0430\u0434: " + parentLabel);
  $2("nav-back").title = "\u041D\u0430\u0437\u0430\u0434: " + parentLabel;
  if (next === "chat") mobile.resizeComposer();
  if (next === "diary") intake.render();
  restoreViewScroll(route);
}
function setState(next) {
  if (state && state.profile?.owner_account_id === next.profile?.owner_account_id && next.processing_consent && next.profile?.consent?.storage && next.profile?.consent?.health_data) {
    if (Number.isInteger(state.revision) && Number.isInteger(next.revision) && next.revision < state.revision) return;
    if (safetyHoldFloorRevision > 0 && Number.isInteger(next.revision) && next.revision < safetyHoldFloorRevision && !(Array.isArray(next.holds) && next.holds.length)) return;
  }
  if (state && state.profile.owner_account_id !== next.profile.owner_account_id) clearScreen();
  if (!next.processing_consent || !next.profile.consent.storage || !next.profile.consent.health_data) clearScreen();
  if (Array.isArray(next.holds) && next.holds.length && Number.isInteger(next.revision)) safetyHoldFloorRevision = Math.max(safetyHoldFloorRevision, next.revision);
  state = next;
  ownDish.update(state);
  developer.identity();
  renderState();
}
function accept(d2) {
  const reviewed = selectedProposal;
  if (d2?.state) {
    setState(d2.state);
  }
  if (dialogs.current === "proposal" && (d2?.receipt && (!reviewed || d2.receipt.id === reviewed) || reviewed && d2?.state?.pending && !d2.state.pending.some((p) => p.id === reviewed))) dialogs.dismiss();
  if (d2?.shopping) renderShopping(d2.shopping);
  if (d2?.message) notify(d2.message);
  guided.afterApplied(d2);
  shop.afterApplied(d2);
  portionPicker.afterApplied(d2);
  ownDish.afterApplied(d2);
  intake.afterApplied(d2);
  if (d2?.receipt?.type === "profile.update" && router.current === "setup-restrictions") fillOnboard();
  if (d2?.proposal && state?.processing_consent && state?.profile?.consent?.storage && state?.profile?.consent?.health_data) showProposal(d2.proposal.id);
  return d2;
}
function renderState() {
  kitchen.render();
  renderTranquilSummary(state);
  $2("login").hidden = true;
  $2("workspace").hidden = false;
  $2("version").textContent = state.mobile_version || state.version;
  $2("demo-banner").hidden = state.subject_kind !== "demo";
  $2("connection").textContent = "\u041B\u0438\u0447\u043D\u043E\u0435 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u043E";
  const u2 = state.ui;
  document.body.className = [u2.theme === "dark" ? "dark" : u2.theme === "light" ? "light" : "", u2.text_size === "large" ? "large" : "", u2.density === "compact" ? "compact" : "", u2.simple_mode ? "simple" : "", !u2.show_nutrition ? "no-nutrition" : ""].filter(Boolean).join(" ");
  $2("consent-panel").hidden = state.processing_consent && state.profile.consent.storage && state.profile.consent.health_data;
  $2("holds").hidden = !state.holds.length;
  $2("holds").textContent = "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E. \u0415\u0441\u0442\u044C \u043E\u0431\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043D\u0443\u0436\u043D\u043E \u043E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0441 \u043B\u0435\u0447\u0430\u0449\u0438\u043C \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u043E\u043C. \u0414\u043D\u0435\u0432\u043D\u0438\u043A \u0438 \u043E\u0431\u0449\u0438\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B.";
  $2("state-summary").textContent = "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F " + state.revision + " \xB7 " + state.catalog.recipes + " \u0440\u0435\u0446\u0435\u043F\u0442\u0443\u0440\u044B";
  mobile.render();
  guided.render(router.current);
  renderProposals();
  renderDiary();
  renderMeasurements();
  renderHistory();
  renderChat();
  const ready = state.screening.can_plan && !state.holds.length && state.profile.targets && !state.guidance?.targets_stale;
  $2("menu-gate").textContent = ready ? "\u041E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B. \u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u043F\u043B\u0430\u043D \u0431\u0443\u0434\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D \u043F\u043E \u043D\u0438\u043C." : "\u0414\u043B\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043C\u0435\u043D\u044E \u043D\u0443\u0436\u043D\u044B \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u0438 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B. \u041C\u043E\u0436\u043D\u043E \u043F\u043E\u043A\u0430 \u0432\u044B\u0431\u0438\u0440\u0430\u0442\u044C \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u044B\u0435 \u0440\u0435\u0446\u0435\u043F\u0442\u044B.";
  if (state.plans.length) {
    currentPlan = state.plans.at(-1);
    renderPlan(currentPlan, false);
  } else if (currentPlan && (!currentPlanIsDraft || currentPlan.profile_revision !== state.profile.profile_revision)) {
    currentPlan = null;
    $2("today-empty").hidden = false;
    $2("menu-result").replaceChildren(el("div", "notice", "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F \u2014 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043D\u0443\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0442\u044C."));
  } else if (!currentPlan && !$2("menu-result").children.length) renderPlan(null, false);
  if (state.holds.length) {
    currentPlan = null;
    $2("today-empty").hidden = false;
    $2("menu-result").replaceChildren(el("div", "notice danger", "\u0420\u0430\u043D\u0435\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u0435 \u043C\u0435\u043D\u044E \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F: \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0440\u0430\u0437\u0431\u043E\u0440 \u043D\u043E\u0432\u043E\u0433\u043E \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F."));
  }
}
function flatten(payload, prefix = "") {
  let out = [];
  for (const [key, val] of Object.entries(payload)) {
    if (val && typeof val === "object" && !Array.isArray(val)) out.push(...flatten(val, prefix + key + "."));
    else out.push([prefix + key, val]);
  }
  return out;
}
function showFoodSaved(proposal) {
  const food = ["catalog.food.add", "kitchen.source_import"].includes(proposal.type), recipe = ["catalog.recipe.add", "kitchen.save", "kitchen.own_dish_save"].includes(proposal.type);
  if (!food && !recipe || !["recipes", "products"].includes(view)) return;
  const data = food ? proposal.preview?.food || proposal.payload : proposal.payload, name2 = data.name_ru || proposal.preview?.name_ru || "\u0420\u0435\u0446\u0435\u043F\u0442";
  const source = food ? { food_id: data.food_id, name_ru: name2, amount: { value: 100, unit: "g" } } : { recipe_id: data.recipe_id, name_ru: name2, amount: { value: 1, unit: "portion" } };
  if (!source.food_id && !source.recipe_id) return;
  const page = document.querySelector('[data-page="' + view + '"]');
  page.querySelector(".catalog-saved-receipt")?.remove();
  const receipt = el("section", "catalog-saved-receipt");
  receipt.setAttribute("role", "status");
  const title = el("h2", "", food ? "\u041F\u0440\u043E\u0434\u0443\u043A\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D" : "\u0420\u0435\u0446\u0435\u043F\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D");
  title.dataset.icon = "check";
  receipt.append(title, el("p", "", name2), el("p", "muted", "\u0421\u044A\u0435\u0434\u0435\u043D\u043D\u0443\u044E \u043F\u043E\u0440\u0446\u0438\u044E \u043C\u043E\u0436\u043D\u043E \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A."));
  const record = el("button", "primary", "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u043F\u043E\u0440\u0446\u0438\u044E");
  record.dataset.icon = "plate";
  record.type = "button";
  record.onclick = () => intake.open(source);
  receipt.append(record);
  page.querySelector(".page-heading").after(receipt);
  scrollMemory.saveRoute(renderedRoute || view, 0);
  $2("content").scrollTop = 0;
}
function renderProposals() {
  const pending = state.pending || [];
  $2("pending-open").hidden = !pending.length;
  $2("pending-count").textContent = String(pending.length);
  $2("pending-open").setAttribute("aria-label", "\u041E\u0436\u0438\u0434\u0430\u044E\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F: " + pending.length);
  if (selectedProposal && !pending.some((p) => p.id === selectedProposal)) selectedProposal = null;
  $2("proposal-list").replaceChildren();
  $2("proposal-list").hidden = Boolean(selectedProposal);
  $2("proposal-all").hidden = !selectedProposal || pending.length < 2;
  const selected = pending.find((p) => p.id === selectedProposal), intakeSelected = selected?.type === "kitchen.intake";
  $2("proposal-heading").textContent = intakeSelected ? selected.payload.operation === "update" ? "\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C" : "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A" : "\u041D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443";
  $2("proposal-context").textContent = (selectedProposal ? intakeSelected ? "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E, \u0434\u0430\u0442\u0443, \u0432\u0440\u0435\u043C\u044F \u0438 \u0441\u043E\u0441\u0442\u0430\u0432." : "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435." : pending.length ? "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438." : "\u041E\u0436\u0438\u0434\u0430\u044E\u0449\u0438\u0445 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0439 \u043D\u0435\u0442.") + (pending.length ? " \u041F\u043E\u043A\u0430 \u0432\u044B \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B\u0438, \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E. \u0417\u0430\u043A\u0440\u044B\u0442\u0438\u0435 \u043E\u043A\u043D\u0430 \u043E\u0441\u0442\u0430\u0432\u0438\u0442 \u0435\u0433\u043E \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435; \xAB\u041E\u0442\u043C\u0435\u043D\u0430\xBB \u043E\u0442\u043C\u0435\u043D\u0438\u0442 \u044D\u0442\u043E \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435." : "");
  $2("proposals").replaceChildren();
  for (const p of pending) {
    const open = el("button", "pending-item", proposalTitle(p) + (p.preview?.entry ? " \xB7 " + p.preview.entry.name_ru + " \xB7 " + formatDate(p.preview.entry.date) : ""));
    open.type = "button";
    open.onclick = () => showProposal(p.id);
    $2("proposal-list").append(open);
    const card = el("div", "proposal");
    card.hidden = p.id !== selectedProposal;
    card.setAttribute("role", "region");
    card.setAttribute("aria-label", "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F");
    if (p.type !== "kitchen.intake") card.append(el("span", "eyebrow", "\u041D\u0410 \u041F\u0420\u041E\u0412\u0415\u0420\u041A\u0423"), el("h3", "", { "ui": "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435", "configuration": "\u041F\u043E\u0434\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u0438 \u0440\u0435\u0436\u0438\u043C", "profile.update": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043E\u0442\u0432\u0435\u0442\u044B", "measurement.add": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435", "measurement.update": "\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435", "measurement.delete": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435", "diary.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A?", "diary.delete": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C", "plan.accept": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u043E \u043C\u0435\u043D\u044E", "catalog.recipe.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043B\u0438\u0447\u043D\u044B\u0439 \u0440\u0435\u0446\u0435\u043F\u0442", "catalog.food.add": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043B\u0438\u0447\u043D\u044B\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442", "guidance.setup": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u0432\u044B\u0431\u043E\u0440", "guidance.targets": "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B", "targets.update": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0440\u0443\u0447\u043D\u044B\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B", "feature.request": "\u041F\u043E\u0436\u0435\u043B\u0430\u043D\u0438\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0443", "ui.rollback": "\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u043F\u0440\u0435\u0436\u043D\u0438\u0439 \u0432\u0438\u0434" }[p.type] || kitchenActionLabels[p.type.replace("kitchen.", "")] || "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435"));
    if (p.type === "kitchen.pantry" && Array.isArray(p.preview?.items)) {
      const retained = new Set(p.payload.items.map((i) => i.food_id));
      const removed = (state.kitchen?.pantry || []).filter((i) => !retained.has(i.food_id));
      card.append(el("p", "", `\u041D\u043E\u0432\u044B\u0435 \u0437\u0430\u043F\u0430\u0441\u044B \u0437\u0430\u043C\u0435\u043D\u044F\u0442 \u0442\u0435\u043A\u0443\u0449\u0438\u0435. \u0423\u0434\u0430\u043B\u044F\u0435\u0442\u0441\u044F \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432: ${removed.length}` + (removed.length ? " \u2014 " + removed.map((i) => i.name_ru || "\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E").join(", ") : "")));
    }
    const dl = el("dl");
    const shopFood = p.type === "catalog.food.add" && p.payload?.provenance?.type === "shop_label";
    const isKitchen = p.type.startsWith("kitchen.");
    const pairs = p.type.startsWith("measurement.") ? measurementPreview(p) : p.type === "kitchen.intake" || p.preview?.entry ? [] : p.type === "diary.delete" ? [["\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435", "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C \u0438\u0437 \u0434\u043D\u0435\u0432\u043D\u0438\u043A\u0430"]] : shopFood ? [] : p.type === "kitchen.pantry" ? [["\u041F\u0440\u043E\u0434\u0443\u043A\u0442\u044B", p.preview?.items || []]] : isKitchen ? ["kitchen.diary", "kitchen.own_dish_diary"].includes(p.type) ? [...p.payload.date ? [["\u0414\u0430\u0442\u0430", formatDate(p.payload.date)]] : [], ["\u0421\u043A\u043E\u043B\u044C\u043A\u043E", `${numberRu(p.payload.fraction)} ${p.payload.basis === "batch" ? "\u0432\u0441\u0435\u0433\u043E \u0431\u043B\u044E\u0434\u0430" : "\u043F\u043E\u0440\u0446\u0438\u0438"}`]] : p.type === "kitchen.remember" ? [["\u041F\u0440\u0435\u0434\u043F\u043E\u0447\u0442\u0435\u043D\u0438\u0435", p.payload.text]] : p.type === "kitchen.forget" ? [["\u0417\u0430\u0431\u044B\u0442\u044C", state.kitchen?.preferences?.find((f) => f.id === p.payload.fact_id)?.text || "\u041F\u0440\u0435\u0434\u043F\u043E\u0447\u0442\u0435\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E"]] : p.type === "kitchen.accept_day" ? [...p.preview?.date ? [["\u0414\u0430\u0442\u0430", formatDate(p.preview.date)]] : [], ["\u0411\u043B\u044E\u0434\u0430 \u0434\u043D\u044F", (p.preview?.day_items || []).join(", ")]] : p.type === "kitchen.rate" ? [["\u041E\u0446\u0435\u043D\u043A\u0430", p.payload.rating + " \u0438\u0437 5"]] : [] : p.type === "plan.accept" ? [["\u0414\u043D\u0435\u0439", p.payload.days?.length], ["\u0421\u0442\u0430\u0442\u0443\u0441", "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0439 \u0440\u0430\u0441\u0447\u0451\u0442\u043D\u044B\u0439 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A"]] : p.type === "guidance.targets" ? flatten(p.payload.candidate) : p.type === "targets.update" ? flatten(p.payload).filter(([k]) => !["status", "agreed_at"].includes(k)) : flatten(p.payload);
    for (const [key, val] of pairs.slice(0, 22)) {
      const leaf = key.split(".").at(-1);
      const label = uiLabels[leaf] || QUESTIONS.find((x) => x[0] === leaf)?.[1] || { allergies: "\u041F\u0438\u0449\u0435\u0432\u044B\u0435 \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u0438", medications: "\u041B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0430", screening: "\u0412\u043E\u043F\u0440\u043E\u0441\u044B \u0430\u043D\u043A\u0435\u0442\u044B" }[leaf] || leaf;
      dl.append(el("dt", "", label), el("dd", "", Array.isArray(val) ? val.map((x) => typeof x === "object" ? x.name_ru ? x.name_ru + " \xB7 " + foodState(x.state) + " \xB7 " + (x.grams == null ? "\u043C\u0430\u0441\u0441\u0430 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430" : numberRu(x.grams) + " \u0433") : x.name || "\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E" : ALLERGENS.find((a2) => a2[0] === x)?.[1] || human(x)).join(", ") : human(val)));
    }
    card.append(dl);
    if (p.preview?.entry) card.append(...intakeReviewNodes(el, p.preview));
    if (shopFood) {
      const f = p.payload, l2 = f.declared_label || {}, basis = { per100g: "\u043D\u0430 100 \u0433", per100ml: "\u043D\u0430 100 \u043C\u043B", perserving: "\u043D\u0430 \u043F\u043E\u0440\u0446\u0438\u044E" }[l2.basis] || "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430", v2 = (x) => x == null ? "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : numberRu(x, 2), al = (f.allergens || []).map((id) => ALLERGENS.find((a2) => a2[0] === id)?.[1] || "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E");
      card.append(el("p", "", f.name_ru + " \xB7 " + foodState(f.state)), el("p", "", "\u0410\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B: " + (al.length ? al.join(", ") : "\u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E: \u043D\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u044B")), el("p", "", "\u041E\u0441\u043D\u043E\u0432\u0430 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0438: " + basis + (l2.basis === "per100g" ? "" : "; \u043C\u0430\u0441\u0441\u0430 " + v2(l2.mass_g) + " \u0433")), el("p", "", "\u041D\u0430 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0435: \u044D\u043D\u0435\u0440\u0433\u0438\u044F " + v2(l2.energy_kcal) + " \u043A\u043A\u0430\u043B \xB7 \u0431\u0435\u043B\u043A\u0438 " + v2(l2.protein_g) + " \u0433 \xB7 \u0436\u0438\u0440\u044B " + v2(l2.fat_g) + " \u0433 \xB7 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B " + v2(l2.carbohydrate_g) + " \u0433 \xB7 \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430 " + v2(l2.fiber_g) + " \u0433"), el("p", "", "\u041E\u0441\u043D\u043E\u0432\u0430 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u043E\u0432: " + ({ total_includes_fiber: "\u0432\u0441\u0435\u0433\u043E, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0443", available_excludes_fiber: "\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435, \u0431\u0435\u0437 \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0438", unknown: "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430" }[l2.carbohydrate_basis] || "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430")), el("p", "", "\u041D\u0430 100 \u0433: \u044D\u043D\u0435\u0440\u0433\u0438\u044F " + v2(f.energy_kcal) + " \u043A\u043A\u0430\u043B \xB7 \u0431\u0435\u043B\u043A\u0438 " + v2(f.protein_g) + " \u0433 \xB7 \u0436\u0438\u0440\u044B " + v2(f.fat_g) + " \u0433 \xB7 \u043E\u0431\u0449\u0438\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B " + v2(f.carbohydrate_total_g) + " \u0433 \xB7 \u043A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430 " + v2(f.fiber_g) + " \u0433"), el("p", "muted", f.provenance.provider === "open_food_facts" ? "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: Open Food Facts \xB7 ODbL \xB7 " + f.source_ref : "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: \u043B\u0438\u0447\u043D\u0430\u044F \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0430"));
    }
    if (p.type === "kitchen.source_import" && p.preview?.food) {
      card.append(...sourceImportPreview(el, p.preview.food, p.preview.original_name, ALLERGENS, foodState));
    }
    if (p.type === "kitchen.own_dish_save" && p.preview?.whole_batch) ownDish.preview(card, p.preview);
    if (p.preview && !p.preview.entry && Array.isArray(p.preview.ingredients) && !p.preview.items && !p.preview.day_items && !p.preview.food && !p.preview.whole_batch) {
      card.append(el("h4", "", p.preview.name_ru + " \xB7 " + numberRu(p.preview.portions) + " \u043F\u043E\u0440\u0446\u0438\u0438"));
      for (const i of p.preview.ingredients) card.append(el("p", "", i.name_ru + " \u2014 " + (i.stock_quantity_unknown ? "\u043D\u0443\u0436\u043D\u043E " + numberRu(i.required_grams) + " \u0433; \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0437\u0430\u043F\u0430\u0441" : numberRu(i.grams_edible) + " \u0433") + " \xB7 " + foodState(i.state)));
      card.append(el("p", "nutrition", "\u0420\u0430\u0441\u0447\u0451\u0442: " + numberRu(p.preview.nutrition.energy_kcal, 0) + " \u043A\u043A\u0430\u043B \xB7 \u0431\u0435\u043B\u043E\u043A " + numberRu(p.preview.nutrition.protein_g, 1) + " \u0433 \xB7 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B " + numberRu(p.preview.nutrition.carbohydrate_total_g, 1) + " \u0433"));
    }
    if (p.type === "plan.accept") {
      const details = el("details"), summary = el("summary", "", "\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0431\u043B\u044E\u0434\u0430 \u0438 \u0433\u0440\u0430\u043C\u043C\u043E\u0432\u043A\u0438 \u043F\u0435\u0440\u0435\u0434 \u0432\u044B\u0431\u043E\u0440\u043E\u043C");
      details.append(summary);
      for (const day of p.payload.days) {
        details.append(el("h3", "", formatDate(day.date)));
        for (const meal of day.meals) {
          details.append(el("p", "", meal.name_ru));
          const ul = el("ul");
          for (const i of meal.ingredients) ul.append(el("li", "", i.name_ru + " \u2014 " + (i.stock_quantity_unknown ? "\u043D\u0443\u0436\u043D\u043E " + numberRu(i.required_grams) + " \u0433; \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0437\u0430\u043F\u0430\u0441" : numberRu(i.grams_edible) + " \u0433") + " \xB7 " + foodState(i.state)));
          details.append(ul);
        }
      }
      card.append(details);
    }
    const cta = p.type === "kitchen.intake" ? p.payload.operation === "update" ? "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435" : "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A" : shopFood ? "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043B\u0438\u0447\u043D\u044B\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442" : { "kitchen.own_dish_save": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0441\u0432\u043E\u0451 \u0431\u043B\u044E\u0434\u043E", "kitchen.own_dish_diary": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A", "kitchen.source_import": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043B\u0438\u0447\u043D\u044B\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442", "kitchen.pantry": `\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432: ${p.payload.items?.length ?? 0}`, "kitchen.save": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0440\u0435\u0446\u0435\u043F\u0442", "kitchen.diary": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A", "measurement.add": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435", "measurement.update": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435", "measurement.delete": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435", "diary.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A", "diary.delete": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C", "kitchen.favorite": "\u0412 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435", "kitchen.rate": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043E\u0446\u0435\u043D\u043A\u0443", "kitchen.accept_day": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u043E\u0442 \u0434\u0435\u043D\u044C" }[p.type] || "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C";
    const ok = el("button", "primary", cta), no = el("button", "secondary", "\u041E\u0442\u043C\u0435\u043D\u0430");
    ok.addEventListener("click", () => run(async () => {
      if (proposalSubmissions.has(p.id)) return;
      proposalSubmissions.add(p.id);
      ok.disabled = no.disabled = true;
      try {
        const applied = await call("keto_apply_proposal", { proposal_id: p.id, expected_revision: state.revision, approved: true });
        accept(applied);
        if (applied.receipt?.id === p.id) {
          if (["catalog.food.add", "catalog.recipe.add", "kitchen.source_import", "kitchen.save", "kitchen.own_dish_save"].includes(p.type)) showFoodSaved(p);
          if (p.type === "kitchen.own_dish_save") ownDish.savedReceipt(p.payload);
          if (p.type === "measurement.add" || p.type === "measurement.update") finishMeasurementReceipt(p);
          if (p.type === "diary.add" && $2("diary-note").value === p.payload.note && $2("diary-date").value === p.payload.date) $2("diary-note").value = "";
          if (p.type === "kitchen.intake") $2("toast").hidden = true;
          else notify(p.type === "diary.add" || p.type === "kitchen.diary" ? "\u0417\u0430\u043F\u0438\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430 \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A\u0435." : "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E.");
        }
      } finally {
        proposalSubmissions.delete(p.id);
        ok.disabled = no.disabled = false;
      }
    }));
    no.addEventListener("click", () => run(async () => {
      if (proposalSubmissions.has(p.id)) return;
      proposalSubmissions.add(p.id);
      ok.disabled = no.disabled = true;
      try {
        accept(await call("keto_apply_proposal", { proposal_id: p.id, expected_revision: state.revision, approved: false }));
      } finally {
        proposalSubmissions.delete(p.id);
        ok.disabled = no.disabled = false;
      }
    }));
    card.append(ok, no);
    const missingPantryPreview = p.type === "kitchen.pantry" && (!Array.isArray(p.preview?.items) || p.preview.items.length !== p.payload.items?.length);
    const missingSubject = p.type === "kitchen.intake" && !p.preview?.entry || p.type === "kitchen.source_import" && !p.preview?.food || p.type === "kitchen.forget" && !state.kitchen?.preferences?.some((f) => f.id === p.payload.fact_id) || p.type === "kitchen.accept_day" && !p.preview?.day_items?.length;
    if (p.expired || p.base_revision !== state.revision || missingPantryPreview || missingSubject) {
      ok.disabled = true;
      card.append(el("p", "muted", missingPantryPreview || missingSubject ? "\u0421\u043E\u0441\u0442\u0430\u0432 \u044D\u0442\u043E\u0433\u043E \u0441\u0442\u0430\u0440\u043E\u0433\u043E \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438. \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u0435\u0433\u043E \u0438 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C\u0442\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u0437\u0430\u043D\u043E\u0432\u043E." : p.expired ? "\u0421\u0440\u043E\u043A \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u0438\u0441\u0442\u0451\u043A. \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u0435\u0433\u043E \u0438 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E." : "\u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C. \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0438 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E."));
    }
    $2("proposals").append(card);
  }
}
async function propose(type, payload, expectedRevision = state.revision) {
  const r = await call("keto_propose_change", { event_type: type, payload, expected_revision: expectedRevision });
  accept(r);
  return r;
}
function recipeCard(r) {
  const b2 = el("button", "recipe-card");
  b2.append(el("span", "tag", { breakfast: "\u0417\u0430\u0432\u0442\u0440\u0430\u043A", main: "\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0435 \u0431\u043B\u044E\u0434\u043E", side: "\u0413\u0430\u0440\u043D\u0438\u0440", component: "\u041A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442" }[r.category] || "\u0411\u043B\u044E\u0434\u043E"), el("h3", "", r.name_ru));
  const meta = el("div", "recipe-meta");
  meta.append(el("span", "", r.active_minutes + " \u043C\u0438\u043D"), el("span", "nutrition", numberRu(r.nutrition.energy_kcal, 0) + " \u043A\u043A\u0430\u043B \xB7 \u0440\u0430\u0441\u0447\u0451\u0442"));
  if (r.fit_note) b2.append(el("p", "muted", r.fit_note));
  b2.append(meta, el("span", "open", "\u0418\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442\u044B \u0438 \u0448\u0430\u0433\u0438 \u2192"));
  b2.addEventListener("click", () => openRecipe(r));
  return b2;
}
function recipeActionHint(full = false) {
  return el("p", "ux-hint", full ? "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u0440\u0435\u0446\u0435\u043F\u0442 \u0432 \u0432\u0430\u0448\u0435\u0439 \u043F\u043E\u0434\u0431\u043E\u0440\u043A\u0435, \xAB\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0434\u043B\u044F \u0447\u0430\u0442\u0430\xBB \u0437\u0430\u043A\u0440\u0435\u043F\u043B\u044F\u0435\u0442 \u0435\u0433\u043E \u0437\u0430 \u0442\u0435\u043C\u043E\u0439, \u0430 \xAB\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435\xBB \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u044C \u043F\u043E\u0440\u0446\u0438\u0438 \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A." : "\xAB\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435\xBB \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u044C \u043F\u043E\u0440\u0446\u0438\u0438 \u0432 \u0434\u043D\u0435\u0432\u043D\u0438\u043A, \u0430 \xAB\u041F\u043E\u043D\u0440\u0430\u0432\u0438\u043B\u043E\u0441\u044C\xBB \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u0443\u0447\u0438\u0442\u044B\u0432\u0430\u0442\u044C \u0432\u0430\u0448\u0438 \u0432\u043A\u0443\u0441\u044B \u043F\u0440\u0438 \u043F\u043E\u0434\u0431\u043E\u0440\u0435 \u0431\u043B\u044E\u0434.");
}
function openRecipe(r, originSource = null) {
  const box = $2("recipe-detail");
  box.replaceChildren(el("span", "eyebrow", "\u0420\u0415\u0426\u0415\u041F\u0422 \xB7 " + r.active_minutes + " \u041C\u0418\u041D"), el("h2", "", r.name_ru));
  if (r.fit_note) box.append(el("p", "notice", r.fit_note));
  const record = el("button", "primary", "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435");
  record.type = "button";
  record.onclick = () => intake.open({ recipe_id: r.recipe_id, name_ru: r.name_ru, amount: { value: Number.isFinite(r.portions) ? r.portions : 1, unit: "portion" }, thread_id: originSource?.thread_id || state.active_thread || "main", origin: originSource?.origin, generation_id: originSource?.generation_id || r.generation_id });
  box.append(recipeActionHint(), record);
  const list = el("ul", "ingredient-list");
  for (const i of r.ingredients) {
    const li = el("li");
    li.append(el("span", "", i.name_ru + " \xB7 " + foodState(i.state)), el("strong", "", numberRu(i.grams_edible) + " \u0433"));
    list.append(li);
  }
  box.append(list);
  const steps = el("ol", "steps");
  const source = Array.isArray(r.steps_ru) ? r.steps_ru : [r.steps_ru];
  for (const st of source) steps.append(el("li", "", st));
  box.append(steps, el("p", "nutrition muted", `\u0420\u0430\u0441\u0447\u0451\u0442 \u043D\u0430 ${numberRu(Number.isFinite(r.portions) ? r.portions : 1)} \u043F\u043E\u0440\u0446\u0438\u0438: ${numberRu(r.nutrition.energy_kcal, 0)} \u043A\u043A\u0430\u043B; \u0431\u0435\u043B\u043E\u043A ${numberRu(r.nutrition.protein_g)} \u0433; \u043E\u0431\u0449\u0438\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B ${numberRu(r.nutrition.carbohydrate_total_g)} \u0433. \u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u043D\u0443\u0442\u0440\u0438\u0435\u043D\u0442\u044B \u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043D\u0443\u043B\u0451\u043C.`), el("p", "muted", "\u0410\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B: " + (r.allergens.map((x) => ALLERGENS.find((a2) => a2[0] === x)?.[1] || "\u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0441\u043E\u0441\u0442\u0430\u0432").join(", ") || "\u043D\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u044B \u0432 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0435; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0438") + ". \u0420\u0435\u0446\u0435\u043F\u0442\u0443\u0440\u0430 \u043D\u0435 \u043F\u0440\u043E\u0448\u043B\u0430 \u043A\u0443\u0445\u043E\u043D\u043D\u043E\u0435 \u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435."));
  const fav = el("button", "secondary", "\u041F\u043E\u043D\u0440\u0430\u0432\u0438\u043B\u043E\u0441\u044C");
  fav.addEventListener("click", () => run(async () => {
    await propose("feedback.add", { recipe_id: r.recipe_id, rating: 5, would_repeat: true });
  }));
  box.append(fav);
  dialogs.open("recipe", "recipe-close-top");
}
var recipeLibrary = createRecipeLibrary({ clear: () => $2("recipes").replaceChildren(), call: (args) => recipePageCall("keto_recipes", args), readFilters: () => {
  const args = { query: $2("recipe-query").value };
  if ($2("recipe-category").value) args.category = $2("recipe-category").value;
  if ($2("recipe-minutes").value) args.max_minutes = Number($2("recipe-minutes").value);
  return args;
}, epoch: () => screenEpoch, status: (t) => $2("recipe-note").textContent = t, more: (show, retry) => {
  $2("recipe-more").hidden = !show;
  $2("recipe-more").textContent = retry ? "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443" : "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0451";
}, render: (d2, append) => {
  const cards = d2.recipes.map((r) => r.draft_label ? kitchen.card(r) : recipeCard(r));
  if (append) $2("recipes").append(...cards);
  else $2("recipes").replaceChildren(...cards);
  if (!d2.total) $2("recipes").append(el("div", "panel", "\u041D\u0435 \u043D\u0430\u0448\u043B\u043E\u0441\u044C \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u044F. \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u043F\u043E\u0438\u0441\u043A \u0438\u043B\u0438 \u0444\u0438\u043B\u044C\u0442\u0440\u044B."));
} });
async function loadRecipes() {
  return recipeLibrary.load(false);
}
function renderDiary() {
  intake.render();
}
function renderHistory() {
  $2("history").replaceChildren();
  if (!state.ui_history.length) $2("history").append(el("p", "muted", "\u041F\u043E\u043A\u0430 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u043D\u0435 \u043C\u0435\u043D\u044F\u043B\u043E\u0441\u044C."));
  for (const x of [...state.ui_history].reverse()) {
    const b2 = el("button", "secondary", "\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u0432\u0438\u0434 \u0434\u043E " + new Date(x.at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }));
    b2.addEventListener("click", () => run(() => propose("ui.rollback", { history_id: x.id })));
    $2("history").append(b2);
  }
}
function fillSettings() {
  if (!state) return;
  for (const [key, value] of Object.entries(state.ui)) {
    const input = $2(key);
    if (input) input.type === "checkbox" ? input.checked = value : input.value = value;
  }
  for (const key of ["meals_per_day", "max_active_minutes"]) $2(key).value = state.profile.settings[key];
}
function renderPlan(plan, draft = true) {
  currentPlan = plan;
  currentPlanIsDraft = draft;
  renderTodayPlan({ plan, draft, root: $2("menu-result"), empty: $2("today-empty"), el, formatDate, openRecipe, acceptPlan: () => run(() => propose("plan.accept", plan)) });
}
function renderShopping(items) {
  const root = $2("menu-result"), box = el("div", "panel");
  box.append(el("h2", "", "\u0421\u043F\u0438\u0441\u043E\u043A \u043F\u043E\u043A\u0443\u043F\u043E\u043A"), el("p", "muted", "\u0423\u043A\u0430\u0437\u0430\u043D\u0430 \u043C\u0430\u0441\u0441\u0430 \u0441\u044A\u0435\u0434\u043E\u0431\u043D\u043E\u0439 \u0447\u0430\u0441\u0442\u0438; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432."));
  const list = el("ul");
  for (const i of items) list.append(el("li", "", i.name_ru + " \u2014 " + (i.stock_quantity_unknown ? "\u043D\u0443\u0436\u043D\u043E " + numberRu(i.required_grams) + " \u0433; \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0437\u0430\u043F\u0430\u0441" : numberRu(i.grams_edible) + " \u0433") + " \xB7 " + foodState(i.state)));
  box.append(list);
  root.append(box);
}
function fillOnboard() {
  if (!state) return;
  const p = state.profile;
  screenDraft = { ...p.screening };
  const unanswered = QUESTIONS.findIndex(([key]) => p.screening[key] === null || p.screening[key] === void 0 || ["medications_reviewed", "allergies_reviewed"].includes(key) && p.screening[key] !== true);
  questionPage = Math.max(0, unanswered);
  $2("display-name").value = p.display_name || "";
  $2("goal").value = p.goal || "";
  $2("timezone").value = p.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  $2("medications").value = p.medications.map((x) => x.name).join(", ");
  $2("allergy-options").replaceChildren();
  for (const [id, name2] of [...ALLERGENS, ...p.allergies.filter((id2) => !ALLERGENS.some((a2) => a2[0] === id2)).map((id2) => [id2, "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435: " + id2])]) {
    const label = el("label", "check"), i = document.createElement("input");
    i.type = "checkbox";
    i.value = id;
    i.checked = p.allergies.includes(id);
    label.append(i, el("span", "", name2));
    $2("allergy-options").append(label);
  }
  renderQuestions();
}
function renderQuestions() {
  const start2 = questionPage;
  $2("question-progress").textContent = `\u0412\u043E\u043F\u0440\u043E\u0441 ${start2 + 1} \u0438\u0437 ${QUESTIONS.length}`;
  $2("screen-questions").replaceChildren();
  for (const [key, label] of QUESTIONS.slice(start2, start2 + 1)) {
    const lab = el("label", "", label), sel = el("select");
    sel.dataset.screen = key;
    sel.setAttribute("aria-label", label);
    for (const [v2, t] of [["unknown", "\u041D\u0435 \u0437\u043D\u0430\u044E / \u0435\u0449\u0451 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430"], ["yes", "\u0414\u0430"], ["no", "\u041D\u0435\u0442"]]) {
      const o2 = el("option", "", t);
      o2.value = v2;
      sel.append(o2);
    }
    sel.value = screenDraft[key] === true ? "yes" : screenDraft[key] === false ? "no" : "unknown";
    sel.addEventListener("change", () => screenDraft[key] = sel.value === "unknown" ? null : sel.value === "yes");
    const hint = el("small", "field-help", key === "adult" ? "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u043C\u0435\u043D\u044E \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0441\u043E\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u043E\u043B\u0435\u0442\u0438\u044F." : "\u041E\u0442\u0432\u0435\u0442 \u0432\u043B\u0438\u044F\u0435\u0442 \u043D\u0430 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043C\u0435\u043D\u044E. \xAB\u041D\u0435 \u0437\u043D\u0430\u044E\xBB \u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u0432\u043E\u043F\u0440\u043E\u0441 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u043C, \u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u043E\u0442\u0432\u0435\u0442\u043E\u043C \xAB\u043D\u0435\u0442\xBB.");
    hint.id = "question-help-" + key;
    sel.setAttribute("aria-describedby", hint.id);
    lab.append(sel, hint);
    $2("screen-questions").append(lab);
  }
  $2("question-prev").disabled = questionPage === 0;
  $2("question-next").disabled = start2 + 1 >= QUESTIONS.length;
}
function markSafetyHold(d2) {
  if (!d2?.safety_hold) return;
  if (state) {
    state.holds = [.../* @__PURE__ */ new Set([...state.holds || [], ...d2.safety_hold])];
    if (Number.isInteger(state.revision)) safetyHoldFloorRevision = Math.max(safetyHoldFloorRevision, state.revision + 1);
  }
  currentPlan = null;
  $2("menu-result").replaceChildren(el("div", "notice danger", "\u041C\u0435\u043D\u044E \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0438\u0437-\u0437\u0430 \u043D\u043E\u0432\u043E\u0433\u043E \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F."));
}
async function send(message) {
  const sendEpoch = screenEpoch;
  if (!image && /^https:\/\/\S+$/i.test(message.trim())) {
    mobile.offerImageUrl(message.trim());
    notify("\u0421\u0441\u044B\u043B\u043A\u0430 \u0441\u0430\u043C\u0430 \u043F\u043E \u0441\u0435\u0431\u0435 \u043D\u0435 \u0434\u0430\u0451\u0442 \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u0444\u043E\u0442\u043E \u0438\u043B\u0438 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435. \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043F\u0440\u044F\u043C\u043E\u0435 \u0444\u043E\u0442\u043E \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0435 \u043B\u0438\u0431\u043E \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u0435 \u0444\u0430\u0439\u043B, \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0438\u043B\u0438 \u0442\u0435\u043A\u0441\u0442.");
    return;
  }
  if (mobile.recording() || mobile.changingTopic()) return;
  if (!message.trim() && image) message = "\u041F\u043E\u043C\u043E\u0433\u0438 \u043E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u044D\u0442\u043E \u0444\u043E\u0442\u043E; \u0441\u043E\u0441\u0442\u0430\u0432 \u0438 \u043C\u0430\u0441\u0441\u0443 \u043D\u0443\u0436\u043D\u043E \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u044C.";
  if (busy) {
    if (!/(не могу дышать|задыхаюсь|теряю сознание|сильная боль в груди|непрекращающаяся рвота)/i.test(message)) return;
    try {
      const d2 = await call("keto_chat", { message, request_id: crypto.randomUUID().replaceAll("-", ""), thread_id: state?.active_thread || "main" }, { urgent: true });
      $2("messages").append(el("div", "bubble assistant", d2.message));
      markSafetyHold(d2);
    } catch (e) {
      notify(e.message);
    }
    return;
  }
  busy = true;
  chatSubmitted = true;
  mobile.setChatBusy(true);
  const submittedDraft = $2("message").value, submittedImage = image;
  $2("send").disabled = true;
  const user = el("div", "bubble user", message), wait = el("div", "bubble pending", "\u0420\u0430\u0437\u0431\u0438\u0440\u0430\u044E\u0441\u044C\u2026");
  $2("messages").append(user, wait);
  const scroll = document.querySelector("[data-testid=chat-scroll]");
  if (scroll) scroll.scrollTop = scroll.scrollHeight;
  const attemptKey = JSON.stringify([state?.active_thread || "main", message, image || "", attachedSource || ""]);
  const reqId = uncertainChatAttempt?.key === attemptKey ? uncertainChatAttempt.request_id : crypto.randomUUID().replaceAll("-", "");
  try {
    const args = { message, request_id: reqId, thread_id: state?.active_thread || "main" };
    if (image) args.image_data_url = image;
    if (attachedSource) args.source_id = attachedSource;
    const d2 = await call("keto_chat", args, { urgent: /(не могу дышать|задыхаюсь|теряю сознание|сильная боль в груди|непрекращающаяся рвота)/i.test(message) });
    uncertainChatAttempt = null;
    if (sendEpoch !== screenEpoch) return;
    const responseThread = d2.response_thread_id || args.thread_id, sameThread = (d2.state?.active_thread || state?.active_thread || "main") === responseThread;
    wait.remove();
    if (d2.state) accept({ ...d2, message: null, proposal: sameThread ? d2.proposal : null });
    if (sameThread && (!d2.state?.chat?.length || d2.error_code || d2.requires_consent)) $2("messages").append(el("div", "bubble assistant", d2.message));
    markSafetyHold(d2);
    if (sameThread) {
      attachedSource = null;
      if ($2("message").value === submittedDraft) {
        $2("message").value = "";
        mobile.resizeComposer();
      }
      if (image === submittedImage) mobile.resetPhoto();
      if (d2.plan) {
        renderPlan(d2.plan);
        if (d2.shopping) renderShopping(d2.shopping);
      }
    }
  } catch (e) {
    const keepAttempt = !e?.status || e?.code === "REQUEST_PENDING" || e?.status >= 500;
    if (keepAttempt) uncertainChatAttempt = { key: attemptKey, request_id: reqId };
    else uncertainChatAttempt = null;
    if (sendEpoch === screenEpoch) {
      const msg = e?.status ? e.message : "\u0421\u0432\u044F\u0437\u044C \u043F\u0440\u0435\u0440\u0432\u0430\u043B\u0430\u0441\u044C: \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D. \u041F\u043E\u0432\u0442\u043E\u0440\u043D\u0430\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u0442\u043E\u0433\u043E \u0436\u0435 \u0442\u0435\u043A\u0441\u0442\u0430 \u0441\u0432\u0435\u0440\u0438\u0442 \u043F\u0440\u0435\u0436\u043D\u0438\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u0431\u0435\u0437 \u0434\u0432\u043E\u0439\u043D\u043E\u0433\u043E \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F.";
      wait.textContent = "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E. " + msg;
      notify(msg);
    }
  } finally {
    if (sendEpoch === screenEpoch) {
      busy = false;
      mobile.setChatBusy(false);
      $2("send").disabled = false;
    }
  }
}
function download(data) {
  const b2 = new Blob([data.base64 ? Uint8Array.from(atob(data.base64), (c2) => c2.charCodeAt(0)) : data.text], { type: data.mime }), u2 = URL.createObjectURL(b2), a2 = el("a");
  a2.href = u2;
  a2.download = data.filename;
  document.body.append(a2);
  a2.click();
  a2.remove();
  setTimeout(() => URL.revokeObjectURL(u2), 5e3);
}
async function refresh() {
  const d2 = await call("keto_open");
  if (d2.state) {
    setState(d2.state);
    if (d2.shopping) renderShopping(d2.shopping);
  }
}
$2("help").onclick = () => dialogs.open("help", "close-help");
$2("close-help").onclick = () => dialogs.close();
$2("close-recipe").textContent = "\u041D\u0430\u0437\u0430\u0434 \u043A \u0441\u043F\u0438\u0441\u043A\u0443";
$2("close-recipe").onclick = () => dialogs.close();
$2("recipe-close-top").onclick = () => dialogs.close();
$2("proposal-close").onclick = () => dialogs.close();
$2("proposal-all").onclick = () => showProposal();
$2("pending-open").onclick = () => showProposal();
$2("attachments-open").onclick = () => dialogs.open("attachments", "attachments-close");
$2("attachments-close").onclick = () => dialogs.close();
for (const id of ["recipe-dialog", "help-dialog", "proposal-dialog", "attachments-dialog", "topic-dialog", "source-recipe-dialog", "intake-dialog"]) $2(id).addEventListener("cancel", (e) => {
  e.preventDefault();
  dialogs.close();
});
$2("photo").addEventListener("change", (e) => {
  if (e.target.files?.length && dialogs.current === "attachments") dialogs.close();
});
$2("nav-back").onclick = () => router.back();
$2("refresh").onclick = () => run(refresh);
document.querySelectorAll("[data-view]").forEach((b2) => b2.addEventListener("click", () => setView(b2.dataset.view)));
document.querySelectorAll("[data-prompt]").forEach((b2) => b2.addEventListener("click", () => {
  setView("chat");
  $2("message").value = b2.dataset.prompt;
  mobile.resizeComposer();
  $2("message").focus();
}));
$2("onboard-open").onclick = $2("open-onboarding-settings").onclick = () => setView("setup");
$2("consent-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run(async () => {
    accept(await call("keto_consent", { processing: $2("c-processing").checked, storage: $2("c-storage").checked, health: $2("c-health").checked, confirmed: true }));
    setView("setup");
  });
});
$2("chat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  send($2("message").value);
});
$2("message").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing && window.matchMedia?.("(pointer: fine)").matches) {
    e.preventDefault();
    if ($2("message").value.trim() || image) send($2("message").value);
  }
});
$2("recipe-query").addEventListener("input", () => recipeLibrary.invalidate());
$2("recipe-search").addEventListener("submit", (e) => {
  e.preventDefault();
  run(() => loadRecipes());
});
$2("recipe-more").addEventListener("click", () => run(() => recipeLibrary.next()));
for (const id of ["recipe-category", "recipe-minutes"]) $2(id).addEventListener("change", () => run(() => loadRecipes()));
var measurementEditing = null;
var measurementOriginal = null;
var measurementSavedDraft = null;
var portionFoods = [];
var portionCalcVersion = 0;
function glucoseUnitLabel(unit) {
  return unit === "mg/dL" ? "\u043C\u0433/\u0434\u043B" : "\u043C\u043C\u043E\u043B\u044C/\u043B";
}
function measurementTimeLabel(m) {
  try {
    return new Intl.DateTimeFormat("ru-RU", { timeZone: m.timezone, year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(m.measured_at));
  } catch {
    return m.measured_at;
  }
}
var measurementSubmissions = /* @__PURE__ */ new Map();
var measurementFields = ["measurement-time", "measurement-glucose", "measurement-unit", "measurement-bhb", "measurement-context"];
function measurementDraft() {
  return { editing: measurementEditing, original: measurementOriginal, fields: measurementFields.map((id) => $2(id).value) };
}
function restoreMeasurementDraft(d2) {
  measurementEditing = d2?.editing || null;
  measurementOriginal = d2?.original || null;
  if (d2) measurementFields.forEach((id, i) => $2(id).value = d2.fields[i]);
  else $2("measurement-form").reset();
  $2("measurement-cancel").hidden = !measurementEditing;
  $2("measurement-zone").textContent = "\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430: " + Intl.DateTimeFormat().resolvedOptions().timeZone;
}
function draftFingerprint() {
  return JSON.stringify(measurementDraft());
}
function finishMeasurementReceipt(p) {
  const fp = measurementSubmissions.get(p.id);
  measurementSubmissions.delete(p.id);
  if (fp !== void 0 && fp === draftFingerprint()) {
    const saved = measurementSavedDraft;
    measurementSavedDraft = null;
    restoreMeasurementDraft(saved);
  }
}
function measurementPreview(p) {
  const m = p.type === "measurement.update" ? p.payload.session : p.type === "measurement.delete" ? (state.measurements || []).find((x) => x.measurement_id === p.payload.measurement_id) : p.payload;
  if (!m) return [["\u0418\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435", "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E"]];
  return [["\u0414\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F", measurementTimeLabel(m)], ["\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441", m.timezone], ["\u0413\u043B\u044E\u043A\u043E\u0437\u0430", m.glucose ? numberRu(m.glucose.value) + " " + glucoseUnitLabel(m.glucose.unit) : "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430"], ["BHB \u043A\u0440\u043E\u0432\u0438", m.bhb ? numberRu(m.bhb.value) + " \u043C\u043C\u043E\u043B\u044C/\u043B" : "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"], ["\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442", m.context || "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"]];
}
function readDecimal(id) {
  const v2 = $2(id).value.trim();
  if (!v2) return null;
  if (!/^\d+(?:[.,]\d+)?$/.test(v2)) throw Error("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0435\u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E.");
  const n = Number(v2.replace(",", "."));
  if (!Number.isFinite(n)) throw Error("\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E.");
  return n;
}
function renderMeasurements() {
  const box = $2("measurement-list");
  box.replaceChildren();
  if (!Array.isArray(state.measurements)) box.append(el("p", "muted", "\u0418\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u044B."));
  else if (!state.measurements.length) box.append(el("p", "muted", "\u0418\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442."));
  for (const m of [...state.measurements || []].reverse()) {
    const card = el("article", "diary-entry");
    card.append(el("p", "", measurementTimeLabel(m) + " \xB7 " + m.timezone), el("p", "", `\u0413\u043B\u044E\u043A\u043E\u0437\u0430: ${m.glucose ? numberRu(m.glucose.value) + " " + glucoseUnitLabel(m.glucose.unit) : "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430"} \xB7 BHB \u043A\u0440\u043E\u0432\u0438: ${m.bhb ? numberRu(m.bhb.value) + " \u043C\u043C\u043E\u043B\u044C/\u043B" : "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"}`), el("p", "", m.gki?.value == null ? m.gki?.reason : "GKI: " + numberRu(m.gki.value, 2)), ...m.context ? [el("p", "muted", m.context)] : []);
    const edit = el("button", "", "\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C"), del = el("button", "text-btn", "\u0423\u0434\u0430\u043B\u0438\u0442\u044C");
    edit.type = del.type = "button";
    edit.onclick = () => {
      if (measurementEditing) {
        notify("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u0438\u043B\u0438 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u0442\u0435\u043A\u0443\u0449\u0435\u0435 \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435.");
        return;
      }
      measurementSavedDraft = measurementDraft();
      measurementEditing = m.measurement_id;
      measurementOriginal = { measured_at: m.measured_at, timezone: m.timezone, display: m.measured_at.slice(0, 16) };
      $2("measurement-time").value = measurementOriginal.display;
      $2("measurement-glucose").value = m.glucose?.value ?? "";
      $2("measurement-unit").value = m.glucose?.unit || "mmol/L";
      $2("measurement-bhb").value = m.bhb?.value ?? "";
      $2("measurement-context").value = m.context || "";
      $2("measurement-zone").textContent = "\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u0447\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441: " + m.timezone + ". \u0415\u0441\u043B\u0438 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0432\u0440\u0435\u043C\u044F, \u0431\u0443\u0434\u0435\u0442 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D \u0447\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430.";
      $2("measurement-cancel").hidden = false;
    };
    del.onclick = () => run(() => propose("measurement.delete", { measurement_id: m.measurement_id }));
    card.append(edit, del);
    box.append(card);
  }
}
$2("measurement-zone").textContent = "\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430: " + Intl.DateTimeFormat().resolvedOptions().timeZone;
$2("measurement-cancel").onclick = () => {
  const saved = measurementSavedDraft;
  measurementSavedDraft = null;
  restoreMeasurementDraft(saved);
};
$2("measurement-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const raw = $2("measurement-time").value;
    let m;
    if (measurementOriginal && raw === measurementOriginal.display) {
      m = { measured_at: measurementOriginal.measured_at, timezone: measurementOriginal.timezone };
    } else {
      const dt = new Date(raw);
      if (!raw || !Number.isFinite(dt.getTime())) throw Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0434\u0430\u0442\u0443 \u0438 \u0432\u0440\u0435\u043C\u044F.");
      const local = [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, "0"), String(dt.getDate()).padStart(2, "0")].join("-") + "T" + [dt.getHours(), dt.getMinutes()].map((n) => String(n).padStart(2, "0")).join(":");
      if (local !== raw) throw Error("\u042D\u0442\u043E \u043C\u0435\u0441\u0442\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u043D\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442 \u043F\u0440\u0438 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u0435 \u0447\u0430\u0441\u043E\u0432; \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0435 \u0432\u0440\u0435\u043C\u044F.");
      const offset2 = -dt.getTimezoneOffset(), sign = offset2 >= 0 ? "+" : "-", pad = (n) => String(Math.abs(n)).padStart(2, "0");
      m = { measured_at: raw + ":00" + sign + pad(Math.trunc(offset2 / 60)) + ":" + pad(offset2 % 60), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }
    const g = readDecimal("measurement-glucose"), b2 = readDecimal("measurement-bhb");
    if (g !== null) m.glucose = { value: g, unit: $2("measurement-unit").value };
    if (b2 !== null) m.bhb = { value: b2, unit: "mmol/L" };
    if (g === null && b2 === null) throw Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435.");
    if ($2("measurement-context").value.trim()) m.context = $2("measurement-context").value.trim();
    const fingerprint = draftFingerprint();
    const r = await propose(measurementEditing ? "measurement.update" : "measurement.add", measurementEditing ? { measurement_id: measurementEditing, session: m } : m);
    if (r?.proposal?.id) measurementSubmissions.set(r.proposal.id, fingerprint);
  });
};
function clearPortionResult() {
  portionCalcVersion++;
  $2("portion-result").replaceChildren();
}
function clearPortionGI() {
  $2("portion-gi").value = "";
  $2("portion-source").value = "";
  $2("portion-match").checked = false;
}
function portionFingerprint() {
  const f = portionFoods.find((x) => x.food_id === $2("portion-food").value);
  return JSON.stringify([f?.food_id, f?.state, $2("portion-grams").value, $2("portion-gi").value, $2("portion-source").value, $2("portion-match").checked]);
}
$2("portion-query").addEventListener("input", clearPortionResult);
$2("portion-food").addEventListener("change", () => {
  clearPortionGI();
  clearPortionResult();
});
for (const id of ["portion-grams", "portion-gi", "portion-source", "portion-match"]) {
  for (const event of ["input", "change"]) $2(id).addEventListener(event, clearPortionResult);
}
var portionPicker = createFoodPicker({ root: $2("portion-results"), input: $2("portion-query"), el, call: recipePageCall, getState: () => state, accept, run, epoch: () => screenEpoch, foodState, allergens: ALLERGENS, onSelect: (food) => {
  portionFoods = [food];
  $2("portion-food").value = food.food_id;
  $2("portion-selected-name").textContent = food.name_ru;
  $2("portion-selected-state").textContent = foodState(food.state);
  $2("portion-form").hidden = false;
  clearPortionGI();
  clearPortionResult();
} });
$2("portion-search").onsubmit = (e) => {
  e.preventDefault();
  run(() => portionPicker.search({ reveal: true }));
};
$2("portion-change").onclick = () => {
  $2("portion-query").focus();
  $2("portion-query").select?.();
};
$2("portion-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const food = portionFoods.find((f) => f.food_id === $2("portion-food").value);
    if (!food) throw Error("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442.");
    const grams = readDecimal("portion-grams");
    if (grams === null || grams <= 0) throw Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043C\u0430\u0441\u0441\u0443 \u043F\u043E\u0440\u0446\u0438\u0438.");
    const values2 = { food_id: food.food_id, grams };
    const gi = readDecimal("portion-gi");
    if (gi !== null) {
      if (!$2("portion-match").checked || !$2("portion-source").value.trim()) throw Error("\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430 \u0438 \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u0413\u0418.");
      values2.gi = { value: gi, source: $2("portion-source").value.trim(), preparation: food.state, scale: "glucose_100" };
    }
    const fingerprint = portionFingerprint(), token = ++portionCalcVersion, epoch = screenEpoch;
    $2("portion-result").replaceChildren();
    const r = await call("keto_kitchen", { action: "food_portion", thread_id: state.active_thread || "main", values: values2 });
    if (token !== portionCalcVersion || epoch !== screenEpoch || fingerprint !== portionFingerprint()) return;
    const v2 = r.portion, n = v2.calculation.nutrition;
    const out = $2("portion-result");
    out.replaceChildren(el("p", "", r.food.name_ru + " \xB7 " + foodState(r.food.state) + " \xB7 " + numberRu(grams) + " \u0433"), el("p", "muted", "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u0441\u043E\u0441\u0442\u0430\u0432\u0430: " + r.food.source_url + "; \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043D\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u0443\u044E \u043C\u0430\u0441\u0441\u0443 \u0438\u0437 \u043E\u0441\u043D\u043E\u0432\u044B \u043D\u0430 100 \u0433."), el("p", "", [["energy_kcal", "\u042D\u043D\u0435\u0440\u0433\u0438\u044F", "\u043A\u043A\u0430\u043B"], ["protein_g", "\u0411\u0435\u043B\u043A\u0438", "\u0433"], ["fat_g", "\u0416\u0438\u0440\u044B", "\u0433"], ["carbohydrate_total_g", "\u041E\u0431\u0449\u0438\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B", "\u0433"], ["fiber_g", "\u041A\u043B\u0435\u0442\u0447\u0430\u0442\u043A\u0430", "\u0433"]].map(([key, label, unit]) => label + ": " + (n[key] == null ? "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : numberRu(n[key], 2) + " " + unit)).join(" \xB7 ")), el("p", "", "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B: " + (v2.available_carbohydrate_g == null ? "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : numberRu(v2.available_carbohydrate_g, 2) + " \u0433")), el("p", "", v2.gi_status === "unknown" ? "\u0413\u0418: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D." : `\u0413\u0418: ${numberRu(v2.gi)} (\u0432\u0440\u0443\u0447\u043D\u0443\u044E, \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D \u0432\u0430\u043C\u0438: ${values2.gi.source})`), el("p", "", v2.gl == null ? "\u0413\u041D: " + v2.gl_reason : "\u0413\u041D: " + numberRu(v2.gl, 2)));
    const record = el("button", "primary", "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u044A\u0435\u0434\u0435\u043D\u043D\u043E\u0435");
    record.type = "button";
    record.onclick = () => intake.open({ food_id: food.food_id, name_ru: r.food.name_ru, amount: { value: grams, unit: "g" } });
    out.append(record);
  });
};
$2("diary-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run(() => propose("diary.add", { date: $2("diary-date").value, note: $2("diary-note").value, intake_status: "unquantified" }));
});
$2("settings-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run(async () => {
    const ui = {}, settings = {};
    for (const key of Object.keys(state.ui)) {
      const input = $2(key);
      if (input) {
        const value = input.type === "checkbox" ? input.checked : input.value;
        if (value !== state.ui[key]) ui[key] = value;
      }
    }
    for (const key of ["meals_per_day", "max_active_minutes"]) {
      const value = Number($2(key).value);
      if (value !== state.profile.settings[key]) settings[key] = value;
    }
    if (!Object.keys(ui).length && !Object.keys(settings).length) return notify("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043D\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C.");
    await propose("configuration", { ui, settings });
  });
});
$2("question-prev").onclick = () => {
  questionPage--;
  renderQuestions();
};
$2("question-next").onclick = () => {
  questionPage++;
  renderQuestions();
};
$2("profile-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run(async () => {
    const old = state.profile.medications;
    const meds = $2("medications").value.split(",").map((x) => x.trim()).filter(Boolean).map((name2) => old.find((x) => x.name === name2) || { name: name2, class: "unknown" });
    const payload = { timezone: $2("timezone").value, screening: screenDraft, medications: meds, allergies: [...$2("allergy-options").querySelectorAll("input:checked")].map((x) => x.value) };
    if ($2("display-name").value.trim()) payload.display_name = $2("display-name").value.trim();
    if ($2("goal").value.trim()) payload.goal = $2("goal").value.trim();
    const changed = {};
    for (const [key, value] of Object.entries(payload)) {
      const oldValue = state.profile[key];
      if (key === "allergies") {
        if (JSON.stringify([...value].sort()) !== JSON.stringify([...oldValue || []].sort())) changed[key] = value;
      } else if (JSON.stringify(value) !== JSON.stringify(oldValue)) changed[key] = value;
    }
    if (!Object.keys(changed).length) return notify("\u041E\u0442\u0432\u0435\u0442\u044B \u043D\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C.");
    await propose("profile.update", changed);
  });
});
$2("targets-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run(async () => {
    const p = Object.fromEntries(new FormData(e.target));
    for (const key of Object.keys(p)) if (!["carb_basis", "basis_note"].includes(key)) {
      const v2 = String(p[key]).trim().replace(",", ".");
      if (!v2 || !Number.isFinite(Number(v2))) throw Error("\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0432\u0441\u0435 \u0447\u0438\u0441\u043B\u043E\u0432\u044B\u0435 \u043F\u043E\u043B\u044F.");
      p[key] = Number(v2);
    }
    if (p.energy_min_kcal < (state.guidance?.energy_floor || 1200)) throw Error("\u041D\u0438\u0436\u043D\u044F\u044F \u0433\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0438\u0436\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432\u043E\u0433\u043E \u043F\u0440\u0435\u0434\u0435\u043B\u0430 " + (state.guidance?.energy_floor || 1200) + " \u043A\u043A\u0430\u043B. \u041D\u0443\u0436\u0435\u043D \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0430\u0437\u0431\u043E\u0440.");
    p.basis_note = "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u043C. " + p.basis_note;
    p.status = "agreed";
    p.agreed_at = (/* @__PURE__ */ new Date()).toISOString();
    await propose("targets.update", p);
  });
});
$2("menu-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run(async () => {
    const d2 = await call("keto_menu", { start: $2("menu-start").value, days: Number($2("menu-days").value) });
    if (d2.plan) {
      renderPlan(d2.plan);
      if (d2.shopping) renderShopping(d2.shopping);
    } else {
      currentPlan = null;
      $2("menu-result").replaceChildren(el("p", "planning-warning", d2.message));
      for (const [key, value] of Object.entries(d2.constraints || {})) $2("menu-result").append(el("p", "muted", (uiLabels[key] || key) + ": " + value));
      const b2 = el("button", "secondary", "\u0420\u0435\u0446\u0435\u043F\u0442\u044B \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0439");
      b2.onclick = () => setView("recipes");
      $2("menu-result").append(b2);
    }
  });
});
document.querySelectorAll("[data-export]").forEach((b2) => b2.addEventListener("click", () => run(async () => download(await call("keto_export", { format: b2.dataset.export })))));
$2("menu-import").addEventListener("change", (e) => run(async () => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 15e4) throw Error("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 150 \u041A\u0411.");
  accept(await call("keto_import_menu", { content: await f.text(), format: f.name.toLowerCase().endsWith(".csv") ? "csv" : "json", expected_revision: state.revision }));
  e.target.value = "";
}));
$2("revoke").onclick = () => run(async () => {
  if (confirm("\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0443 \u0432 Azure \u0438 \u043D\u043E\u0432\u044B\u0435 \u043B\u0438\u0447\u043D\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438? \u0421\u0442\u0430\u0440\u044B\u0439 \u0434\u043D\u0435\u0432\u043D\u0438\u043A \u043E\u0441\u0442\u0430\u043D\u0435\u0442\u0441\u044F \u0434\u043E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F.")) accept(await call("keto_consent", { processing: false, storage: false, health: false, confirmed: true }));
});
$2("delete-data").onclick = () => run(async () => {
  if (prompt("\u0414\u043B\u044F \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F \u043B\u0438\u0447\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 \u0432\u0432\u0435\u0434\u0438\u0442\u0435: \u0423\u0414\u0410\u041B\u0418\u0422\u042C") !== "\u0423\u0414\u0410\u041B\u0418\u0422\u042C") return;
  const d2 = await cfApi("/api/personal/delete", { method: "POST", body: { confirm: "DELETE_MY_DATA" } });
  transient.setItem("keto_deletion_receipt", d2.receipt);
  authSession.signedOut();
  $2("deletion-recovery").hidden = false;
  $2("deletion-recovery").open = true;
  $2("deletion-code").value = d2.receipt;
  $2("deletion-status").textContent = "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u043F\u0440\u043E\u0448\u0435\u043D\u043E. \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u044D\u0442\u043E\u0442 \u043A\u043E\u0434: " + d2.receipt;
});
$2("logout").onclick = () => run(() => authSession.logout());
$2("diary-date").value = $2("menu-start").value = localDate();
async function cfApi(path, { method = "GET", body } = {}) {
  const epoch = screenEpoch;
  const r = await fetch(path, { method, headers: { ...body ? { "Content-Type": "application/json" } : {}, ...session && method !== "GET" ? { "X-CSRF-Token": session.csrf } : {} }, body: body ? JSON.stringify(body) : void 0 });
  const d2 = await r.json();
  if (epoch !== screenEpoch) throw Object.assign(Error("\u0421\u0435\u0430\u043D\u0441 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u044D\u043A\u0440\u0430\u043D."), { code: "STALE_SESSION" });
  if (!r.ok) {
    if (r.status === 401 && d2.error === "SIGN_IN") authSession.expired();
    throw Object.assign(Error({ SETUP_REQUIRED: "\u0412\u0445\u043E\u0434 \u043F\u043E\u043A\u0430 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D.", INVITATION_REQUIRED: "\u041D\u0443\u0436\u043D\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u044D\u0442\u043E\u0439 \u043F\u043E\u0447\u0442\u044B.", INVITE_NOT_AVAILABLE: "\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E.", CONSENT_REQUIRED: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435.", IMAGE_PROCESSING_UNAVAILABLE: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430.", TOO_LARGE: "\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439.", DEVELOPER_NOT_CONFIGURED: "\u0420\u0430\u043D\u043D\u0435\u0440 \u0438\u043B\u0438 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0439 snapshot \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D.", DEVELOPER_QUOTA_OR_REPLAY: "\u041B\u0438\u043C\u0438\u0442 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0439 \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D \u0438\u043B\u0438 \u0437\u0430\u043F\u0440\u043E\u0441 \u0443\u0436\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u043B\u0441\u044F.", DEVELOPER_GENERATION_OR_TEST_FAILED: "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0438\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0435 \u043F\u0440\u043E\u0448\u043B\u0430. \u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0442\u0438\u043B\u0438, \u0441\u043F\u0440\u0430\u0432\u043A\u0430 \u0438 UI-\u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435; \u0441\u0435\u0440\u0432\u0435\u0440\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0438.", DEVELOPER_BUSY_OR_DISABLED: "\u041F\u0438\u043B\u043E\u0442 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D \u0438\u043B\u0438 \u0434\u0440\u0443\u0433\u0430\u044F \u0437\u0430\u0434\u0430\u0447\u0430 \u0435\u0449\u0451 \u043E\u0442\u043A\u0440\u044B\u0442\u0430.", DEVELOPER_CANCELLED_OR_EXPIRED: "\u0417\u0430\u0434\u0430\u0447\u0430 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430 \u0438\u043B\u0438 \u0441\u0440\u043E\u043A \u0438\u0441\u0442\u0451\u043A.", IMAGE_LINK_UNSUPPORTED: "\u042D\u0442\u043E\u0442 \u0430\u0434\u0440\u0435\u0441 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F. \u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u0435 \u0444\u0430\u0439\u043B, \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0438\u043B\u0438 \u0442\u0435\u043A\u0441\u0442 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B.", IMAGE_LINK_PRIVATE_QUERY: "\u0421\u0441\u044B\u043B\u043A\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u043D\u0435\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0435 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B. \u0421\u043A\u0430\u0447\u0430\u0439\u0442\u0435 \u0444\u043E\u0442\u043E \u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u0435 \u0444\u0430\u0439\u043B.", IMAGE_UPLOAD_REQUIRED: "\u0414\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0440\u0430\u0437\u043C\u0435\u0440\u0430 \u0441\u043A\u0430\u0447\u0430\u0439\u0442\u0435 \u0444\u043E\u0442\u043E \u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u0435 \u0444\u0430\u0439\u043B: \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0441\u043E\u0436\u043C\u0451\u0442 \u0435\u0433\u043E \u043F\u0435\u0440\u0435\u0434 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u043E\u0439.", IMAGE_NOT_DIRECT: "\u0421\u0441\u044B\u043B\u043A\u0430 \u0432\u0435\u0434\u0451\u0442 \u043D\u0435 \u043D\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435. \u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u0438\u043B\u0438 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442.", IMAGE_DNS_REJECTED: "\u0410\u0434\u0440\u0435\u0441 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u043D\u0435 \u043F\u0440\u043E\u0448\u0451\u043B \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443. \u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u0435 \u0444\u0430\u0439\u043B.", IMAGE_TOO_LARGE: "\u0424\u043E\u0442\u043E \u0431\u043E\u043B\u044C\u0448\u0435 4 \u041C\u0411. \u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u0434\u043B\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0441\u0436\u0430\u0442\u0438\u044F." }[d2.error] || "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E."), { status: r.status, code: d2.error });
  }
  return d2;
}
$2("source-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const formEl = e.target, snap = () => ["title", "author", "url", "text"].map((k) => formEl.elements?.[k]?.value ?? "").join("\0"), before = snap(), f = new FormData(formEl), file = f.get("upload");
    let upload;
    if (file?.size) {
      if (file.size > 512e3 || file.type === "text/plain" && file.size > 4e3) throw Error("\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const b2 of bytes) binary += String.fromCharCode(b2);
      upload = { mime: file.type || "text/plain", data: btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "") };
    }
    await cfApi("/api/sources", { method: "POST", body: { title: f.get("title"), author: f.get("author"), url: f.get("url"), text: f.get("text"), rights_attested: f.get("rights") === "on", ...upload ? { upload } : {} } });
    if (snap() === before) formEl.reset();
    await sources();
    notify("\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D \u0434\u043B\u044F \u043B\u0438\u0447\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430.");
  });
};
async function sources() {
  const d2 = await cfApi("/api/sources"), box = $2("source-list");
  box.replaceChildren();
  for (const s2 of d2.sources) {
    const card = document.createElement("article");
    card.className = "source";
    const title = document.createElement("h3");
    title.textContent = s2.title;
    const text = document.createElement("p");
    text.textContent = (s2.author ? s2.author + " \xB7 " : "") + { needs_content: "\u041D\u0443\u0436\u0435\u043D \u0442\u0435\u043A\u0441\u0442 \u0438\u043B\u0438 \u0434\u043E\u0441\u0442\u0443\u043F", draft: "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A", reviewed: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u043E", personal_recipe: "\u041B\u0438\u0447\u043D\u044B\u0439 \u0440\u0435\u0446\u0435\u043F\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D" }[s2.status] + "\n" + s2.excerpt;
    card.append(title, text);
    if (s2.mime) {
      let a2 = document.createElement("a");
      a2.href = "/api/sources/file?id=" + encodeURIComponent(s2.id);
      a2.textContent = "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B";
      card.append(a2);
    }
    const del = document.createElement("button");
    del.textContent = "\u0423\u0434\u0430\u043B\u0438\u0442\u044C";
    del.onclick = () => run(async () => {
      await cfApi("/api/sources/delete", { method: "POST", body: { id: s2.id } });
      await sources();
    });
    card.append(del);
    if (s2.status !== "needs_content") {
      const discuss = el("button", "secondary", "\u041E\u0431\u0441\u0443\u0434\u0438\u0442\u044C");
      discuss.onclick = () => {
        attachedSource = s2.id;
        setView("chat");
        $2("message").value = "\u041E\u0431\u0441\u0443\u0434\u0438 \u044D\u0442\u043E\u0442 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A";
        $2("message").focus();
        notify("\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0451\u043D \u043A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044E.");
      };
      card.append(discuss);
      const recipe = el("button", "secondary", "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0440\u0435\u0446\u0435\u043F\u0442");
      recipe.onclick = () => {
        recipeSource = s2.id;
        $2("source-recipe-form").reset();
        dialogs.open("source", "sr-name");
      };
      card.append(recipe);
      if (s2.status === "draft") {
        const review = el("button", "secondary", "\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u043D\u044B\u043C");
        review.onclick = () => run(async () => {
          await cfApi("/api/sources/review", { method: "POST", body: { id: s2.id, reviewed: true } });
          await sources();
        });
        card.append(review);
      }
    }
    box.append(card);
  }
}
$2("invite-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const d2 = await cfApi("/api/admin/invites", { method: "POST", body: { email: new FormData(e.target).get("email") } });
    $2("invite-link").textContent = "\u0421\u0441\u044B\u043B\u043A\u0430 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043E\u0434\u0438\u043D \u0440\u0430\u0437: " + d2.link;
    await admin();
  });
};
async function admin() {
  const d2 = await cfApi("/api/admin/summary"), box = $2("admin-summary");
  box.replaceChildren();
  let counts = document.createElement("p");
  counts.textContent = `\u0410\u043A\u0442\u0438\u0432\u043D\u044B: ${d2.active}, \u043E\u0436\u0438\u0434\u0430\u044E\u0442: ${d2.pending}, \u0438\u0441\u0442\u0435\u043A\u043B\u0438: ${d2.expired}`;
  box.append(counts);
  for (const m of d2.members) {
    let row = document.createElement("div");
    row.className = "member";
    row.textContent = `${m.email} \xB7 ${{ active: "\u0430\u043A\u0442\u0438\u0432\u0435\u043D", suspended: "\u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D", pending: "\u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F" }[m.status] || m.status} \xB7 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u043B\u0441\u044F: ${new Date(m.joined_at * 1e3).toLocaleDateString("ru")} \xB7 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0432\u0445\u043E\u0434: ${new Date(m.last_active * 1e3).toLocaleDateString("ru")} \xB7 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432: ${m.requests} `;
    if (m.role === "member" && m.status !== "pending") {
      let b2 = document.createElement("button");
      b2.textContent = m.status === "active" ? "\u041F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C" : "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C";
      b2.onclick = () => run(async () => {
        await cfApi("/api/admin/members/status", { method: "POST", body: { id: m.id, status: m.status === "active" ? "suspended" : "active" } });
        await admin();
      });
      row.append(b2);
    }
    box.append(row);
  }
  for (const i of d2.invites) {
    if (!i.revoked_at && !i.claimed_by && i.expires_at > Date.now() / 1e3) {
      let row = document.createElement("div");
      row.className = "member";
      row.textContent = "\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435: " + i.email + " ";
      let b2 = document.createElement("button");
      b2.textContent = "\u041E\u0442\u043E\u0437\u0432\u0430\u0442\u044C";
      b2.onclick = () => run(async () => {
        await cfApi("/api/admin/invites/revoke", { method: "POST", body: { id: i.id } });
        await admin();
      });
      row.append(b2);
      box.append(row);
    }
  }
}
$2("sr-close").onclick = () => dialogs.close();
$2("source-recipe-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    if (!recipeSource) throw Error("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A.");
    const states = { "\u0441\u044B\u0440\u043E\u0439": "raw", "\u0433\u043E\u0442\u043E\u0432\u044B\u0439": "ready_to_eat", "\u0437\u0430\u043F\u0435\u0447\u0451\u043D\u043D\u044B\u0439": "cooked_roasted", "\u0432\u0430\u0440\u0451\u043D\u044B\u0439": "cooked_boiled", "\u0441\u0443\u0445\u043E\u0439": "dry", "\u043A\u043E\u043D\u0441\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439": "canned", "\u0431\u0435\u0437 \u0436\u0438\u0434\u043A\u043E\u0441\u0442\u0438": "canned_drained", "\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C": "ready_to_cook", "\u0441\u0443\u0445\u043E\u0439 \u0436\u0430\u0440": "cooked_dry_heat", "\u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0439": "cooked" };
    const ingredients = $2("sr-ingredients").value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split(";").map((x) => x.trim());
      const grams = Number((parts[1] || "").replace(",", ".")), st = states[(parts[2] || "").toLowerCase()];
      if (parts.length !== 3 || !/^[FU][A-Za-z0-9_-]+$/.test(parts[0]) || !Number.isFinite(grams) || grams <= 0 || !st) throw Error("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u0430\u0436\u0434\u0443\u044E \u0441\u0442\u0440\u043E\u043A\u0443: \u043A\u043E\u0434; \u0433\u0440\u0430\u043C\u043C\u044B; \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435.");
      return { food_id: parts[0], grams_edible: grams, state: st };
    });
    if (!ingredients.length || ingredients.length > 20) throw Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043E\u0442 1 \u0434\u043E 20 \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442\u043E\u0432.");
    const payload = { recipe_id: "R" + crypto.randomUUID().replaceAll("-", ""), name_ru: $2("sr-name").value, category: $2("sr-category").value, protein_family: "other", base_servings: Number($2("sr-servings").value), active_minutes: Number($2("sr-minutes").value), ingredients, steps_ru: $2("sr-steps").value };
    const d2 = await call("keto_propose_change", { event_type: "catalog.recipe.add", payload, expected_revision: state.revision, source_id: recipeSource });
    $2("source-recipe-dialog").close();
    accept(d2);
  });
};
$2("cf-login").onclick = () => run(() => authSession.login(transient.getItem("keto_invite") || ""));
$2("cf-claim-button").onclick = () => run(() => authSession.claim(transient.getItem("keto_invite") || ""));
$2("cf-switch").onclick = () => run(() => authSession.logout());
$2("cf-auth-retry").onclick = () => run(() => authSession.phase === "logout-error" ? authSession.logout() : authSession.retry());
$2("cf-auth-logout").onclick = () => run(() => authSession.logout());
$2("continue-deletion").onclick = () => run(async () => {
  const receipt = transient.getItem("keto_deletion_receipt") || $2("deletion-code").value.trim();
  if (!receipt) {
    $2("deletion-status").textContent = "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0439 \u043A\u043E\u0434 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F.";
    return;
  }
  const d2 = await cfApi("/api/deletion/continue", { method: "POST", body: { receipt } });
  $2("deletion-status").textContent = d2.status === "complete" ? "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u044B. \u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u044B\u0445 \u043A\u043E\u043F\u0438\u0439 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0430\u044F." : "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0435\u0442\u0441\u044F; \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u043F\u043E\u0437\u0436\u0435. \u041A\u043E\u0434: " + receipt;
  if (d2.status === "complete") transient.removeItem("keto_deletion_receipt");
});
function start() {
  const url = new URL(location.href), incoming = url.searchParams.get("invite");
  if (incoming) {
    transient.setItem("keto_invite", incoming);
    url.searchParams.delete("invite");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  $2("deletion-code").value = transient.getItem("keto_deletion_receipt") || "";
  return authSession.start();
}
var mobile = setupMobile({ $: $2, el, call, accept, getState: () => state, setView, run, notify, openDialog: (kind, focus) => dialogs.open(kind, focus), closeDialog: () => dialogs.close(), epoch: () => screenEpoch, setImage: (value) => image = value, getImage: () => image, loadImageLink: async (url) => (await cfApi("/api/media/image-link", { method: "POST", body: { url, remote_request_acknowledged: true } })).image_data_url });
var developer = setupDeveloper({ $: $2, el, api: cfApi, preview: async (path) => {
  const stamp = screenEpoch, r = await fetch(path, { credentials: "same-origin" });
  if (!r.ok) throw Error("\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D.");
  const text = await r.text();
  if (stamp !== screenEpoch) throw Error("\u0421\u0435\u0430\u043D\u0441 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F.");
  return text;
}, epoch: () => screenEpoch, notify, setView, isOwner: () => session?.user?.role === "admin", hasAttachment: () => Boolean(image || attachedSource || recipeSource) });
mountDeveloperExtension($2("chat-extras"));
var guided = setupGuidance({ $: $2, el, getState: () => state, call, accept, notify, run, setView, epoch: () => screenEpoch });
var router = createRouter({ location, history, listen: (name2, fn) => window.addEventListener(name2, fn), render: renderView, closeDialog: (kind, options) => dialogs.sync(kind, options), fallback: () => state?.guidance?.ready ? state.ui.home || "chat" : guided.resolve("setup") });
var intake = setupIntake({ $: $2, el, call: recipePageCall, getState: () => state, accept, notify, run, openDialog: (kind, focus) => dialogs.open(kind, focus), closeDialog: () => dialogs.close(), setView, epoch: () => screenEpoch, isDiaryActive: () => view === "diary", propose });
var kitchen = setupKitchen({ $: $2, el, call: recipePageCall, getState: () => state, accept, run, notify, setView, epoch: () => screenEpoch, openIntake: (source) => intake.open(source) });
var chatActions = setupChatActions({ el, call: recipePageCall, getState: () => state, epoch: () => screenEpoch, getContext: () => presentationEpoch + "|" + dialogs.version, refresh, run, notify, navigate: setView, chooseMode: (mode) => {
  kitchen.chooseMode(mode);
  setView("recipes");
  $2("recipe-kitchen-disclosure").open = true;
  $2("recipe-kitchen-disclosure").scrollIntoView({ block: "start" });
}, openRecipe: (recipe, source) => {
  if (recipe.draft_label) {
    const card = kitchen.card(recipe, { source });
    card.querySelector(".kitchen-actions")?.before(recipeActionHint(true));
    $2("recipe-detail").replaceChildren(card);
    dialogs.open("recipe", "recipe-close-top");
  } else openRecipe(recipe, source);
}, openIntake: (source) => intake.open(source), showProposal });
var shop = setupShop({ $: $2, el, call: recipePageCall, api: (path, method, body) => cfApi(path, { method, body }), getState: () => state, accept, run, epoch: () => screenEpoch, allergens: ALLERGENS, onPantryPreview: (name2) => {
  setView("recipes");
  $2("recipe-kitchen-disclosure").open = true;
  kitchen.previewSavedPantry(name2);
}, onPantryReset: () => kitchen.cancelSavedPreview(), onOwnFood: (food) => ownDish.addConfirmedFood(food), openIntake: (source) => intake.open(source), setView });
$2("menu-shop").onclick = () => {
  setView("products");
  const panel = $2("shop-root").querySelector("details");
  if (panel) {
    panel.open = true;
    panel.scrollIntoView({ block: "nearest" });
  }
};
var ownDish = setupOwnDish({ $: $2, el, allergens: ALLERGENS, call: recipePageCall, getState: () => state, accept, run, epoch: () => screenEpoch, foodState, numberRu, openIntake: (source) => intake.open(source) });
var renderedAuthPhase = null;
function renderAuth({ phase, identity, config, error }) {
  loginConfig = config;
  const ready = phase === "ready", busy2 = ["checking", "loading", "signing-in", "finishing", "signing-out", "claiming"].includes(phase);
  if (!ready && renderedAuthPhase === "ready") {
    state = null;
    clearScreen();
  }
  renderedAuthPhase = phase;
  $2("login").hidden = ready;
  $2("workspace").hidden = !ready;
  $2("login").dataset.authPhase = phase;
  $2("cf-auth-actions").setAttribute("aria-busy", String(busy2));
  $2("cf-login").hidden = phase !== "signed-out" || !config;
  $2("cf-login").disabled = busy2 || !config;
  const needsRetry = ["session-error", "workspace-error", "logout-error"].includes(phase) || phase === "signed-out" && !config;
  $2("cf-auth-retry").hidden = !needsRetry;
  $2("cf-auth-retry").disabled = busy2;
  $2("cf-auth-retry").textContent = phase === "workspace-error" ? "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443" : phase === "logout-error" ? "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0432\u044B\u0445\u043E\u0434" : "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0432\u0445\u043E\u0434";
  $2("cf-claim").hidden = !["pending", "claiming"].includes(phase);
  $2("cf-claim-button").disabled = busy2;
  $2("cf-switch").disabled = busy2;
  $2("cf-auth-logout").hidden = !identity || !["session-error", "workspace-error", "logout-error"].includes(phase);
  $2("cf-auth-logout").disabled = busy2;
  $2("cf-auth-account").hidden = !identity || identity.user.status !== "active" || !["loading", "workspace-error", "ready"].includes(phase);
  $2("cf-auth-account").textContent = identity?.user.status === "active" ? identity.user.role === "admin" ? "\u0412\u0445\u043E\u0434 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D \xB7 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440" : "\u0412\u0445\u043E\u0434 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D" : "";
  const labels2 = { checking: "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0432\u0445\u043E\u0434\u2026", "signing-in": "\u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u043C \u043E\u043A\u043D\u043E Google\u2026", finishing: "\u0417\u0430\u0432\u0435\u0440\u0448\u0430\u0435\u043C \u0432\u0445\u043E\u0434\u2026", loading: "\u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u043C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435\u2026", "signing-out": "\u0417\u0430\u0432\u0435\u0440\u0448\u0430\u0435\u043C \u0441\u0435\u0430\u043D\u0441\u2026", claiming: "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435\u2026", "session-error": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0432\u0445\u043E\u0434. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435.", "workspace-error": "\u0412\u0445\u043E\u0434 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D. \u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443 \u2014 \u0437\u0430\u043D\u043E\u0432\u043E \u0432\u0445\u043E\u0434\u0438\u0442\u044C \u0432 Google \u043D\u0435 \u043D\u0443\u0436\u043D\u043E.", "logout-error": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0432\u044B\u0445\u043E\u0434. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0432\u044B\u0445\u043E\u0434, \u043A\u043E\u0433\u0434\u0430 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435." };
  $2("cf-login-message").textContent = phase === "signed-out" ? error ? authMessage(error) : config ? "\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 Google, \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043B\u0438\u0447\u043D\u043E\u0435 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u043E." : "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0432\u0445\u043E\u0434\u0430\u2026" : phase === "pending" ? error ? authMessage(error) : "\u0410\u043A\u043A\u0430\u0443\u043D\u0442: " + identity.user.email + ". \u041F\u0440\u0438\u043C\u0438\u0442\u0435 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C." : labels2[phase] || "";
  $2("cf-auth-detail").hidden = !error;
  $2("cf-auth-code").textContent = error ? authDiagnostic(phase, error) : "";
  $2("connection").textContent = ready ? "\u041B\u0438\u0447\u043D\u043E\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435" : busy2 ? "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u0435\u043C\u0441\u044F\u2026" : identity ? "\u0412\u0445\u043E\u0434 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D" : "\u041B\u0438\u0447\u043D\u043E\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435";
  document.querySelectorAll(".head-actions [data-view]").forEach((button) => button.disabled = !ready);
  if (!ready) {
    $2("nav-back").hidden = true;
    $2("pending-open").hidden = true;
  }
  if (!busy2 && !ready && document.activeElement?.closest("[hidden]")) $2("cf-auth-title").focus({ preventScroll: true });
}
var authSession = createAuthSession({
  api: (path, options = {}) => authJson(fetch, path, { ...options, csrf: session?.csrf }),
  authenticate: (config, invite, options) => {
    if (config.provider === "firebase_google") return firebaseLogin(config.firebase, invite, (path, body, requestOptions) => authJson(fetch, path, { method: "POST", body, ...requestOptions }), options);
    return bounded((signal) => authJson(fetch, "/auth/google/start", { method: "POST", body: { invite }, signal }), { signal: options.signal }).then((data) => {
      location.assign(data.authorization_url);
      return { redirect: true };
    });
  },
  identityChanged: (next) => {
    if (!next) {
      state = null;
      session = null;
      csrf = null;
      showLogin();
      return;
    }
    if (session?.user?.email && session.user.email !== next.user.email) {
      state = null;
      clearScreen();
    }
    session = next;
    csrf = next.csrf;
    $2("admin-tab").hidden = next.user.role !== "admin";
    developer.identity();
    if (next.user.status === "active") transient.removeItem("keto_invite");
  },
  loadWorkspace: (signal) => call("keto_open", {}, { signal, authBootstrap: true }),
  openWorkspace: (data) => {
    setState(data.state);
    if (data.shopping) renderShopping(data.shopping);
    setView(guided.initial(state, location.hash), { replace: true, reason: "initial" });
  },
  view: renderAuth
});
run(start);
