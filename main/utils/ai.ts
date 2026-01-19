import log from "electron-log/main";
import { singletons } from "main/components/singletons";
import OpenAI from "openai";

function generateClient(): OpenAI | undefined {
    const openaiConfig = singletons.settings.loadConfig()?.openaiConfig;
    if (!openaiConfig) {
        return undefined;
    }

    return new OpenAI({
        baseURL: openaiConfig.apiHost,
        apiKey: openaiConfig.apiKey,
    });
}

export async function chatComplection(prompt: string): Promise<string> {
    const client = generateClient();
    const response = await client.chat.completions.create({
        model: singletons.settings.loadConfig().openaiConfig.model,
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
    });

    log.info(`[ai] chat model=${response.model}, usage=${response.usage}`);

    return new Promise((resolve, reject) => {
        resolve(response.choices[0].message.content);
    });
}

export async function chatComplectionJsonFormatted(prompt: string): Promise<string> {
    const client = generateClient();
    const response = await client.chat.completions.create({
        model: singletons.settings.loadConfig().openaiConfig.model,
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
        response_format: {
            type: "json_object"
        }
    });

    log.info(`[ai] chat model=${response.model}, usage=${response.usage}`);

    return new Promise((resolve, reject) => {
        resolve(response.choices[0].message.content);
    });
}

export async function chatComplectionWithImage(prompt: string, image: Buffer): Promise<string> {
    const client = generateClient();

    const response = await client.chat.completions.create({
        model: singletons.settings.loadConfig().openaiConfig.model,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: prompt,
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${Buffer.from(image).toString("base64")}`,
                        }
                    },
                ],
            },
        ],
    });

    log.info(`[ai] chat model=${response.model}, usage=${response.usage}`);

    return new Promise((resolve, reject) => {
        resolve(response.choices[0].message.content);
    });
}

export async function chatComplectionWithImageJsonFormatted(prompt: string, image: Buffer): Promise<string> {
    const client = generateClient();

    const response = await client.chat.completions.create({
        model: singletons.settings.loadConfig().openaiConfig.model,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: prompt,
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${Buffer.from(image).toString("base64")}`,
                        }
                    },
                ],
            },
        ],
        response_format: {
            type: "json_object"
        }
    });

    log.info(`[ai] chat model=${response.model}, usage=${response.usage}`);

    return new Promise((resolve, reject) => {
        resolve(response.choices[0].message.content);
    });
}

// Generate embedding vector for text using OpenAI text-embedding-3-small
export async function generateEmbedding(text: string): Promise<number[]> {
    const client = generateClient();
    if (!client) {
        throw new Error('OpenAI client not configured');
    }

    const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
    });

    log.info(`[ai] embedding model=${response.model}, usage=${JSON.stringify(response.usage)}`);

    return response.data[0].embedding;
}

// Generate image description for semantic search
export async function generateImageDescription(ocrText: string, imageBuffer: Buffer): Promise<string> {
    const prompt = `
## 任务
请用一段话（50-100字）描述这张图片的内容和主题。

## 输入
1. OCR 识别的文字内容
2. 图片本身

## 要求
- 综合 OCR 文本和图片视觉内容
- 描述应包含：主题、关键对象、文本要点
- 使用中文
- 不要使用 Markdown 格式

OCR 文本：
${ocrText || '（无文本）'}
`;

    return await chatComplectionWithImage(prompt, imageBuffer);
}
