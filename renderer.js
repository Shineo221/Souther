
const $ = (id) => document.getElementById(id);

const address = $("address");
const startPage = $("startPage");
const settingsPage = $("settingsPage");
const browserViews = $("browserViews");
const tabList = $("tabList");
const sidebarApps = $("sidebarApps");
const managedApps = $("managedApps");
const appSelect = $("appSelect");

const appCatalog = [
  { id: "messenger", name: "Messenger", url: "https://www.messenger.com" },
  { id: "discord", name: "Discord", url: "https://discord.com/app" },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com" },
  { id: "spotify", name: "Spotify", url: "https://open.spotify.com" },
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com" },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com" },
  { id: "twitch", name: "Twitch", url: "https://www.twitch.tv" },
  { id: "reddit", name: "Reddit", url: "https://www.reddit.com" },
  { id: "x", name: "X", url: "https://x.com" },
  { id: "whatsapp", name: "WhatsApp", url: "https://web.whatsapp.com" },
  { id: "netflix", name: "Netflix", url: "https://www.netflix.com" },
  { id: "instagram", name: "Instagram", url: "https://www.instagram.com" },
  { id: "steam", name: "Steam", url: "https://store.steampowered.com" }
];

const defaultApps = [
  "messenger", "discord", "youtube",
  "spotify", "chatgpt", "gemini"
];

let apps = loadApps();
let tabs = [];
let activeTabId = null;
let nextTabId = 1;

function loadApps() {
  try {
    const saved = JSON.parse(localStorage.getItem("southerApps"));

    if (Array.isArray(saved)) {
      return saved.filter(app =>
        app &&
        typeof app.id === "string" &&
        typeof app.name === "string" &&
        typeof app.url === "string" &&
        isValidUrl(app.url)
      );
    }
  } catch (error) {
    console.error("Błąd wczytywania aplikacji:", error);
  }

  return defaultApps
    .map(id => appCatalog.find(app => app.id === id))
    .filter(Boolean);
}

function saveApps() {
  localStorage.setItem("southerApps", JSON.stringify(apps));
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeInput(value) {
  const text = value.trim();
  if (!text) return null;

  if (/^https?:\/\//i.test(text)) {
    return isValidUrl(text) ? text : null;
  }

  if (
    /^[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(text) &&
    !text.includes(" ")
  ) {
    return "https://" + text;
  }

  return "https://www.google.com/search?q=" +
    encodeURIComponent(text);
}

function getActiveTab() {
  return tabs.find(tab => tab.id === activeTabId);
}

/* IKONY */

function createGeometricIcon(type) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");

  svg.setAttribute("viewBox", "0 0 26 26");
  svg.setAttribute("class", "custom-shape-icon");

  function add(tag, attrs) {
    const element = document.createElementNS(ns, tag);

    Object.entries(attrs).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });

    svg.appendChild(element);
  }

  const stroke = {
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  };

  switch (type) {
    case "dots":
      [7, 13, 19].forEach(x => {
        [7, 13, 19].forEach(y => {
          add("circle", {
            cx: x, cy: y, r: 1.7,
            fill: "currentColor"
          });
        });
      });
      break;

    case "lines":
      add("path", {
        ...stroke,
        d: "M5 7 H21 M5 13 H17 M5 19 H13"
      });
      break;

    case "triangle":
      add("polygon", {
        ...stroke,
        points: "13,4 23,21 3,21"
      });
      break;

    case "circle":
      add("circle", {
        ...stroke,
        cx: 13, cy: 13, r: 8
      });
      break;

    case "diamond":
      add("polygon", {
        ...stroke,
        points: "13,3 23,13 13,23 3,13"
      });
      break;

    case "orbit":
      add("ellipse", {
        ...stroke,
        cx: 13, cy: 13, rx: 10, ry: 4,
        transform: "rotate(-35 13 13)"
      });
      add("circle", {
        cx: 13, cy: 13, r: 2.5,
        fill: "currentColor"
      });
      break;

    case "spark":
      add("path", {
        ...stroke,
        d: "M13 3 L15.5 10.5 L23 13 L15.5 15.5 L13 23 L10.5 15.5 L3 13 L10.5 10.5 Z"
      });
      break;

    case "grid":
      [[5, 5], [15, 5], [5, 15], [15, 15]].forEach(([x, y]) => {
        add("rect", {
          ...stroke,
          x, y, width: 6, height: 6, rx: 1.5
        });
      });
      break;

    case "wave":
      add("path", {
        ...stroke,
        d: "M3 15 C6 5 9 5 13 13 S20 21 23 11"
      });
      break;

    case "hexagon":
      add("polygon", {
        ...stroke,
        points: "8,3 18,3 24,13 18,23 8,23 2,13"
      });
      break;

    default:
      add("circle", {
        ...stroke,
        cx: 13, cy: 13, r: 8
      });
  }

  return svg;
}

