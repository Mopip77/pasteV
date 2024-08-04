import { readClipboard } from "../utils/clipboard"
import { db } from '../components/singletons'

export const startReadingClipboardDaemon = () => {
    setInterval(() => {
        const clipboardData = readClipboard();
        const now = new Date().toISOString();

        const entity: ClipboardHisotryEntity = {
            type: clipboardData.type,
            text: '',
            createTime: now,
            lastReadTime: now
        }

        switch (clipboardData.type) {
            case "text":
            case "file":
                entity.text = clipboardData.text || ''
                break
            case "image":
                entity.blob = clipboardData.blob!
                break
        }

        db.insertClipboardHistory(entity)
    }, 5000)
}