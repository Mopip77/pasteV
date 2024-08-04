import { clipboard } from "electron";

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