function createAppIcon(app) {
  if (app.icon?.startsWith("shape:")) {
    return createGeometricIcon(app.icon.slice(6));
  }

  const img = document.createElement("img");

  if (app.icon) {
    img.src = app.icon;
  } else {
    const hostname = new URL(app.url).hostname;
    img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;
  }

  img.alt = app.name;
  img.draggable = false;

  img.addEventListener("error", () => {
    img.replaceWith(createGeometricIcon("orbit"));
  }, { once: true });

  return img;
}

/* PASEK BOCZNY */

function renderSidebar() {
  sidebarApps.innerHTML = "";

  apps.forEach(app => {
    const button = document.createElement("button");
    button.className = "side-app";
    button.title = app.name;
    button.appendChild(createAppIcon(app));

    button.addEventListener("click", () => {
      navigate(app.url);
    });

    sidebarApps.appendChild(button);
  });

  renderAppManager();
  renderAppOptions();
}

/* ZARZĄDZANIE APLIKACJAMI */

function renderAppManager() {
  managedApps.innerHTML = "";

  apps.forEach((app, index) => {
    const row = document.createElement("div");
    row.className = "managed-app";
    row.draggable = true;

    const icon = document.createElement("div");
    icon.className = "managed-icon";
    icon.appendChild(createAppIcon(app));

    const name = document.createElement("span");
    name.className = "managed-name";
    name.textContent = app.name;

    const drag = document.createElement("span");
    drag.className = "drag-handle";
    drag.textContent = "⠿";
    drag.title = "Przeciągnij, aby zmienić kolejność";

    const remove = document.createElement("button");
    remove.className = "remove-app";
    remove.textContent = "Usuń";

    remove.addEventListener("click", () => {
      apps = apps.filter(item => item.id !== app.id);
      saveApps();
      renderSidebar();
    });

    row.append(icon, name, drag, remove);

    row.addEventListener("dragstart", event => {
      event.dataTransfer.setData("text/plain", String(index));
      event.dataTransfer.effectAllowed = "move";
      row.classList.add("dragging");
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      document.querySelectorAll(".managed-app").forEach(item => {
        item.classList.remove("drag-over");
      });
    });

    row.addEventListener("dragover", event => {
      event.preventDefault();
      row.classList.add("drag-over");
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
    });

    row.addEventListener("drop", event => {
      event.preventDefault();
      row.classList.remove("drag-over");

      const from = Number(event.dataTransfer.getData("text/plain"));
      if (!Number.isInteger(from) || from < 0 || from >= apps.length) return;
      if (from === index) return;

      const moved = apps.splice(from, 1)[0];
      apps.splice(index, 0, moved);

      saveApps();
      renderSidebar();
    });

    managedApps.appendChild(row);
  });

  if (apps.length === 0) {
    managedApps.textContent = "Nie masz żadnych aplikacji na pasku.";
  }
}

function renderAppOptions() {
  appSelect.innerHTML = "";

  const available = appCatalog.filter(item =>
    !apps.some(app => app.id === item.id)
  );

  const addButton = $("addAppButton");

  if (available.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Wszystkie aplikacje zostały dodane";
    appSelect.appendChild(option);
    addButton.disabled = true;
    return;
  }

  addButton.disabled = false;

  available.forEach(app => {
    const option = document.createElement("option");
    option.value = app.id;
    option.textContent = app.name;
    appSelect.appendChild(option);
  });
}

/* KARTY */

