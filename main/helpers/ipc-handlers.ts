import { app, Event } from "electron"
import { ClipboardHisotryEntity, ListClipboardHistoryQuery } from "main/db/schemes"
import { writeClipboard } from "main/utils/clipboard"
import { exec } from "child_process"
import log from "electron-log/main"
import { singletons } from "main/components/singletons"
import { SHORTCUT_KEY_APP_WINDOW_TOGGLE_SHORTCUT } from "main/utils/consts"

export const registerHandlers = (ipcMain) => {
    // app
    ipcMain.on('app:hide', () => {
        app.hide();
    })
    ipcMain.on('app:toggleGlobalShortcuts', (event: Event, enable: boolean) => {
        if (enable) {
            singletons.shortcuts.enableAllGlobalShortcuts();
        } else {
            singletons.shortcuts.disableAllGlobalShortcuts();
        }
    })
    // clipboard query
    ipcMain.handle('clipboard:query', (event: Event, query: ListClipboardHistoryQuery) => singletons.cache.query(query))
    // clipboard insert
    ipcMain.handle('clipboard:add', (event: Event, entity: ClipboardHisotryEntity, paste: boolean) => {
        writeClipboard({ type: entity.type, text: entity.text, blob: entity.blob })
        if (paste) {
            setTimeout(() => {
                const pasteCommand = `osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`;
                exec(pasteCommand, (error, stdout, stderr) => {
                    if (error) {
                        log.error(`Error executing paste command: ${error}`);
                    }
                });
            }, 80);
        }
    })
    // system
    ipcMain.on('system:openUrl', (event: Event, url: string) => { exec(`open ${url}`) })
    // ----------- settings ------------
    ipcMain.handle('setting:loadConfig', () => singletons.settings.loadConfig())
    ipcMain.on('setting:saveConfig', (event: Event, configStr: string) => {
        singletons.settings.saveConfig(configStr);
        // 更新快捷键
        singletons.shortcuts.replaceGlobalShortcut(
            SHORTCUT_KEY_APP_WINDOW_TOGGLE_SHORTCUT,
            singletons.settings.loadConfig().appWindowToggleShortcut
        );
    })
}