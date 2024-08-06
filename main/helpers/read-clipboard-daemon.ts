import { generateHashKey, readClipboard } from "../utils/clipboard"
import { cache } from '../components/singletons'
import { ClipboardHisotryEntity } from "../db/schemes";

export const startReadingClipboardDaemon = () => {
    setInterval(() => {
        const clipboardData = readClipboard();
        const now = new Date().toISOString();

        let text: string = ''
        let blob: Buffer | undefined = undefined
        switch (clipboardData.type) {
            case "text":
            case "file":
                text = clipboardData.text
                if (!text) {
                    return
                }
                break
            case "image":
                blob = clipboardData.blob!
                break
        }

        const entity: ClipboardHisotryEntity = {
            type: clipboardData.type,
            text: text,
            blob: blob,
            hashKey: generateHashKey(clipboardData),
            createTime: now,
            lastReadTime: now
        }

        cache.add(entity)
    }, 5000)
}