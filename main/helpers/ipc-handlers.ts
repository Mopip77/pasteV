import { BrowserWindow, Event } from "electron"
import { cache } from "main/components/singletons"
import { ClipboardHisotryEntity, ListClipboardHistoryQuery } from "main/db/schemes"
import { writeClipboard } from "main/utils/clipboard"

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
    ipcMain.handle('clipboard:add', (event: Event, entity: ClipboardHisotryEntity) => writeClipboard({ type: entity.type, text: entity.text, blob: entity.blob }))
}