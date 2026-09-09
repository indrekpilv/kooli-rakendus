const MENU_URL = `data/menu.json?v=${Date.now()}`;

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

  const days = Array.isArray(menu.days) ? menu.days.slice(0, 2) : [];
  if (days.length === 0) {
    container.append(createEmptyState("Menüüandmed ei ole veel lisatud."));
    return;
  }

  const grid = document.createElement("div");
  grid.className = "menu-preview-grid";
  days.forEach((day) => grid.append(createDayCard(day, true)));
  container.append(grid);
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

  const items = document.createElement("ul");
  items.className = "meal-list";
  const meals = Array.isArray(day.items) ? day.items : [];

  meals.forEach((meal) => {
    const item = document.createElement("li");
    const marker = document.createElement("span");
    marker.className = "meal-marker";
    marker.setAttribute("aria-hidden", "true");
    item.append(marker);

    const text = document.createElement("span");
    if (typeof meal === "string") {
      text.textContent = meal;
    } else {
      text.textContent = meal.name || "";
      if (meal.note) {
        const note = document.createElement("small");
        note.textContent = meal.note;
        text.append(note);
      }
    }
    item.append(text);
    items.append(item);
  });

  if (meals.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Menüü puudub";
    empty.className = "meal-empty";
    items.append(empty);
  }

  card.append(header, items);
  return card;
}

function createDemoNotice() {
  const notice = document.createElement("div");
  notice.className = "demo-notice";
  notice.textContent = "Praegu kuvatakse näidismenüüd. Kooli menüü saab lisada failis site/data/menu.json.";
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
  target.replaceChildren(createEmptyState("Menüüandmete laadimine ebaõnnestus. Kontrolli data/menu.json faili."));
  console.error(error);
}
