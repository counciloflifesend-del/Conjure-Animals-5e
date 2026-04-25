const beasts = [
  {
    id: "wolf",
    name: "Wolf",
    size: "Medium Beast",
    alignment: "Unaligned",
    cr: "1/4",
    environment: "forest",
    ac: 13,
    hp: 11,
    count: 8,
    attackBonus: 4,
    diceCount: 2,
    diceSize: 4,
    damageBonus: 2,
    attackName: "Bite",
    traits: ["Pack Tactics"],
    art: "art-wolf",
    note: "Pack Tactics. Advantage on attack rolls if an ally is within 5 ft."
  },
  {
    id: "raptor",
    name: "Velociraptor",
    size: "Tiny Beast",
    alignment: "Unaligned",
    cr: "1/4",
    environment: "grassland",
    ac: 13,
    hp: 10,
    count: 8,
    attackBonus: 4,
    diceCount: 1,
    diceSize: 6,
    damageBonus: 2,
    attackName: "Bite + Claws",
    traits: ["Pack Tactics", "Multiattack"],
    art: "art-raptor",
    note: "Multiattack and Pack Tactics make this a high-output conjuration option."
  },
  {
    id: "owl",
    name: "Giant Owl",
    size: "Large Beast",
    alignment: "Neutral",
    cr: "1/4",
    environment: "forest",
    ac: 12,
    hp: 19,
    count: 8,
    attackBonus: 3,
    diceCount: 2,
    diceSize: 6,
    damageBonus: 1,
    attackName: "Talons",
    traits: ["Flyby"],
    art: "art-owl",
    note: "Flyby. Does not provoke opportunity attacks when it flies out of reach."
  },
  {
    id: "elk",
    name: "Elk",
    size: "Large Beast",
    alignment: "Unaligned",
    cr: "1/4",
    environment: "grassland",
    ac: 10,
    hp: 13,
    count: 8,
    attackBonus: 5,
    diceCount: 1,
    diceSize: 6,
    damageBonus: 3,
    attackName: "Ram",
    traits: ["Charge"],
    art: "art-wolf",
    note: "Charge. Adds extra damage after moving straight toward the target."
  },
  {
    id: "constrictor",
    name: "Constrictor Snake",
    size: "Large Beast",
    alignment: "Unaligned",
    cr: "1/4",
    environment: "swamp",
    ac: 12,
    hp: 13,
    count: 8,
    attackBonus: 4,
    diceCount: 1,
    diceSize: 8,
    damageBonus: 2,
    attackName: "Constrict",
    traits: ["Grapple"],
    art: "art-raptor",
    note: "Constrict can restrain a target, making follow-up attacks more reliable."
  },
  {
    id: "crocodile",
    name: "Crocodile",
    size: "Large Beast",
    alignment: "Unaligned",
    cr: "1/2",
    environment: "swamp",
    ac: 12,
    hp: 19,
    count: 4,
    attackBonus: 4,
    diceCount: 1,
    diceSize: 10,
    damageBonus: 2,
    attackName: "Bite",
    traits: ["Grapple"],
    art: "art-raptor",
    note: "A heavier summon profile with control pressure through grappling."
  }
];

const defaultSettings = {
  theme: "dark",
  scriptSize: 2,
  defaultCount: 8,
  defaultAc: 15
};

const keys = {
  theme: "conjurerTheme",
  settings: "conjurerSettings",
  selected: "conjurerSelectedBeast",
  history: "conjurerRollHistory"
};

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSettings() {
  return { ...defaultSettings, ...readJson(keys.settings, {}) };
}

function setSettings(next) {
  const settings = { ...getSettings(), ...next };
  saveJson(keys.settings, settings);
  if (next.theme) localStorage.setItem(keys.theme, next.theme);
  applyTheme();
  return settings;
}

function getHistory() {
  return readJson(keys.history, []);
}

function setHistory(history) {
  saveJson(keys.history, history.slice(0, 12));
}

