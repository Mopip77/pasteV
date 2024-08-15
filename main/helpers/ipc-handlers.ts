import { BrowserWindow, Event } from "electron"
import { cache } from "main/components/singletons"
import { ClipboardHisotryEntity, ListClipboardHistoryQuery } from "main/db/schemes"
import { writeClipboard } from "main/utils/clipboard"
import { exec } from "child_process"
import log from "electron-log/main"

export const registerHandlers = (ipcMain) => {
    ipcMain.on('app:hide', () => {
        const mainWindow = BrowserWindow.getFocusedWindow();
        if (mainWindow) {
            mainWindow.hide();
        }
    })
    // clipboard query
    ipcMain.handle('clipboard:query', (event: Event, query: ListClipboardHistoryQuery) => cache.query(query))
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
            }, 100);
        }
    })
    // system
    ipcMain.on('system:openUrl', (event: Event, url: string) => { exec(`open ${url}`) })
}