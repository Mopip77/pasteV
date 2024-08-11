import { ClipboardHisotryEntity } from "main/db/schemes";
import { ocr } from "./ocr";
import { db } from "main/components/singletons";
import log from "electron-log/main";
import { readPngMetadata } from "./image-utils";

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
        readPngMetadata(item.blob)
            .then(metadata => {
                item.details = JSON.stringify({
                    ...JSON.parse(item.details),
                    width: metadata.width,
                    height: metadata.height
                })
                db.updateClipboardHistoryDetails(item.hashKey, item.details)
            })
            .catch(err => {
                log.error("[post-handler] Metadata error=", err)
            })
    }
}
