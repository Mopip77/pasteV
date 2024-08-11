import { ClipboardHisotryEntity } from "main/db/schemes";
import { ocr } from "./ocr";
import { db } from "main/components/singletons";
import log from "electron-log/main";

export async function postHandleClipboardContent(item: ClipboardHisotryEntity) {
    if (item.type === 'image') {
        log.info("[post-handler] Start ocr for image");
        ocr(item.blob)
            .then(ocrResult => {
                log.info("[post-handler] Ocr result=", ocrResult)
                item.text = ocrResult
                db.updateClipboardHistoryText(item.hashKey, ocrResult)
            }
            ).catch(err => {
                log.error("[post-handler] Ocr error=", err)
            })
    }
}