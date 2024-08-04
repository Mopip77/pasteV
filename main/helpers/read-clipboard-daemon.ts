import { readClipboard } from "../utils/clipboard"

export const startReadingClipboardDaemon = () => {
    setInterval(() => {
        const clipboardData = readClipboard();
        // console.log(clipboardData)
    }, 1000)
}