function renderTabs() {
  tabList.innerHTML = "";

  tabs.forEach(tab => {
    const button = document.createElement("button");
    button.className = "tab" +
      (tab.id === activeTabId ? " active" : "");
    button.dataset.tabId = tab.id;

    const label = document.createElement("span");
    label.className = "tab-label";
    label.textContent = tab.title;

    const close = document.createElement("span");
    close.className = "tab-x";
    close.textContent = "×";
    close.title = "Zamknij kartę";

    close.addEventListener("click", event => {
      event.stopPropagation();
      playUiSound("closeTab");
      closeTab(tab.id);
    });

    button.append(label, close);

    button.addEventListener("click", () => {
      if (activeTabId !== tab.id) playUiSound("switchTab");
      switchTab(tab.id);
    });

    tabList.appendChild(button);
  });
}

function updateTabButton(tab) {
  const button = tabList.querySelector(
    `[data-tab-id="${tab.id}"]`
  );

  if (!button) return;

  const label = button.querySelector(".tab-label");
  if (label) label.textContent = tab.title;
  button.title = tab.title;
}

function createTab(url = null) {
  const id = nextTabId++;

  const view = document.createElement("webview");
  view.setAttribute("partition", "persist:souther");
  view.setAttribute("allowpopups", "false");
  view.className = "browser-tab-view";
  view.style.display = "none";

  const tab = {
    id,
    title: "Nowa karta",
    url: null,
    view
  };

  tabs.push(tab);
  browserViews.appendChild(view);

  view.addEventListener("did-navigate", event => {
    tab.url = event.url;

    if (tab.id === activeTabId) {
      address.value = event.url;
    }
  });

  view.addEventListener("did-navigate-in-page", event => {
    tab.url = event.url;

    if (tab.id === activeTabId) {
      address.value = event.url;
    }
  });

  view.addEventListener("page-title-updated", event => {
    tab.title = event.title || "Nowa karta";
    updateTabButton(tab);

    if (tab.id === activeTabId) {
      document.title = `${tab.title} — SOUther`;
    }
  });

  view.addEventListener("did-fail-load", event => {
    if (event.errorCode !== -3 && event.isMainFrame) {
      console.error("Błąd ładowania strony:", event.errorDescription);

      if (tab.id === activeTabId) {
        address.value = "Nie udało się otworzyć strony";
      }
    }
  });

  switchTab(id);

  if (url) navigate(url);

  return tab;
}

function switchTab(id) {
  const tab = tabs.find(item => item.id === id);
  if (!tab) return;

  activeTabId = id;
  settingsPage.style.display = "none";

  tabs.forEach(item => {
    item.view.style.display =
      item.id === id && Boolean(item.url) ? "flex" : "none";
  });

  const hasPage = Boolean(tab.url);
  startPage.style.display = hasPage ? "none" : "grid";
  address.value = tab.url || "";

  document.title = tab.title === "Nowa karta"
    ? "SOUther"
    : `${tab.title} — SOUther`;

  renderTabs();
}

function navigate(value) {
  const url = normalizeInput(value);
  if (!url) return;

  let tab = getActiveTab();

  if (!tab) {
    tab = createTab();
  }

  settingsPage.style.display = "none";
  startPage.style.display = "none";

  tab.url = url;
  tab.title = "Ładowanie...";
  tab.view.style.display = "flex";
  address.value = url;

  updateTabButton(tab);
  tab.view.src = url;
}

function closeTab(id) {
  const index = tabs.findIndex(tab => tab.id === id);
  if (index === -1) return;

  const wasActive = activeTabId === id;

  tabs[index].view.remove();
  tabs.splice(index, 1);

  if (tabs.length === 0) {
    createTab();
    return;
  }

  if (wasActive) {
    const nextTab = tabs[Math.max(0, index - 1)];
    switchTab(nextTab.id);
  } else {
    renderTabs();
  }
}

function showHome() {
  const tab = getActiveTab();
  if (!tab) return;

  tab.view.style.display = "none";
  tab.url = null;
  tab.title = "Nowa karta";

  settingsPage.style.display = "none";
  startPage.style.display = "grid";
  address.value = "";

  renderTabs();
  document.title = "SOUther";
}

/* NAWIGACJA */

$("addressForm").addEventListener("submit", event => {
  event.preventDefault();
  navigate(address.value);
});

