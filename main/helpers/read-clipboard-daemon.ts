import { generateHashKey, readClipboard } from "../utils/clipboard"
import { ClipboardHisotryEntity } from "../db/schemes";
import { singletons } from "main/components/singletons";
import { MAX_STORED_TEXT_BYTE_LENGTH } from "main/utils/consts";

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
                if (new Blob([text]).size > MAX_STORED_TEXT_BYTE_LENGTH) {
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
            lastReadTime: now,
            details: '{}'
        }

        singletons.cache.add(entity)
    }, 1000)
}