function applyTheme() {
  const storedTheme = localStorage.getItem(keys.theme);
  const settings = getSettings();
  const theme = storedTheme || settings.theme || "dark";
  document.body.classList.toggle("light", theme === "light");
  document.documentElement.style.setProperty("--copy-scale", settings.scriptSize === 1 ? "0.94" : settings.scriptSize === 3 ? "1.08" : "1");
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeChoice === theme);
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
  });
}

function toast(message) {
  let box = document.querySelector(".toast");
  if (!box) {
    box = document.createElement("div");
    box.className = "toast";
    box.setAttribute("role", "status");
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.classList.add("show");
  window.clearTimeout(window.__toastTimer);
  window.__toastTimer = window.setTimeout(() => box.classList.remove("show"), 2600);
}

function averageDice(count, size) {
  return count * ((size + 1) / 2);
}

function normalHitChance(targetAc, attackBonus) {
  let hits = 0;
  for (let roll = 2; roll <= 19; roll += 1) {
    if (roll + attackBonus >= targetAc) hits += 1;
  }
  return hits / 20;
}

function hitMath(targetAc, attackBonus, advantage) {
  const normal = normalHitChance(targetAc, attackBonus);
  const crit = 1 / 20;
  const miss = 1 - normal - crit;
  if (!advantage) return { normal, crit, miss };
  return {
    normal: Math.max(0, 1 - miss * miss - (1 - 0.95 * 0.95)),
    crit: 1 - 0.95 * 0.95,
    miss: miss * miss
  };
}

function rollDie(size) {
  return Math.floor(Math.random() * size) + 1;
}

function rollDamage(diceCount, diceSize, damageBonus, crit, charge) {
  let total = damageBonus;
  const diceToRoll = crit ? diceCount * 2 : diceCount;
  for (let i = 0; i < diceToRoll; i += 1) total += rollDie(diceSize);
  if (charge) total += rollDie(6);
  return total;
}

function currentCalculatorState() {
  const selected = document.querySelector("#creature-count");
  const count = Number(selected?.value || 8);
  return {
    count,
    targetAc: Number(document.querySelector("#target-ac")?.value || 15),
    attackBonus: Number(document.querySelector("#attack-bonus")?.value || 4),
    diceCount: Number(document.querySelector("#dice-count")?.value || 1),
    diceSize: Number(document.querySelector("#dice-size")?.value || 6),
    damageBonus: Number(document.querySelector("#damage-bonus")?.value || 2),
    advantage: document.querySelector("#advantage-toggle")?.getAttribute("aria-pressed") === "true",
    packTactics: document.querySelector("#pack-toggle")?.getAttribute("aria-pressed") === "true",
    charge: document.querySelector("#charge-toggle")?.getAttribute("aria-pressed") === "true",
    beast: document.querySelector("#active-beast")?.textContent || "Custom Beasts"
  };
}

function setToggle(id, value) {
  const button = document.querySelector(id);
  if (!button) return;
  button.setAttribute("aria-pressed", String(value));
  button.closest(".modifier")?.classList.toggle("active", value);
}

function applyBeastToCalculator(beast) {
  const selected = beast || readJson(keys.selected, null);
  const settings = getSettings();
  if (!selected) {
    document.querySelector("#creature-count").value = settings.defaultCount;
    document.querySelector("#target-ac").value = settings.defaultAc;
    return;
  }
  document.querySelector("#creature-count").value = selected.count;
  document.querySelector("#attack-bonus").value = selected.attackBonus;
  document.querySelector("#dice-count").value = selected.diceCount;
  document.querySelector("#dice-size").value = selected.diceSize;
  document.querySelector("#damage-bonus").value = selected.damageBonus;
  document.querySelector("#active-beast").textContent = selected.name;
  setToggle("#pack-toggle", selected.traits?.includes("Pack Tactics"));
  setToggle("#charge-toggle", selected.traits?.includes("Charge"));
}

function renderCalculator(saveRoll = false) {
  const state = currentCalculatorState();
  const advantage = state.advantage || state.packTactics;
  const chances = hitMath(state.targetAc, state.attackBonus, advantage);
  const avgNormal = averageDice(state.diceCount, state.diceSize) + state.damageBonus + (state.charge ? 3.5 : 0);
  const avgCrit = averageDice(state.diceCount * 2, state.diceSize) + state.damageBonus + (state.charge ? 3.5 : 0);
  const expected = state.count * (chances.normal * avgNormal + chances.crit * avgCrit);

  const rolls = Array.from({ length: state.count }, () => {
    const first = rollDie(20);
    const second = advantage ? rollDie(20) : null;
    const d20 = second ? Math.max(first, second) : first;
    const crit = d20 === 20;
    const hit = crit || (d20 !== 1 && d20 + state.attackBonus >= state.targetAc);
    const damage = hit ? rollDamage(state.diceCount, state.diceSize, state.damageBonus, crit, state.charge) : 0;
    return { d20, first, second, hit, crit, damage };
  });
  const total = rolls.reduce((sum, roll) => sum + roll.damage, 0);

  document.querySelector("#expected-damage").textContent = expected.toFixed(1);
  document.querySelector("#target-chip").textContent = `Target AC: ${state.targetAc}`;
  document.querySelector("#attack-chip").textContent = `vs ${state.count} Attacks`;
  document.querySelector("#single-damage").textContent = total;
  document.querySelector("#single-context").textContent = `Result of ${state.count} distinct d20 rolls against AC ${state.targetAc}.`;

  const chips = document.querySelector("#roll-chips");
  chips.innerHTML = rolls.map((roll) => {
    const label = roll.crit ? "CRIT" : roll.hit ? "Hit" : "Miss";
    return `<span class="roll-chip">${label} (${roll.d20})</span>`;
  }).join("");

  const hitPct = (chances.normal + chances.crit) * 100;
  const critPct = chances.crit * 100;
  const missPct = chances.miss * 100;
  updateBar("hit", hitPct);
  updateBar("crit", critPct);
  updateBar("miss", missPct);
  document.querySelector("#requirement").textContent = advantage ? "Advantage active" : `Needs ${Math.max(2, state.targetAc - state.attackBonus)}+`;

  if (saveRoll) {
    const entry = {
      id: crypto.randomUUID?.() || String(Date.now()),
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      total,
      expected: expected.toFixed(1),
      state
    };
    setHistory([entry, ...getHistory()]);
    renderHistory();
  }
}

function updateBar(name, value) {
  const pct = Math.max(0, Math.min(100, value));
  document.querySelector(`#${name}-value`).textContent = `${pct.toFixed(pct >= 10 ? 1 : 2)}%`;
  document.querySelector(`#${name}-bar`).style.setProperty("--value", `${pct}%`);
}

function renderHistory() {
  const list = document.querySelector("#history-list");
  if (!list) return;
  const history = getHistory();
  if (!history.length) {
    list.innerHTML = `<div class="empty">No rolls logged yet. Calculate once to begin the ledger.</div>`;
    return;
  }
  list.innerHTML = history.map((entry) => `
    <button class="history-row" data-history-id="${entry.id}">
      <span class="muted">Today, ${entry.createdAt}</span>
      <span class="chip">${entry.state.count} Creatures</span>
      <span>AC ${entry.state.targetAc}${entry.state.advantage || entry.state.packTactics ? " - Adv" : ""} - ${entry.state.beast}</span>
      <span><span class="muted">Total Damage</span> <strong class="history-total">${entry.total}</strong></span>
    </button>
  `).join("");
  list.querySelectorAll("[data-history-id]").forEach((row) => {
    row.addEventListener("click", () => {
      const entry = getHistory().find((item) => item.id === row.dataset.historyId);
      if (!entry) return;
      restoreCalculator(entry.state);
      toast("Roll restored from history.");
    });
  });
}

function restoreCalculator(state) {
  document.querySelector("#creature-count").value = state.count;
  document.querySelector("#target-ac").value = state.targetAc;
  document.querySelector("#attack-bonus").value = state.attackBonus;
  document.querySelector("#dice-count").value = state.diceCount;
  document.querySelector("#dice-size").value = state.diceSize;
  document.querySelector("#damage-bonus").value = state.damageBonus;
  document.querySelector("#active-beast").textContent = state.beast;
  setToggle("#advantage-toggle", state.advantage);
  setToggle("#pack-toggle", state.packTactics);
  setToggle("#charge-toggle", state.charge);
  renderCalculator(false);
}

function initCalculator() {
  applyBeastToCalculator();
  document.querySelectorAll("#calculator-form input, #calculator-form select").forEach((control) => {
    control.addEventListener("input", () => renderCalculator(false));
  });
  document.querySelectorAll(".switch").forEach((button) => {
    button.addEventListener("click", () => {
      setToggle(`#${button.id}`, button.getAttribute("aria-pressed") !== "true");
      renderCalculator(false);
    });
  });
  document.querySelector("#calculate-button").addEventListener("click", () => renderCalculator(true));
  document.querySelector("#reroll-button").addEventListener("click", () => {
    renderCalculator(false);
    toast("Single simulation rerolled.");
  });
  document.querySelector("#collapse-advanced").addEventListener("click", () => {
    const content = document.querySelector("#advanced-content");
    content.hidden = !content.hidden;
    document.querySelector("#collapse-advanced").textContent = content.hidden ? "+" : "-";
  });
  renderCalculator(false);
  renderHistory();
}

function renderLibrary() {
  const grid = document.querySelector("#library-grid");
  if (!grid) return;
  const search = document.querySelector("#search-beasts").value.trim().toLowerCase();
  const cr = document.querySelector("#filter-cr").value;
  const env = document.querySelector("#filter-env").value;
  const filtered = beasts.filter((beast) => {
    const matchesSearch = !search || beast.name.toLowerCase().includes(search) || beast.traits.join(" ").toLowerCase().includes(search);
    return matchesSearch && (!cr || beast.cr === cr) && (!env || beast.environment === env);
  });
  grid.innerHTML = filtered.length ? filtered.map((beast) => `
    <article class="panel library-card" data-beast-card="${beast.id}">
      <div class="beast-art ${beast.art}">
        <div class="beast-heading">
          <h2>${beast.name}</h2>
          <p>${beast.size} - ${beast.alignment}</p>
        </div>
      </div>
      <div class="panel-pad stack">
        <div class="stat-grid">
          <div class="stat-box"><span class="label">AC</span><strong>${beast.ac}</strong></div>
          <div class="stat-box"><span class="label">HP</span><strong>${beast.hp}</strong></div>
          <div class="stat-box"><span class="label">CR</span><strong>${beast.cr}</strong></div>
        </div>
        <div class="attack-box">
          <strong class="label">${beast.attackName}</strong>
          <div class="attack-line"><span>+${beast.attackBonus} to hit</span><strong class="gold">${beast.diceCount}d${beast.diceSize} + ${beast.damageBonus}</strong></div>
        </div>
        <p class="muted">${beast.note}</p>
        <button class="primary-button" data-import-beast="${beast.id}">+ Import to Calculator</button>
      </div>
    </article>
  `).join("") : `<div class="panel panel-pad empty">No beasts match those filters.</div>`;
  grid.querySelectorAll("[data-import-beast]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const beast = beasts.find((item) => item.id === button.dataset.importBeast);
      saveJson(keys.selected, beast);
      toast(`${beast.name} imported. Opening calculator...`);
      setTimeout(() => { window.location.href = "index.html"; }, 450);
    });
  });
}