$("newTab").addEventListener("click", () => {
  playUiSound("newTab");
  createTab();
});

$("home").addEventListener("click", showHome);

$("back").addEventListener("click", () => {
  const tab = getActiveTab();
  if (tab?.view.canGoBack()) tab.view.goBack();
});

$("forward").addEventListener("click", () => {
  const tab = getActiveTab();
  if (tab?.view.canGoForward()) tab.view.goForward();
});

$("reload").addEventListener("click", () => {
  const tab = getActiveTab();
  if (tab?.view.getURL()) tab.view.reload();
});

/* USTAWIENIA */

$("settingsButton").addEventListener("click", () => {
  startPage.style.display = "none";
  tabs.forEach(tab => tab.view.style.display = "none");
  settingsPage.style.display = "block";
  address.value = "";
});

$("settingsBack").addEventListener("click", () => {
  settingsPage.style.display = "none";
  switchTab(activeTabId);
});

$("addAppButton").addEventListener("click", () => {
  const app = appCatalog.find(item => item.id === appSelect.value);

  if (!app || apps.some(item => item.id === app.id)) return;

  apps.push(app);
  saveApps();
  renderSidebar();
});

/* WŁASNE STRONY */

$("customAppForm").addEventListener("submit", async event => {
  event.preventDefault();

  const name = $("customAppName").value.trim();
  let url = $("customAppUrl").value.trim();
  const iconFile = $("customAppIcon").files[0];
  const iconPreset = $("customIconPreset").value;

  if (!name || !url) return;

  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  if (!isValidUrl(url)) {
    alert("Wpisz poprawny adres strony.");
    return;
  }

  let icon = null;

  try {
    if (iconFile) {
      if (iconFile.size > 300 * 1024) {
        alert("Ikona może mieć maksymalnie 300 KB.");
        return;
      }

      if (!["image/png", "image/jpeg", "image/webp"].includes(iconFile.type)) {
        alert("Wybierz obraz PNG, JPG lub WEBP.");
        return;
      }

      icon = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(iconFile);
      });
    } else if (iconPreset) {
      icon = iconPreset;
    }

    apps.push({
      id: "custom-" + Date.now(),
      name,
      url: new URL(url).href,
      icon
    });

    saveApps();
    renderSidebar();
    event.target.reset();
  } catch (error) {
    console.error(error);
    alert("Nie udało się dodać strony.");
  }
});

$("restoreApps").addEventListener("click", () => {
  apps = defaultApps
    .map(id => appCatalog.find(app => app.id === id))
    .filter(Boolean);

  saveApps();
  renderSidebar();
});

$("menu").addEventListener("click", () => {
  alert("SOUther 0.2.0\nWięcej funkcji wkrótce.");
});

/* MOTYWY */

const themeSelect = $("themeSelect");

const availableThemes = [
  "purple", "ocean", "forest", "rose", "amber"
];

function applyTheme(theme) {
  if (!availableThemes.includes(theme)) {
    theme = "purple";
  }

  document.documentElement.dataset.theme = theme;
  themeSelect.value = theme;
  localStorage.setItem("southerTheme", theme);
}

themeSelect.addEventListener("change", () => {
  applyTheme(themeSelect.value);
});

applyTheme(localStorage.getItem("southerTheme") || "purple");

/* DŹWIĘKI */

let uiAudio = null;

function playUiSound(type = "click") {
  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!uiAudio) {
      uiAudio = new AudioContextClass();
    }

    if (uiAudio.state === "suspended") {
      uiAudio.resume();
    }

    const sounds = {
      click: [850, 650, 0.045, 0.018],
      newTab: [520, 820, 0.095, 0.035],
      closeTab: [700, 350, 0.12, 0.035],
      switchTab: [680, 760, 0.05, 0.018],
      type: [950, 780, 0.025, 0.009],
      mouse: [780, 620, 0.035, 0.015]
    };

    const [start, end, duration, volume] =
      sounds[type] || sounds.click;

    const oscillator = uiAudio.createOscillator();
    const gain = uiAudio.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(start, uiAudio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      end,
      uiAudio.currentTime + duration
    );

    gain.gain.setValueAtTime(volume, uiAudio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      uiAudio.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(uiAudio.destination);

    oscillator.start();
    oscillator.stop(uiAudio.currentTime + duration);
  } catch (error) {
    console.warn("SOUther audio error:", error);
  }
}

