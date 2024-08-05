import path from "path";
import { app, ipcMain, globalShortcut } from "electron";
import serve from "electron-serve";
import { readClipboard } from "./utils/clipboard";
import { startReadingClipboardDaemon } from "./helpers/read-clipboard-daemon";
import { initSingletons } from "./components/singletons";
import createWindow from "./helpers/create-window";
import { registerHandlers } from "./helpers/ipc-handlers";

const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

(async () => {
  initSingletons();
  startReadingClipboardDaemon();
  registerHandlers(ipcMain);

  await app.whenReady();

  const mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isProd) {
    await mainWindow.loadURL("app://./");
  } else {
    mainWindow.webContents.openDevTools();
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/`);
  }

  if (isProd) {
    mainWindow.on("blur", () => {
      mainWindow.hide();
    });
  }

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