function initLibrary() {
  ["#search-beasts", "#filter-cr", "#filter-env"].forEach((selector) => {
    document.querySelector(selector).addEventListener("input", renderLibrary);
  });
  renderLibrary();
}

function initSettings() {
  const settings = getSettings();
  document.querySelector("#default-count").value = settings.defaultCount;
  document.querySelector("#default-ac").value = settings.defaultAc;
  document.querySelector("#script-size").value = settings.scriptSize;
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      setSettings({ theme: button.dataset.themeChoice });
      toast(`${button.dataset.themeChoice === "light" ? "Light" : "Dark"} mode applied.`);
    });
  });
  document.querySelector("#script-size").addEventListener("input", (event) => {
    setSettings({ scriptSize: Number(event.target.value) });
  });
  document.querySelector("#default-count").addEventListener("input", (event) => {
    setSettings({ defaultCount: Number(event.target.value) });
  });
  document.querySelector("#default-ac").addEventListener("input", (event) => {
    setSettings({ defaultAc: Number(event.target.value) });
  });
  document.querySelector("#export-data").addEventListener("click", () => {
    const payload = {
      settings: getSettings(),
      selectedBeast: readJson(keys.selected, null),
      history: getHistory()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "conjurers-ledger-export.json";
    link.click();
    URL.revokeObjectURL(url);
    toast("Ledger export prepared.");
  });
  document.querySelector("#clear-history").addEventListener("click", () => {
    if (!confirm("Clear all roll history from this browser?")) return;
    setHistory([]);
    toast("Roll history cleared.");
  });
}

