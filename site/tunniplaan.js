const TIMETABLE_URL = `data/tunniplaan.json?v=${Date.now()}`;
const ESTONIAN_DAYS = [
  { number: 1, name: "Esmaspäev" },
  { number: 2, name: "Teisipäev" },
  { number: 3, name: "Kolmapäev" },
  { number: 4, name: "Neljapäev" },
  { number: 5, name: "Reede" },
];

const FILTER_CONFIG = {
  class: { collection: "classes", title: "Klassid", singular: "klass", placeholder: "Otsi klassi…" },
  teacher: { collection: "teachers", title: "Õpetajad", singular: "õpetaja", placeholder: "Otsi õpetajat…" },
  room: { collection: "rooms", title: "Ruumid", singular: "ruum", placeholder: "Otsi ruumi…" },
};

const state = {
  data: null,
  entityType: "class",
  query: "",
  selectedId: "",
  selectedDay: 1,
  view: "day",
};

document.addEventListener("DOMContentLoaded", () => {
  loadTimetable().catch((error) => renderTimetableError(error));
});

async function loadTimetable() {
  const response = await fetch(TIMETABLE_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Tunniplaani laadimine ebaõnnestus (${response.status}).`);
  }

  state.data = await response.json();
  initializeSelection();
  bindControls();
  renderTimetable();
}

function initializeSelection() {
  const params = new URLSearchParams(window.location.search);
  const requestedType = params.get("type");
  const requestedId = params.get("id");
  const requestedDay = Number(params.get("day"));

  state.selectedDay = ESTONIAN_DAYS.some((day) => day.number === requestedDay)
    ? requestedDay
    : getDefaultDay();
  state.view = params.get("view") === "week" ? "week" : "day";

  if (FILTER_CONFIG[requestedType]) {
    state.entityType = requestedType;
  }

  const entities = getEntities(state.entityType);
  const saved = readSavedSelection();
  const savedIsValid = saved
    && FILTER_CONFIG[saved.type]
    && getEntities(saved.type).some((entity) => entity.id === saved.id);

  if (requestedId && entities.some((entity) => entity.id === requestedId)) {
    state.selectedId = requestedId;
  } else if (!requestedType && savedIsValid) {
    state.entityType = saved.type;
    state.selectedId = saved.id;
    if (ESTONIAN_DAYS.some((day) => day.number === Number(saved.day))) {
      state.selectedDay = Number(saved.day);
    }
    state.view = saved.view === "week" ? "week" : "day";
  } else {
    state.selectedId = entities[0]?.id || "";
  }
}

function bindControls() {
  const search = document.querySelector("#timetable-search");
  const results = document.querySelector("#search-results");

  document.querySelectorAll("[data-entity-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.entityType;
      if (!FILTER_CONFIG[type]) return;
      state.entityType = type;
      state.query = "";
      state.selectedId = getEntities(type)[0]?.id || "";
      if (search) search.value = "";
      updateUrl();
      renderTimetable();
    });
  });

  search?.addEventListener("click", () => openSearchResults());
  search?.addEventListener("input", (event) => {
    state.query = event.target.value;
    openSearchResults();
  });

  search?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSearchResults();
      search.blur();
      return;
    }

    if (event.key === "Enter") {
      const firstResult = results?.querySelector("[data-search-entity-id]");
      if (firstResult) {
        event.preventDefault();
        selectEntity(firstResult.dataset.searchEntityId);
      }
    }
  });

  results?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-search-entity-id]");
    if (!button) return;
    selectEntity(button.dataset.searchEntityId);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-box") && !event.target.closest("[data-entity-type]")) {
      closeSearchResults();
    }
  });

  document.querySelector("#timetable-detail")?.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-selected-day]");
    if (dayButton) {
      state.selectedDay = Number(dayButton.dataset.selectedDay);
      state.view = "day";
      updateUrl();
      renderDetail();
      return;
    }

    const viewButton = event.target.closest("[data-toggle-view]");
    if (viewButton) {
      state.view = state.view === "day" ? "week" : "day";
      updateUrl();
      renderDetail();
      return;
    }

    const saveButton = event.target.closest("[data-save-selection]");
    if (saveButton) {
      saveSelection();
      saveButton.textContent = "Vaikevaade salvestatud";
      window.setTimeout(() => {
        if (saveButton.isConnected) saveButton.textContent = "Salvesta vaikevaateks";
      }, 1800);
      return;
    }

    if (event.target.closest("[data-print-timetable]")) {
      window.print();
    }
  });
}

function getEntities(type = state.entityType) {
  return state.data?.[FILTER_CONFIG[type]?.collection] || [];
}

function getSelectedEntity() {
  return getEntities().find((entity) => entity.id === state.selectedId) || null;
}

function renderTimetable() {
  renderTabs();
  renderSearchResults();
  renderDetail();
}

function renderTabs() {
  const config = FILTER_CONFIG[state.entityType];
  const search = document.querySelector("#timetable-search");

  if (search) search.placeholder = config.placeholder;

  document.querySelectorAll("[data-entity-type]").forEach((button) => {
    const active = button.dataset.entityType === state.entityType;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function renderSearchResults() {
  const results = document.querySelector("#search-results");
  if (!results) return;
  const entities = getEntities().filter((entity) => matchesQuery(entity.name, state.query));
  results.replaceChildren();

  if (entities.length === 0) {
    const empty = document.createElement("div");
    empty.className = "search-result-empty";
    empty.textContent = "Sobivaid vasteid ei leitud.";
    results.append(empty);
    return;
  }

  entities.forEach((entity) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `search-result${entity.id === state.selectedId ? " is-selected" : ""}`;
    button.dataset.searchEntityId = entity.id;
    button.innerHTML = `<span>${escapeHtml(entity.name)}</span><span aria-hidden="true">→</span>`;
    results.append(button);
  });
}

function openSearchResults() {
  const results = document.querySelector("#search-results");
  const search = document.querySelector("#timetable-search");
  if (!results || !search) return;
  renderSearchResults();
  results.hidden = false;
  search.setAttribute("aria-expanded", "true");
}

function closeSearchResults() {
  const results = document.querySelector("#search-results");
  const search = document.querySelector("#timetable-search");
  if (results) results.hidden = true;
  if (search) search.setAttribute("aria-expanded", "false");
}

function selectEntity(identifier) {
  if (!getEntities().some((entity) => entity.id === identifier)) return;
  state.selectedId = identifier;
  state.query = "";
  const search = document.querySelector("#timetable-search");
  if (search) search.value = "";
  closeSearchResults();
  updateUrl();
  renderTimetable();
}

function renderDetail() {
  const panel = document.querySelector("#timetable-detail");
  const entity = getSelectedEntity();
  if (!panel) return;

  panel.replaceChildren();
  if (!entity) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Vali nimekirjast klass, õpetaja või ruum.";
    panel.append(empty);
    return;
  }

  const config = FILTER_CONFIG[state.entityType];
  const header = document.createElement("div");
  header.className = "detail-header";

  const headingGroup = document.createElement("div");
  const kicker = document.createElement("p");
  kicker.className = "detail-kicker";
  kicker.textContent = config.singular;
  const title = document.createElement("h2");
  title.textContent = entity.name;
  const subtitle = document.createElement("p");
  subtitle.className = "detail-subtitle";
  subtitle.textContent = `${state.data.title}${state.data.schoolYear ? ` · ${state.data.schoolYear}` : ""}`;
  headingGroup.append(kicker, title, subtitle);

  const actions = document.createElement("div");
  actions.className = "detail-actions";
  const saveButton = createActionButton("Salvesta vaikevaateks", "button-quiet");
  saveButton.dataset.saveSelection = "true";
  const viewButton = createActionButton(
    state.view === "day" ? "Nädalavaade" : "Päevavaade",
    "button-quiet",
  );
  viewButton.dataset.toggleView = "true";
  const printButton = createActionButton("Prindi", "button-primary");
  printButton.dataset.printTimetable = "true";
  actions.append(saveButton, viewButton, printButton);
  header.append(headingGroup, actions);
  panel.append(header);

  const selectedLessons = state.data.lessons.filter((lesson) => (
    Array.isArray(lesson[`${state.entityType}Ids`])
    && lesson[`${state.entityType}Ids`].includes(entity.id)
  ));

  const note = document.createElement("p");
  note.className = "timetable-note";
  note.textContent = `${selectedLessons.length} tunnikirjet · aktiivne tund on märgitud rohelisega.`;
  panel.append(note);

  if (state.view === "day") {
    panel.append(createDayTabs(), createDaySchedule(selectedLessons));
  } else {
    panel.append(createWeekGrid(selectedLessons));
  }
  document.title = `${entity.name} · Tunniplaan | Rakvere Eragümnaasium`;
}

function createActionButton(label, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `button ${className} timetable-button`;
  button.textContent = label;
  return button;
}

function createDayTabs() {
  const tabs = document.createElement("div");
  tabs.className = "day-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Tunniplaani päeva valik");

  ESTONIAN_DAYS.forEach((day) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `day-tab${day.number === state.selectedDay ? " is-active" : ""}`;
    button.dataset.selectedDay = day.number;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(day.number === state.selectedDay));
    button.textContent = day.name;
    tabs.append(button);
  });

  return tabs;
}

function createDaySchedule(lessons) {
  const schedule = document.createElement("div");
  schedule.className = "day-schedule";
  schedule.setAttribute("role", "table");

  getPeriodNumbers().forEach((periodNumber) => {
    const row = document.createElement("div");
    row.className = "day-schedule-row";

    const period = findPeriod(state.selectedDay, periodNumber);
    const label = document.createElement("div");
    label.className = "day-period-label";
    const periodNumberLabel = document.createElement("strong");
    periodNumberLabel.textContent = `${periodNumber}. tund`;
    const periodTime = document.createElement("span");
    periodTime.textContent = `${period?.start || ""}–${period?.end || ""}`;
    label.append(periodNumberLabel, periodTime);

    const content = document.createElement("div");
    content.className = "day-period-content";
    const matching = lessons.flatMap((lesson) => lesson.slots
      .filter((slot) => slot.day === state.selectedDay && slot.period === periodNumber)
      .map((slot) => ({ lesson, slot })));

    if (matching.length === 0) {
      const empty = document.createElement("span");
      empty.className = "empty-period";
      empty.textContent = "Vaba tund";
      content.append(empty);
    } else {
      matching.forEach(({ lesson, slot }) => content.append(createLessonBlock(lesson, slot)));
    }

    row.append(label, content);
    schedule.append(row);
  });

  return schedule;
}

function createWeekGrid(lessons) {
  const wrapper = document.createElement("div");
  wrapper.className = "week-scroll";
  const grid = document.createElement("div");
  grid.className = "week-grid";
  grid.setAttribute("role", "table");

  const corner = document.createElement("div");
  corner.className = "week-corner";
  corner.textContent = "Tund";
  grid.append(corner);

  ESTONIAN_DAYS.forEach((day) => {
    const header = document.createElement("div");
    header.className = "week-day-header";
    header.textContent = day.name;
    grid.append(header);
  });

  getPeriodNumbers().forEach((periodNumber) => {
    const firstPeriod = findPeriod(1, periodNumber) || findPeriod(2, periodNumber);
    const label = document.createElement("div");
    label.className = "period-label";
    label.innerHTML = `<strong>${periodNumber}.</strong><span>${firstPeriod?.start || ""}<br>${firstPeriod?.end || ""}</span>`;
    grid.append(label);

    ESTONIAN_DAYS.forEach((day) => {
      const cell = document.createElement("div");
      cell.className = "timetable-cell";
      const matching = lessons.flatMap((lesson) => lesson.slots
        .filter((slot) => slot.day === day.number && slot.period === periodNumber)
        .map((slot) => ({ lesson, slot })));

      if (matching.length === 0) {
        const empty = document.createElement("span");
        empty.className = "empty-slot";
        empty.textContent = "–";
        cell.append(empty);
      } else {
        matching.forEach(({ lesson, slot }) => cell.append(createLessonBlock(lesson, slot)));
      }
      grid.append(cell);
    });
  });

  wrapper.append(grid);
  return wrapper;
}

function getPeriodNumbers() {
  return [...new Set((state.data.periods || []).map((period) => period.period))].sort((a, b) => a - b);
}

function findPeriod(day, periodNumber) {
  return state.data.periods.find((period) => period.day === day && period.period === periodNumber);
}

function getDefaultDay() {
  const today = new Date().getDay();
  return ESTONIAN_DAYS.some((day) => day.number === today) ? today : 1;
}

function createLessonBlock(lesson, slot) {
  const block = document.createElement("article");
  const active = isActiveSlot(slot);
  block.className = `lesson-block${active ? " is-active" : ""}`;

  const subject = document.createElement("strong");
  subject.textContent = lesson.subjects.join(", ") || "Tund";
  block.append(subject);

  const time = document.createElement("small");
  time.textContent = `${slot.start}–${slot.end}`;
  block.append(time);

  const detail = document.createElement("span");
  const parts = [];
  if (state.entityType !== "teacher" && lesson.teachers.length) parts.push(lesson.teachers.join(", "));
  if (state.entityType !== "class" && lesson.classes.length) parts.push(lesson.classes.join(", "));
  if (slot.room) parts.push(slot.room);
  detail.textContent = parts.join(" · ");
  if (detail.textContent) block.append(detail);

  return block;
}

function isActiveSlot(slot) {
  const today = new Date();
  if (today.getDay() !== slot.day) return false;
  const currentMinutes = today.getHours() * 60 + today.getMinutes();
  const start = timeToMinutes(slot.start);
  const end = timeToMinutes(slot.end);
  return start !== null && end !== null && currentMinutes >= start && currentMinutes < end;
}

function timeToMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function matchesQuery(value, query) {
  if (!query.trim()) return true;
  return normalize(value).includes(normalize(query));
}

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("et-EE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function readSavedSelection() {
  try {
    return JSON.parse(localStorage.getItem("timetable-default-selection") || "null");
  } catch {
    return null;
  }
}

function saveSelection() {
  localStorage.setItem("timetable-default-selection", JSON.stringify({
    type: state.entityType,
    id: state.selectedId,
    day: state.selectedDay,
    view: state.view,
  }));
}

function updateUrl() {
  const params = new URLSearchParams(window.location.search);
  params.set("type", state.entityType);
  params.set("id", state.selectedId);
  params.set("day", String(state.selectedDay));
  if (state.view === "week") {
    params.set("view", "week");
  } else {
    params.delete("view");
  }
  window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTimetableError(error) {
  const results = document.querySelector("#search-results");
  const detail = document.querySelector("#timetable-detail");
  const message = "Tunniplaani laadimine ebaõnnestus. Kontrolli, kas tunniplaani JSON on GitHub Actionsiga loodud.";
  [results, detail].forEach((target) => {
    if (!target) return;
    target.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = message;
    target.append(empty);
  });
  console.error(error);
}
