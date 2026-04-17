const STORAGE_KEY = "pak-click-save-v2";

const BUILDINGS = [
  { id: "manual_line", name: "Оператор", description: "Выполняет ручные операции.", baseCost: 15, basePps: 0.2 },
  { id: "mechanic", name: "Наладчик", description: "Снижает простои линии.", baseCost: 60, basePps: 1 },
  { id: "pfm_machine", name: "Машина ПФМ", description: "Формирует заготовки пакетов.", baseCost: 250, basePps: 4 },
  { id: "extruder", name: "Экструдер", description: "Выпускает пленку.", baseCost: 1100, basePps: 10 },
  { id: "cutting_line", name: "Уголок", description: "Складывает пленку.", baseCost: 5000, basePps: 22 },
  { id: "printing_module", name: "Флексопечать", description: "Наносит брендинг.", baseCost: 12000, basePps: 48 },
  { id: "welding_station", name: "Слиттер", description: "Подготавливает полотно.", baseCost: 30000, basePps: 100 },
  { id: "quality_control", name: "ОТК", description: "Контроль качества.", baseCost: 85000, basePps: 210 },
  { id: "conveyor", name: "Упаковка", description: "Формирование партий.", baseCost: 220000, basePps: 450 },
  { id: "warehouse", name: "Склад", description: "Оптимизация хранения.", baseCost: 600000, basePps: 1000 },
  { id: "robotic_cell", name: "Зона отгрузки", description: "Авто-отправка заказов.", baseCost: 1500000, basePps: 2200 },
];

const SUPER_UPGRADES = [
  { id: "code_operators", name: "Премия Сухову А. А.", description: "ПК на заводе перестали глючить.", cost: 900, tag: "+2 за клик" },
  { id: "new_spare_parts", name: "Новые запчасти", description: "Линия стала бодрее.", cost: 5000, tag: "+12% к выпуску" },
  { id: "introduce_fines", name: "Ввести штрафы", description: "Дисциплина резко выросла.", cost: 18000, tag: "+18% к выпуску" },
  { id: "quality_call", name: "Звонок ДС по браку", description: "Брак чудесным образом исчез.", cost: 55000, tag: "+25% к выпуску" },
  { id: "output_call", name: "Звонок ДС по выработке", description: "План теперь личное дело каждого.", cost: 140000, tag: "+35% к выпуску" },
  { id: "install_cameras", name: "Установить камеры", description: "Простои стали подозрительно короткими.", cost: 350000, tag: "+50% к выпуску" },
];

const ACHIEVEMENTS = [
  { id: "first_100", name: "Первая сотня", desc: "Собрать 100 пакетов", condition: (s) => s.totalPackages >= 100, icon: "📦" },
  { id: "first_k", name: "Тысячник", desc: "Собрать 1 000 пакетов", condition: (s) => s.totalPackages >= 1000, icon: "🚚" },
  { id: "first_m", name: "Миллионер", desc: "Собрать 1 млн пакетов", condition: (s) => s.totalPackages >= 1000000, icon: "🏢" },
  { id: "boss_of_warehouse", name: "Король склада", desc: "Купить 10 складов", condition: (s) => s.buildingsOwned.warehouse >= 10, icon: "🏭" },
  { id: "click_master", name: "Быстрые пальцы", desc: "Сделать 1000 кликов", condition: (s) => s.clickCount >= 1000, icon: "⚡" },
];

const defaultState = () => ({
  packages: 0,
  totalPackages: 0,
  totalPackagesEver: 0,
  equity: 0,
  packageRemainder: 0,
  clickPower: 1,
  clickCount: 0,
  manualUpgradeLevel: 1,
  manualUpgradeCost: 50,
  buildingsOwned: Object.fromEntries(BUILDINGS.map((b) => [b.id, 0])),
  superUpgradesOwned: Object.fromEntries(SUPER_UPGRADES.map((u) => [u.id, false])),
  achievementsUnlocked: [],
  productionBoost: 1,
  events: [{ title: "Смена запущена", text: "Добро пожаловать в Guardix." }],
});

const state = loadState();