function initAbout() {
  document.querySelector("#dispatch-missive")?.addEventListener("click", () => {
    window.location.href = "mailto:scribe@conjurersledger.example?subject=Conjurer%27s%20Ledger%20Feedback";
  });
  document.querySelector("#astral-network")?.addEventListener("click", async () => {
    const shareData = { title: "Conjurer's Ledger", text: "Conjure Animals damage calculator", url: window.location.href };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard?.writeText(window.location.href);
      toast("Page link copied to your clipboard.");
    }
  });
}

function initHelp() {
  document.querySelectorAll(".side-nav a").forEach((link) => {
    link.addEventListener("click", () => toast(`Jumped to ${link.textContent}.`));
  });
}

function fountainOutcome(value) {
  return {
    1: "roll a Constitution Saving Throw!",
    2: "you can't speak!",
    3: "you change sex!",
    4: "you gain Temperary HP!"
  }[value];
}

function rollFountainD4() {
  const value = Math.floor(Math.random() * 4) + 1;
  document.querySelector("#fountain-result-number").textContent = value;
  document.querySelector("#fountain-outcome").textContent = fountainOutcome(value);
}

function ensureFountainModal() {
  let modal = document.querySelector("#fountain-modal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.className = "fountain-modal";
  modal.id = "fountain-modal";
  modal.innerHTML = `
    <section class="fountain-card" role="dialog" aria-modal="true" aria-labelledby="fountain-title">
      <header>
        <h2 id="fountain-title">Fun Fountain Dew Roll, roll d4!</h2>
        <button class="icon-button" id="fountain-close" type="button" aria-label="Close fountain roll">x</button>
      </header>
      <div class="fountain-result">
        <span class="label">your reselt:</span>
        <div class="fountain-number" id="fountain-result-number">1</div>
        <p class="fountain-outcome" id="fountain-outcome">roll a Constitution Saving Throw!</p>
      </div>
      <button class="primary-button" id="fountain-reroll" type="button">Roll d4</button>
    </section>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.remove("open");
  });
  modal.querySelector("#fountain-close").addEventListener("click", () => modal.classList.remove("open"));
  modal.querySelector("#fountain-reroll").addEventListener("click", rollFountainD4);
  return modal;
}

function initFountainRoll() {
  document.querySelector("#fountain-roll-button")?.addEventListener("click", () => {
    const modal = ensureFountainModal();
    rollFountainD4();
    modal.classList.add("open");
  });
}

function initGlobal() {
  applyTheme();
  initFountainRoll();
  document.querySelectorAll("[data-toast]").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      toast(item.dataset.toast);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initGlobal();
  const page = document.body.dataset.page;
  if (page === "calculator") initCalculator();
  if (page === "library") initLibrary();
  if (page === "settings") initSettings();
  if (page === "about") initAbout();
  if (page === "help") initHelp();
});
