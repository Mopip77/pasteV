import path from "path";
import { app, ipcMain, globalShortcut } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { readClipboard } from "./utils/clipboard";
import { startReadingClipboardDaemon } from "./helpers/read-clipboard-daemon";
import { initSingletons } from "./components/singletons";

const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

(async () => {
  initSingletons();
  startReadingClipboardDaemon();

  await app.whenReady();

  const mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isProd) {
    await mainWindow.loadURL("app://./");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/`);
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("blur", () => {
    mainWindow.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
})();

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.on("message", async (event) => {
  event.reply("message", readClipboard());
});
