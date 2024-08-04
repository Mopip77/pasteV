import { clipboard } from "electron";
import crypto from 'crypto'

interface ClipboardData {
    type: 'text' | 'file' | 'image'
    text?: string
    blob?: Buffer
}

export const readClipboard = (): ClipboardData => {
    const img = clipboard.readImage();
    if (!img?.isEmpty()) {
        return {
            type: 'image',
            blob: img.toPNG()
        }
    }

    const file = clipboard.read('public.file-url');
    if (file) {
        return {
            type: 'file',
            text: file
        }
    }

    return {
        type: 'text',
        text: clipboard.readText()
    }
}

export const generateHashKey = (data: ClipboardData) : string => {
    const hash = crypto.createHash('md5');
    hash.update(data.type);

    switch (data.type) {
        case "text":
        case "file":
            hash.update(data.text!)
            break
        case "image":
            hash.update(data.blob!)
            break
    }
    return hash.digest('hex');
}