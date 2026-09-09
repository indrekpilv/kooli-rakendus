const MENU_URL = `data/menu.json?v=${Date.now()}`;
const ESTONIAN_WEEKDAYS = [
  "Pühapäev",
  "Esmaspäev",
  "Teisipäev",
  "Kolmapäev",
  "Neljapäev",
  "Reede",
  "Laupäev",
];

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector("[data-menu-preview]")) {
    loadMenu().catch((error) => renderError(error, "menu-preview"));
  }

  if (document.querySelector("#menu-list")) {
    loadMenu().catch((error) => renderError(error, "menu-list"));
  }
});

async function loadMenu() {
  const response = await fetch(MENU_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Menüüfaili laadimine ebaõnnestus (${response.status}).`);
  }

  const menu = await response.json();
  const preview = document.querySelector("[data-menu-preview]");
  const menuList = document.querySelector("#menu-list");

  if (preview) {
    renderMenuPreview(preview, menu);
  }

  if (menuList) {
    renderFullMenu(menuList, menu);
  }
}

function renderMenuPreview(container, menu) {
  container.replaceChildren();

  if (menu.demo) {
    container.append(createDemoNotice());
  }

  const days = getTodayAndNextMenuDays(menu.days);
  if (days.length === 0) {
    container.append(createEmptyState("Tänase päeva menüüd ei ole praegu lisatud."));
    return;
  }

  const grid = document.createElement("div");
  grid.className = days.length === 1
    ? "menu-preview-grid menu-preview-grid-single"
    : "menu-preview-grid";
  days.forEach((day) => grid.append(createDayCard(day, true)));
  container.append(grid);
}

function getTodayAndNextMenuDays(days) {
  if (!Array.isArray(days) || days.length === 0) return [];

  const todayName = ESTONIAN_WEEKDAYS[new Date().getDay()];
  const todayIndex = days.findIndex((day) => (
    String(day.day || "").trim().toLocaleLowerCase("et-EE")
    === todayName.toLocaleLowerCase("et-EE")
  ));

  if (todayIndex === -1) return [];
  return days.slice(todayIndex, todayIndex + 2);
}

function renderFullMenu(container, menu) {
  container.replaceChildren();

  const meta = document.querySelector("#menu-meta");
  if (meta) {
    meta.replaceChildren();
    const weekLabel = document.createElement("strong");
    weekLabel.textContent = menu.weekLabel || "Kooli nädalamenüü";
    meta.append(weekLabel);
    if (menu.updated) {
      const updated = document.createElement("span");
      updated.textContent = menu.updated;
      meta.append(updated);
    }
  }

  if (menu.demo) {
    container.append(createDemoNotice());
  }

  const days = Array.isArray(menu.days) ? menu.days : [];
  if (days.length === 0) {
    container.append(createEmptyState("Menüüandmed ei ole veel lisatud."));
    return;
  }

  days.forEach((day) => container.append(createDayCard(day, false)));
}

function createDayCard(day, compact) {
  const card = document.createElement("article");
  card.className = compact ? "day-card day-card-compact" : "day-card";

  const header = document.createElement("div");
  header.className = "day-header";

  const dayName = document.createElement("h3");
  dayName.textContent = day.day || "Päev";
  header.append(dayName);

  if (day.date) {
    const date = document.createElement("span");
    date.className = "day-date";
    date.textContent = day.date;
    header.append(date);
  }

  const content = document.createElement("div");
  content.className = "day-content";

  const mealSections = Array.isArray(day.meals) ? day.meals : [];
  if (mealSections.length > 0) {
    mealSections.forEach((meal) => content.append(createMealSection(meal)));
  } else {
    content.append(createMealList(day.items));
  }

  card.append(header, content);
  return card;
}

function createMealSection(meal) {
  const section = document.createElement("section");
  section.className = "meal-section";

  const heading = document.createElement("h4");
  heading.className = "meal-heading";
  heading.textContent = meal.name || "Toidukord";
  section.append(heading, createMealList(meal.items));
  return section;
}

function createMealList(meals) {
  const items = document.createElement("ul");
  items.className = "meal-list";
  const mealItems = Array.isArray(meals) ? meals : [];

  mealItems.forEach((meal) => items.append(createMealItem(meal)));

  if (mealItems.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Menüü puudub";
    empty.className = "meal-empty";
    items.append(empty);
  }

  return items;
}

function createMealItem(meal) {
  const item = document.createElement("li");
  const marker = document.createElement("span");
  marker.className = "meal-marker";
  marker.setAttribute("aria-hidden", "true");
  item.append(marker);

  const text = document.createElement("span");
  const value = typeof meal === "string" ? meal : (meal.name || "");
  const audienceMatch = value.match(/^([^:]{1,60}klass):\s*(.+)$/i);

  if (audienceMatch) {
    const audience = document.createElement("strong");
    audience.className = "meal-audience";
    audience.textContent = `${audienceMatch[1]}:`;
    text.append(audience, ` ${audienceMatch[2]}`);
  } else {
    text.textContent = value;
  }

  if (typeof meal === "object" && meal.note) {
    const note = document.createElement("small");
    note.textContent = meal.note;
    text.append(note);
  }

  item.append(text);
  return item;
}

function createDemoNotice() {
  const notice = document.createElement("div");
  notice.className = "demo-notice";
  notice.textContent = "Praegu kuvatakse näidismenüüd. Kooli menüü saab lisada failis site/data/menu.md.";
  return notice;
}

function createEmptyState(message) {
  const state = document.createElement("div");
  state.className = "empty-state";
  state.textContent = message;
  return state;
}

function renderError(error, targetId) {
  const target = targetId === "menu-preview"
    ? document.querySelector("[data-menu-preview]")
    : document.querySelector(`#${targetId}`);

  if (!target) return;
  target.replaceChildren(createEmptyState("Menüüandmete laadimine ebaõnnestus. Kontrolli site/data/menu.md faili."));
  console.error(error);
}
