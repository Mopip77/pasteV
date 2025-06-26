import { ClipboardHisotryEntity } from "main/db/schemes";
import { ocr } from "./ocr";
import log from "electron-log/main";
import { compressionPicture, readPngMetadata } from "../utils/image";
import { chatComplectionJsonFormatted, chatComplectionWithImageJsonFormatted, createTextEmbedding } from "main/utils/ai";
import { PNG } from "pngjs";
import { singletons } from "main/components/singletons";

export async function postHandleClipboardContent(item: ClipboardHisotryEntity) {
    if (item.type === 'image') {
        log.info(`[post-handler] {${item.hashKey}} Start to handle image`);
        readPngMetadata(item.blob)
            .then(img => {
                log.info(`[post-handler] {${item.hashKey}} Image metadata: width=${img.width}, height=${img.height}, byteLength=${Buffer.byteLength(item.blob)}`);
                item.details = JSON.stringify({
                    ...JSON.parse(item.details),
                    width: img.width,
                    height: img.height,
                    byteLength: Buffer.byteLength(item.blob)
                })
                singletons.db.updateClipboardHistoryDetails(item.hashKey, item.details)
                return img
            })
            .then(img => ocr(item.blob).then(ocrResult => {
                log.info(`[post-handler] {${item.hashKey}} Ocr result=${ocrResult}`);
                item.text = ocrResult
                singletons.db.updateClipboardHistoryText(item.hashKey, ocrResult)
                return { ocrResult, img }
            }))
            .then(({ ocrResult, img }) => aiTag(item, img, ocrResult))
            .catch(err => {
                log.error(`[post-handler] {${item.hashKey}} Error=${err}`);
            })
    }

    if (item.type === 'text') {
        item.details = JSON.stringify({
            wordCount: item.text.split(/\s+/).length
        })
        singletons.db.updateClipboardHistoryDetails(item.hashKey, item.details)
        createTextEmbedding(item.text).then(embedding => {
            if (item.id) {
                singletons.db.insertClipboardEmbedding(item.id, embedding, "text-embedding-3-small");
            }
        }).catch(err => {
            log.error(`[post-handler] {${item.hashKey}} Error creating text embedding=${err}`);
        });
    }
}

// ai 打标签
async function aiTag(item: ClipboardHisotryEntity, img: PNG, ocrResult: string) {
    log.info(`[post-handler] {${item.hashKey}} aiTag, start, settings=${JSON.stringify(singletons.settings)}`)
    const config = singletons.settings.loadConfig();
    log.info(`[post-handler] {${item.hashKey}} aiTag, start, settings=${JSON.stringify(singletons.settings)}`)
    if (!config?.aiTagEnable || !config?.openaiConfig) {
        return;
    }

    let aiResponse
    if (config.imageInputType === 'image') {
        // 压缩图片
        log.info(`[post-handler] {${item.hashKey}} aiTag, start compressionPicture, size=${item.blob.length}`)
        aiResponse = await compressionPicture({
            content: item.blob,
            originWidth: img.width,
            originHeight: img.height,
            maxWidth: 1000,
            maxHeight: 1000
        }).then(compressedBuffer => {
            log.info("[post-handler] aiTag, compressedBuffer size=", compressedBuffer.length)

            const ocrPrompt = `
            ## 目标
            请详细描述这张图片，并提供最多三个概括性的标签。
        
            ## 要求
            - 以 json 格式输出一个对象
            - 对象应包含两个字段: "description" (字符串) 和 "tags" (字符串数组)
            - "description" 应该详细描述图片的内容、场景、物体、人物、氛围等。
            - "tags" 最多包含三个词，这些词应高度概括图片主题。
            - 如果输入内容过少，"description" 可以为空字符串，"tags" 可以为空数组。
        
            ## 例子
            {
              "description": "这是一张展示了两个人坐在咖啡馆里交谈的图片。窗外是雨天，街景模糊。桌上放着两杯咖啡和一台笔记本电脑。整体氛围看起来很舒适和放松。",
              "tags": ["对话", "咖啡馆", "雨天"]
            }
            `

            return chatComplectionWithImageJsonFormatted(ocrPrompt, compressedBuffer)
        })
    } else {
        const ocrPrompt = `
    ## 背景
    这是一张图片通过 ocr 识别的文本，你可以猜测这是什么图片，或者这张图片的主题是什么？
    
    ## 目标
    请详细描述这张图片，并提供最多三个概括性的标签。

    ## 要求
    - 以 json 格式输出一个对象
    - 对象应包含两个字段: "description" (字符串) 和 "tags" (字符串数组)
    - "description" 应该详细描述图片的内容、场景、物体、人物、氛围等。
    - "tags" 最多包含三个词，这些词应高度概括图片主题。
    - 如果输入内容过少，"description" 可以为空字符串，"tags" 可以为空数组。

    ## 例子
    {
        "description": "这是一张展示了两个人坐在咖啡馆里交谈的图片。窗外是雨天，街景模糊。桌上放着两杯咖啡和一台笔记本电脑。整体氛围看起来很舒适和放松。",
        "tags": ["对话", "咖啡馆", "雨天"]
    }

    以下是 ocr 识别的文本：
    ${ocrResult}
    `
        aiResponse = await chatComplectionJsonFormatted(ocrPrompt);
    }

    if (!aiResponse) {
        log.debug(`[post-handler] {${item.hashKey}} aiTag, aiResponse is empty`)
        return;
    }

    const aiResponseJson = JSON.parse(aiResponse);
    log.debug("[post-handler] aiTag, aiResponseJson=", aiResponseJson)
    if (aiResponseJson.tags && aiResponseJson.tags.length > 0) {
        item.details = JSON.stringify({
            ...JSON.parse(item.details),
            tags: aiResponseJson.tags
        })
        singletons.db.updateClipboardHistoryDetails(item.hashKey, item.details)
        singletons.db.insertTagRelation(item.hashKey, aiResponseJson.tags)
    }

    if (aiResponseJson.description) {
        createTextEmbedding(aiResponseJson.description).then(embedding => {
            if (item.id) {
                singletons.db.insertClipboardEmbedding(item.id, embedding, "text-embedding-3-small");
            }
        }).catch(err => {
            log.error(`[post-handler] {${item.hashKey}} Error creating image embedding=${err}`);
        });
    }
}