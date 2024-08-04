import { clipboard } from "electron";

interface ClipboardData {
    type: 'text' | 'file' | 'image'
    data: string
}

export const readClipboard = (): ClipboardData => {
    const img = clipboard.readImage();
    if (!img?.isEmpty()) {
        return {
            type: 'image',
            data: img.toDataURL()
        }
    }

    const file = clipboard.read('public.file-url');
    if (file) {
        return {
            type: 'file',
            data: file
        }
    }

    return {
        type: 'text',
        data: clipboard.readText()
    }
}