import { ClipboardHisotryEntity } from "main/db/schemes";
import { ocr } from "./ocr";
import { db, settings } from "main/components/singletons";
import log from "electron-log/main";
import { readPngMetadata } from "./image-utils";
import { chatComplectionJsonFormatted } from "main/utils/ai";

export async function postHandleClipboardContent(item: ClipboardHisotryEntity) {
    if (item.type === 'image') {
        log.info("[post-handler] Start ocr for image");
        ocr(item.blob)
            .then(ocrResult => {
                log.info("[post-handler] Ocr result=", ocrResult)
                item.text = ocrResult
                db.updateClipboardHistoryText(item.hashKey, ocrResult)
                return ocrResult
            })
            .then(ocrResult => aiTag(item, ocrResult))
            .catch(err => {
                log.error("[post-handler] Ocr error=", err)
            })
        readPngMetadata(item.blob)
            .then(metadata => {
                item.details = JSON.stringify({
                    ...JSON.parse(item.details),
                    width: metadata.width,
                    height: metadata.height,
                    byteLength: Buffer.byteLength(item.blob)
                })
                db.updateClipboardHistoryDetails(item.hashKey, item.details)
            })
            .catch(err => {
                log.error("[post-handler] Metadata error=", err)
            })
    }

    if (item.type === 'text') {
        item.details = JSON.stringify({
            wordCount: item.text.split(/\s+/).length
        })
        db.updateClipboardHistoryDetails(item.hashKey, item.details)
    }
}

// ai 打标签
async function aiTag(item: ClipboardHisotryEntity, ocrResult: string) {
    const config = settings.loadConfig();
    if (!config?.aiTagEnable || !config?.openaiConfig) {
        return;
    }

    let aiResponse
    if (config.imageInputType === 'image') {
        // 压缩图片
        // chatComplectionWithImage(ocrResult, item.blob)
        log.info("[post-handler] aiTag, 还不支持图片识别")
    } else {
        const ocrPrompt = `
    ## 背景
    这是一张图片通过 ocr 识别的文本，你可以猜测这是什么图片，或者这张图片的主题是什么？
    
    ## 目标
    请用最多三个词来描述这张图片，这些词应该是有关这张图片的主题的。

    ## 要求
    - 以 json 格式输出一个字符串数组
    - 最多输出三个词
    - 三个词尽量不相关
    - 如果输入内容过少，可以输出空数组

    ## 例子
    1. {"tags": ["对话", "天气", "风景"]}
    2. {"tags": []}

    以下是 ocr 识别的文本：
    ${ocrResult}
    `
        aiResponse = await chatComplectionJsonFormatted(ocrPrompt);
    }

    const aiResponseJson = JSON.parse(aiResponse);
    log.debug("[post-handler] aiTag, aiResponseJson=", aiResponseJson)
    if (aiResponseJson.tags) {
        item.details = JSON.stringify({
            ...JSON.parse(item.details),
            tags: aiResponseJson.tags
        })
        db.updateClipboardHistoryDetails(item.hashKey, item.details)
    }
}