(() => {
  // An iframe supplies a real viewport, including CSS media queries and vw units.
  if (window.self !== window.top || new URLSearchParams(window.location.search).has("weekWindow")) return;

  const header = document.querySelector(".topbar");
  if (!header) return;
  const modes = [
    { id: "mobile", label: "Mobiil", width: 390, icon: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>' },
    { id: "tablet", label: "Tahvel", width: 820, icon: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/>' },
    { id: "desktop", label: "Arvuti", width: null, icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4M8 21h8"/>' },
  ];
  const toolbar = document.createElement("div");
  toolbar.className = "device-preview-controls";
  toolbar.setAttribute("role", "group");
  toolbar.setAttribute("aria-label", "Ekraanilaiuse eelvaade");
  let frame;
  let preview;

  function selectMode(mode) {
    try { sessionStorage.setItem("device-preview-mode", mode.id); } catch { /* Storage may be disabled. */ }
    toolbar.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.previewMode === mode.id));
    });
    if (!mode.width) {
      const currentUrl = frame?.contentWindow.location.href;
      preview?.remove();
      preview = null;
      frame = null;
      document.body.classList.remove("device-preview-active");
      if (currentUrl && currentUrl !== window.location.href) window.location.assign(currentUrl);
      return;
    }
    if (!frame) {
      preview = document.createElement("section");
      preview.className = "device-preview-stage";
      preview.setAttribute("aria-label", "Lehe eelvaade");
      frame = document.createElement("iframe");
      frame.src = window.location.href;
      preview.append(frame);
      document.body.append(preview);
    }
    frame.title = `${mode.label}vaade (${mode.width} pikslit)`;
    frame.style.width = `${mode.width}px`;
    document.body.classList.add("device-preview-active");
  }

  modes.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.previewMode = mode.id;
    button.title = mode.width ? `${mode.label}vaade · ${mode.width} px` : "Arvutivaade · brauseri laius";
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${mode.icon}</svg><span>${mode.label}</span>`;
    button.addEventListener("click", () => selectMode(mode));
    toolbar.append(button);
  });
  header.append(toolbar);
  let savedMode;
  try { savedMode = sessionStorage.getItem("device-preview-mode"); } catch { /* Use the natural viewport. */ }
  selectMode(modes.find((mode) => mode.id === savedMode) || modes[2]);
})();
