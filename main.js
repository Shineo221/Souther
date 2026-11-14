
const {
  app,
  BrowserWindow,
  session,
  ipcMain,
  dialog,
  safeStorage
} = require("electron");

const path = require("node:path");
const fs = require("node:fs");
const fetch = require("cross-fetch");
const { autoUpdater } = require("electron-updater");

function parseCsv(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"' && quoted && content[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && content[i + 1] === "\n") i++;
      row.push(cell);

      if (row.some(value => value.trim())) {
        rows.push(row);
      }

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);

  if (row.some(value => value.trim())) {
    rows.push(row);
  }

  return rows;
}

// IMPORT ZAKŁADEK
ipcMain.handle("souther:import-bookmarks", async () => {
  const result = await dialog.showOpenDialog({
    title: "Wybierz plik zakładek",
    properties: ["openFile"],
    filters: [
      { name: "Pliki zakładek", extensions: ["html", "htm"] }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  const file = result.filePaths[0];
  const stats = fs.statSync(file);

  if (stats.size > 15 * 1024 * 1024) {
    throw new Error("Plik zakładek jest za duży.");
  }

  return {
    canceled: false,
    html: fs.readFileSync(file, "utf8")
  };
});

// IMPORT HASEŁ
ipcMain.handle("souther:import-passwords", async () => {
  const result = await dialog.showOpenDialog({
    title: "Wybierz eksport haseł",
    properties: ["openFile"],
    filters: [
      { name: "Pliki CSV", extensions: ["csv"] }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Szyfrowanie systemowe jest niedostępne.");
  }

  const content = fs.readFileSync(result.filePaths[0], "utf8");
  const rows = parseCsv(content);

  if (rows.length < 2) {
    throw new Error("Plik CSV jest pusty lub nieprawidłowy.");
  }

  const headers = rows[0].map(value =>
    value.trim().toLowerCase().replace(/^\uFEFF/, "")
  );

  const findColumn = names =>
    headers.findIndex(header => names.includes(header));

  const urlIndex = findColumn([
    "url", "website", "login_uri", "origin"
  ]);

  const usernameIndex = findColumn([
    "username", "user name", "login_username", "login", "email"
  ]);

  const passwordIndex = findColumn([
    "password", "login_password"
  ]);

  if (urlIndex < 0 || usernameIndex < 0 || passwordIndex < 0) {
    throw new Error(
      "Nie rozpoznano kolumn CSV. Potrzebne są adres strony, login i hasło."
    );
  }

  const imported = [];

  for (const row of rows.slice(1)) {
    const url = (row[urlIndex] || "").trim();
    const username = (row[usernameIndex] || "").trim();
    const password = row[passwordIndex] || "";

    if (!url || !username || !password) continue;

    try {
      const parsed = new URL(url);

      if (!["http:", "https:"].includes(parsed.protocol)) continue;

      imported.push({
        url: parsed.origin,
        username,
        password
      });
    } catch {
      continue;
    }
  }

  if (!imported.length) {
    throw new Error("Nie znaleziono poprawnych danych logowania.");
  }

  const vaultPath = path.join(
    app.getPath("userData"),
    "password-vault.enc"
  );

  let existing = [];

  if (fs.existsSync(vaultPath)) {
    try {
      const encrypted = fs.readFileSync(vaultPath);
      existing = JSON.parse(safeStorage.decryptString(encrypted));

      if (!Array.isArray(existing)) existing = [];
    } catch {
      throw new Error("Nie udało się odczytać istniejącego sejfu haseł.");
    }
  }

  let added = 0;

  for (const item of imported) {
    const duplicate = existing.some(saved =>
      saved.url === item.url &&
      saved.username === item.username &&
      saved.password === item.password
    );

    if (!duplicate) {
      existing.push(item);
      added++;
    }
  }

  const encrypted = safeStorage.encryptString(
    JSON.stringify(existing)
  );

  fs.writeFileSync(vaultPath, encrypted);

  return {
    canceled: false,
    count: added
  };
});

// ADBLOCK
async function setupAdBlock() {
  try {
    const { ElectronBlocker, NetworkFilter } =
      await import("@ghostery/adblocker-electron");

    const blocker =
      await ElectronBlocker.fromPrebuiltAdsOnly(fetch);

    blocker.update({
      newNetworkFilters: [
        NetworkFilter.parse("@@||googlevideo.com^"),
        NetworkFilter.parse("@@||ytimg.com^"),
        NetworkFilter.parse("@@||youtubei.googleapis.com^")
      ]
    });

    const browserSession = session.fromPartition("persist:souther");
    // blocker.enableBlockingInSession(browserSession);

    console.log("SOUther AdBlock: ON");
  } catch (error) {
    console.error("Nie udało się uruchomić AdBlocka:", error);
  }
}

// OKNO PRZEGLĄDARKI
function createWindow() {
  const win = new BrowserWindow({
    autoHideMenuBar: true,
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#09090d",
    title: "SOUther",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true
    }
  });

  win.loadFile("index.html");
  win.removeMenu();
}

// AKTUALIZACJE SOUther
function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("SOUther: sprawdzanie aktualizacji...");
  });

  autoUpdater.on("update-available", async (info) => {
    const result = await dialog.showMessageBox({
      type: "info",
      title: "Aktualizacja SOUther",
      message: `Dostępna jest nowa wersja SOUther: ${info.version}`,
      detail: "Czy chcesz pobrać aktualizację?",
      buttons: ["Pobierz", "Później"],
      defaultId: 0,
      cancelId: 1
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on("update-not-available", () => {
    console.log("SOUther: masz najnowszą wersję.");
  });

  autoUpdater.on("update-downloaded", async () => {
    const result = await dialog.showMessageBox({
      type: "info",
      title: "Aktualizacja gotowa",
      message: "Aktualizacja SOUther została pobrana.",
      detail: "Uruchom ponownie przeglądarkę, aby ją zainstalować.",
      buttons: ["Uruchom ponownie", "Później"],
      defaultId: 0
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", (error) => {
    console.error("Błąd aktualizacji SOUther:", error);
  });

  autoUpdater.checkForUpdates();
}

// START APLIKACJI
app.whenReady().then(async () => {
  await setupAdBlock();
  createWindow();

  if (app.isPackaged) {
    setupAutoUpdater();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
