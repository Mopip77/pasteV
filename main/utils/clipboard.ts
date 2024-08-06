import { clipboard, nativeImage } from "electron";
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

export const writeClipboard = (data: ClipboardData) => {
    console.log('writeClipboard', data)
    switch (data.type) {
        case 'text':
            clipboard.writeText(data.text!)
            break
        case 'image':
            const img = nativeImage.createFromBuffer(data.blob!)
            clipboard.writeImage(img)
            break
        case 'file':
            clipboard.writeBuffer('public.file-url', Buffer.from(data.text!))
            break
    }
}

export const generateHashKey = (data: ClipboardData): string => {
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