const MENU_URL = `data/menu.json?v=${Date.now()}`;
const ESTONIAN_WEEKDAYS = [
  "Esmaspäev",
  "Teisipäev",
  "Kolmapäev",
  "Neljapäev",
  "Reede",
  "Laupäev",
  "Pühapäev",
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

function getWeeks(menu) {
  if (Array.isArray(menu.weeks)) {
    return menu.weeks;
  }

  // Backwards compatibility for the previous one-week JSON format.
  if (Array.isArray(menu.days)) {
    return [{
      weekLabel: menu.weekLabel || "",
      startDate: null,
      endDate: null,
      days: menu.days,
    }];
  }

  return [];
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function findCurrentWeek(weeks, date) {
  const today = localDateKey(date);
  return weeks.find((week) => (
    week.startDate && week.endDate
    && week.startDate <= today
    && today <= week.endDate
  ));
}

function findUpcomingWeek(weeks, date) {
  const today = localDateKey(date);
  return weeks
    .filter((week) => week.startDate && week.startDate > today)
    .sort((first, second) => first.startDate.localeCompare(second.startDate))[0];
}

function getSelectedWeek(menu, date = new Date()) {
  const weeks = getWeeks(menu);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  if (isWeekend) {
    return findUpcomingWeek(weeks, date) || null;
  }

  return findCurrentWeek(weeks, date)
    || weeks.find((week) => !week.startDate && !week.endDate)
    || null;
}

function getMenuPreviewView(menu, date = new Date()) {
  const weeks = getWeeks(menu);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  if (isWeekend) {
    const upcomingWeek = findUpcomingWeek(weeks, date);
    if (!upcomingWeek) {
      return {
        heading: "Järgmise nädala menüü",
        days: [],
        emptyMessage: "Järgmise nädala menüü ei ole veel lisatud.",
      };
    }
    return {
      heading: "Järgmise nädala menüü",
      days: upcomingWeek.days.slice(0, 2),
      emptyMessage: "Järgmise nädala menüü ei ole veel lisatud.",
    };
  }

  const selectedWeek = getSelectedWeek(menu, date);
  if (!selectedWeek) {
    return {
      heading: "Tänane ja homne menüü",
      days: [],
      emptyMessage: "Selle nädala menüü ei ole veel lisatud.",
    };
  }

  const todayName = ESTONIAN_WEEKDAYS[date.getDay()];
  const todayIndex = selectedWeek.days.findIndex((day) => (
    String(day.day || "").trim().toLocaleLowerCase("et-EE")
    === todayName.toLocaleLowerCase("et-EE")
  ));

  if (todayIndex === -1) {
    return {
      heading: "Tänane ja homne menüü",
      days: [],
      emptyMessage: "Tänase päeva menüüd ei ole praegu lisatud.",
    };
  }

  return {
    heading: "Tänane ja homne menüü",
    days: selectedWeek.days.slice(todayIndex, todayIndex + 2),
    emptyMessage: "Tänase päeva menüüd ei ole praegu lisatud.",
  };
}

function renderMenuPreview(container, menu) {
  container.replaceChildren();
  const view = getMenuPreviewView(menu);
  const title = document.querySelector("#menu-preview-title");

  if (title) {
    title.textContent = view.heading;
  }

  if (menu.demo) {
    container.append(createDemoNotice());
  }

  if (view.days.length === 0) {
    container.append(createEmptyState(view.emptyMessage));
    return;
  }

  const grid = document.createElement("div");
  grid.className = view.days.length === 1
    ? "menu-preview-grid menu-preview-grid-single"
    : "menu-preview-grid";
  view.days.forEach((day) => grid.append(createDayCard(day, true)));
  container.append(grid);
}

function renderFullMenu(container, menu) {
  container.replaceChildren();
  const selectedWeek = getSelectedWeek(menu);
  const meta = document.querySelector("#menu-meta");

  if (meta) {
    meta.replaceChildren();
    const weekLabel = document.createElement("strong");
    weekLabel.textContent = selectedWeek?.weekLabel || menu.weekLabel || "Kooli nädalamenüü";
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

  const days = selectedWeek?.days || [];
  if (days.length === 0) {
    const isWeekend = [0, 6].includes(new Date().getDay());
    const message = isWeekend
      ? "Järgmise nädala menüü ei ole veel lisatud."
      : "Selle nädala menüü ei ole veel lisatud.";
    container.append(createEmptyState(message));
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
  const value = typeof meal === "string" ? meal : (meal?.name || "");
  const audienceMatch = value.match(/^([^:]{1,60}klass):\s*(.+)$/i);

  if (audienceMatch) {
    const audience = document.createElement("strong");
    audience.className = "meal-audience";
    audience.textContent = `${audienceMatch[1]}:`;
    text.append(audience, ` ${audienceMatch[2]}`);
  } else {
    text.textContent = value;
  }

  if (meal && typeof meal === "object" && meal.note) {
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
