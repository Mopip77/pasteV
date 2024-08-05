import { cache } from "main/components/singletons"
import { ListClipboardHistoryQuery } from "main/db/schemes"

export const registerHandlers = (ipcMain) => {
    // clipboard query
    ipcMain.handle('clipboard:query', (query: ListClipboardHistoryQuery) => cache.query(query))
}