const elements = {
  packageCount: document.getElementById("package-count"),
  packagesPerSecond: document.getElementById("packages-per-second"),
  equityCount: document.getElementById("equity-count"),
  clickPower: document.getElementById("click-power"),
  manualLevel: document.getElementById("manual-level"),
  manualUpgradeCost: document.getElementById("manual-upgrade-cost"),
  packageButton: document.getElementById("package-button"),
  clickArea: document.getElementById("click-area"),
  manualUpgradeButton: document.getElementById("manual-upgrade-button"),
  buildingsList: document.getElementById("buildings-list"),
  superUpgradesList: document.getElementById("super-upgrades-list"),
  achievementsList: document.getElementById("achievements-list"),
  buildingTemplate: document.getElementById("building-card-template"),
  eventsLog: document.getElementById("events-log"),
  resetButton: document.getElementById("reset-button"),
  rebrandButton: document.getElementById("rebrand-button"),
  packagePanel: document.querySelector(".package-panel"),
  packageScore: document.querySelector(".package-score"),
  buildingCountAll: document.getElementById("building-count-all"),
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch (e) { return defaultState(); }
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function formatNumber(v) {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + " млрд";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + " млн";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + " тыс";
  return Math.floor(v).toString();
}

function calculateBuildingCost(b) {
  return Math.floor(b.baseCost * Math.pow(1.15, state.buildingsOwned[b.id] || 0));
}

function calculatePPS() {
  let base = BUILDINGS.reduce((sum, b) => sum + (state.buildingsOwned[b.id] || 0) * b.basePps, 0);
  
  // Бонус от Капитала (Prestige): +1% за единицу Equity
  const prestigeMultiplier = 1 + (state.equity * 0.01);
  
  // Бонус от достижений: +2% за каждое достижение
  const achievementMultiplier = 1 + (state.achievementsUnlocked.length * 0.02);
  
  return base * state.productionBoost * prestigeMultiplier * achievementMultiplier;
}

function checkAchievements() {
  ACHIEVEMENTS.forEach(ach => {
    if (!state.achievementsUnlocked.includes(ach.id) && ach.condition(state)) {
      state.achievementsUnlocked.push(ach.id);
      addEvent("Достижение!", `${ach.name}: ${ach.desc}`);
    }
  });
}

function addEvent(title, text) {
  state.events.unshift({ title, text });
  state.events = state.events.slice(0, 6);
}

function renderAchievements() {
  elements.achievementsList.innerHTML = "";
  ACHIEVEMENTS.forEach(ach => {
    const isUnlocked = state.achievementsUnlocked.includes(ach.id);
    const div = document.createElement("div");
    div.className = `achievement-badge ${isUnlocked ? 'unlocked' : ''}`;
    div.innerHTML = ach.icon;
    div.title = `${ach.name}: ${ach.desc} ${isUnlocked ? '✅' : '🔒'}`;
    elements.achievementsList.appendChild(div);
  });
}

function spawnClickText(x, y, amount) {
  const text = document.createElement("div");
  text.className = "click-text";
  text.textContent = `+${formatNumber(amount)}`;
  text.style.left = `${x}px`;
  text.style.top = `${y}px`;
  elements.clickArea.appendChild(text);
  setTimeout(() => text.remove(), 800);
}

function renderBuildings() {
  elements.buildingsList.innerHTML = "";
  let totalOwned = 0;

  BUILDINGS.forEach((b) => {
    const owned = state.buildingsOwned[b.id] || 0;
    totalOwned += owned;
    const cost = calculateBuildingCost(b);
    const frag = elements.buildingTemplate.content.cloneNode(true);
    const btn = frag.querySelector(".building-card");

    frag.querySelector(".building-name").textContent = b.name;
    frag.querySelector(".building-description").textContent = b.description;
    frag.querySelector(".building-count").textContent = `${owned} шт.`;
    frag.querySelector(".building-pps").textContent = `+${formatNumber(b.basePps)}/сек`;
    frag.querySelector(".building-cost").textContent = `Цена: ${formatNumber(cost)}`;

    btn.disabled = state.packages < cost;
    btn.onclick = () => purchaseBuilding(b.id);
    elements.buildingsList.appendChild(frag);
  });
  elements.buildingCountAll.textContent = `${totalOwned} / ${BUILDINGS.length * 100}`;
}

function renderSuperUpgrades() {
  elements.superUpgradesList.innerHTML = "";
  SUPER_UPGRADES.forEach((u) => {
    const purchased = state.superUpgradesOwned[u.id];
    const btn = document.createElement("button");
    btn.className = `building-card ${purchased ? 'is-purchased' : ''}`;
    btn.innerHTML = `
      <div class="building-card-main">
        <div><h5 class="building-name">${u.name}</h5><p class="building-description">${u.description}</p></div>
        <div class="building-meta"><span class="building-card-tag">${u.tag}</span></div>
      </div>
      <div class="building-card-footer">
        <span class="building-cost">${purchased ? 'Применено' : 'Цена: ' + formatNumber(u.cost)}</span>
        <span>${purchased ? '✅' : 'Купить'}</span>
      </div>`;
    btn.disabled = purchased || state.packages < u.cost;
    btn.onclick = () => purchaseSuperUpgrade(u.id);
    elements.superUpgradesList.appendChild(btn);
  });
}

function renderStats() {
  elements.packageCount.textContent = formatNumber(state.packages);
  elements.packagesPerSecond.textContent = formatNumber(calculatePPS());
  elements.equityCount.textContent = formatNumber(state.equity);
  elements.clickPower.textContent = formatNumber(state.clickPower);
  elements.manualLevel.textContent = state.manualUpgradeLevel;
  elements.manualUpgradeCost.textContent = formatNumber(state.manualUpgradeCost);
  elements.manualUpgradeButton.disabled = state.packages < state.manualUpgradeCost;
}

function renderEvents() {
  elements.eventsLog.innerHTML = state.events.map(e => `<article class="event-item"><strong>${e.title}</strong><span>${e.text}</span></article>`).join("");
}

function render() {
  renderStats();
  renderBuildings();
  renderSuperUpgrades();
  renderAchievements();
  renderEvents();
}

function gainPackages(amount) {
  const totalAmount = state.packageRemainder + amount;
  const whole = Math.floor(totalAmount);
  state.packageRemainder = totalAmount - whole;
  if (whole > 0) {
    state.packages += whole;
    state.totalPackages += whole;
    state.totalPackagesEver += whole;
  }
}

function handlePackageClick(e) {
  const amount = state.clickPower;
  gainPackages(amount);
  state.clickCount++;
  
  spawnClickText(e.clientX, e.clientY, amount);
  
  elements.packageButton.classList.add("is-pressed");
  setTimeout(() => elements.packageButton.classList.remove("is-pressed"), 120);
  
  checkAchievements();
  renderStats();
}

function purchaseBuilding(id) {
  const b = BUILDINGS.find(x => x.id === id);
  const cost = calculateBuildingCost(b);
  if (state.packages >= cost) {
    state.packages -= cost;
    state.buildingsOwned[id]++;
    addEvent("Расширение", `${b.name} запущен в работу.`);
    render();
    saveState();
  }
}

function purchaseSuperUpgrade(id) {
  const u = SUPER_UPGRADES.find(x => x.id === id);
  if (state.packages >= u.cost && !state.superUpgradesOwned[id]) {
    state.packages -= u.cost;
    state.superUpgradesOwned[id] = true;
    
    if (id === "code_operators") state.clickPower += 2;
    else state.productionBoost *= (u.tag.includes("12%") ? 1.12 : u.tag.includes("18%") ? 1.18 : u.tag.includes("25%") ? 1.25 : u.tag.includes("35%") ? 1.35 : 1.5);
    
    addEvent("Технология", `${u.name} внедрена в цех.`);
    render();
    saveState();
  }
}

function upgradeManualProduction() {
  if (state.packages >= state.manualUpgradeCost) {
    state.packages -= state.manualUpgradeCost;
    state.manualUpgradeLevel++;
    state.clickPower += 1;
    state.manualUpgradeCost = Math.floor(state.manualUpgradeCost * 2.25);
    render();
    saveState();
  }
}

function doRebranding() {
  // Формула Equity: корень кубический из общего кол-ва за все времена / 10^9
  const potentialEquity = Math.floor(Math.pow(state.totalPackagesEver / 1e9, 1/3) * 100);
  
  if (potentialEquity <= state.equity) {
    alert("Ваш текущий капитал выше возможного. Произведите больше пакетов перед ребрендингом!");
    return;
  }

  if (confirm(`Ребрендинг увеличит ваш капитал до ${potentialEquity}. Все здания и пакеты будут сброшены. Продолжить?`)) {
    const lifetime = state.totalPackagesEver;
    const equity = potentialEquity;
    
    Object.assign(state, defaultState());
    state.totalPackagesEver = lifetime;
    state.equity = equity;
    
    addEvent("Ребрендинг", "Компания сменила название и стала привлекательнее для инвестиций!");
    saveState();
    render();
  }
}

function resetGame() {
  if (confirm("Полный сброс всей истории империи?")) {
    Object.assign(state, defaultState());
    saveState();
    render();
  }
}

let lastTick = performance.now();
function gameLoop(now) {
  const delta = (now - lastTick) / 1000;
  lastTick = now;
  gainPackages(calculatePPS() * delta);
  renderStats();
  window.requestAnimationFrame(gameLoop);
}

elements.packageButton.onclick = handlePackageClick;
elements.manualUpgradeButton.onclick = upgradeManualProduction;
elements.rebrandButton.onclick = doRebranding;
elements.resetButton.onclick = resetGame;

render();
window.requestAnimationFrame(gameLoop);
setInterval(saveState, 5000);