document.addEventListener("click", event => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  if (target.closest(".tab-x")) {
    playUiSound("closeTab");
  } else if (target.closest("#newTab")) {
    playUiSound("newTab");
  } else if (target.closest(".tab")) {
    playUiSound("switchTab");
  } else if (
    target.closest("button, a, input, textarea, select")
  ) {
    playUiSound("mouse");
  }
});

document.addEventListener("keydown", event => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const isTyping =
    target.matches("input:not([type='password']), textarea") ||
    target.isContentEditable;

  if (
    isTyping &&
    event.key.length === 1 &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey
  ) {
    playUiSound("type");
  }
});

/* START */

renderSidebar();
createTab();

/* IMPORT DANYCH */

const importStatus = $("importStatus");
const importBrowserSelect = $("importBrowserSelect");
const importedBookmarks = $("importedBookmarks");

function updateImportHelp() {
  const browser = importBrowserSelect.value;

  const names = {
    chrome: "Google Chrome",
    edge: "Microsoft Edge",
    opera: "Opera / Opera GX",
    firefox: "Mozilla Firefox",
    brave: "Brave",
    vivaldi: "Vivaldi",
    other: "wybranej przeglądarce"
  };

  $("importHelp").textContent =
    `W ${names[browser]} wyeksportuj zakładki do HTML, ` +
    "a hasła do CSV. Następnie wybierz odpowiednie pliki.";
}

importBrowserSelect.addEventListener("change", updateImportHelp);

function getImportedBookmarks() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("southerBookmarks") || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function renderImportedBookmarks() {
  const bookmarks = getImportedBookmarks();
  importedBookmarks.innerHTML = "";

  if (!bookmarks.length) return;

  const heading = document.createElement("h4");
  heading.textContent = `Zaimportowane zakładki (${bookmarks.length})`;
  importedBookmarks.appendChild(heading);

  bookmarks.forEach(bookmark => {
    const button = document.createElement("button");
    button.className = "imported-bookmark";
    button.textContent = bookmark.name;
    button.title = bookmark.url;

    button.addEventListener("click", () => {
      settingsPage.style.display = "none";
      navigate(bookmark.url);
    });

    importedBookmarks.appendChild(button);
  });
}

$("importBookmarksButton").addEventListener("click", async () => {
  try {
    importStatus.textContent = "Wybierz plik zakładek...";

    const result = await window.souther.importBookmarks();

    if (result.canceled) {
      importStatus.textContent = "Import anulowany.";
      return;
    }

    const documentFromFile = new DOMParser().parseFromString(
      result.html,
      "text/html"
    );

    const found = Array.from(
      documentFromFile.querySelectorAll("a[href]")
    ).map(link => {
      try {
        const url = new URL(link.getAttribute("href"));

        if (!["http:", "https:"].includes(url.protocol)) return null;

        return {
          name: link.textContent.trim() || url.hostname,
          url: url.href
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    const existing = getImportedBookmarks();
    const known = new Set(existing.map(item => item.url));

    const fresh = found.filter(item => {
      if (known.has(item.url)) return false;
      known.add(item.url);
      return true;
    });

    localStorage.setItem(
      "southerBookmarks",
      JSON.stringify([...existing, ...fresh])
    );

    renderImportedBookmarks();

    importStatus.textContent =
      `Gotowe. Dodano ${fresh.length} nowych zakładek.`;
  } catch (error) {
    console.error(error);
    importStatus.textContent =
      error.message || "Nie udało się zaimportować zakładek.";
  }
});

$("importPasswordsButton").addEventListener("click", async () => {
  try {
    importStatus.textContent = "Wybierz plik CSV z hasłami...";

    const result = await window.souther.importPasswords();

    if (result.canceled) {
      importStatus.textContent = "Import anulowany.";
      return;
    }

    importStatus.textContent =
      `Gotowe. Zapisano ${result.count} nowych haseł w lokalnym sejfie.`;
  } catch (error) {
    console.error(error);
    importStatus.textContent =
      error.message || "Nie udało się zaimportować haseł.";
  }
});

updateImportHelp();
renderImportedBookmarks();