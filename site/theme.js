(() => {
  const storageKey = "school-theme";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let preference;
  let button;
  try { preference = localStorage.getItem(storageKey); } catch { /* Storage is optional. */ }

  function applyTheme() {
    const dark = preference === "dark" || (preference !== "light" && systemTheme.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#101b16" : "#008c3a");
    if (button) {
      button.setAttribute("aria-pressed", String(dark));
      button.title = dark ? "Lülita päevateemale" : "Lülita ööteemale";
      button.innerHTML = dark
        ? '<span aria-hidden="true">☀</span> Päev'
        : '<span aria-hidden="true">☾</span> Öö';
    }
  }

  // Apply before the stylesheet renders to avoid a flash of the wrong theme.
  applyTheme();
  systemTheme.addEventListener("change", applyTheme);
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey || event.key === null) {
      preference = event.newValue;
      applyTheme();
    }
  });
  document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".topbar");
    if (!header) return;
    button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.setAttribute("aria-label", "Ööteema");
    button.addEventListener("click", () => {
      preference = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem(storageKey, preference); } catch { /* Keep the choice for this page. */ }
      applyTheme();
    });
    header.append(button);
    applyTheme();
  });
})();
