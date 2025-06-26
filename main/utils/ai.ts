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
                            url: `data:image/png;base64,${image.toString("base64")}`,
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
                            url: `data:image/png;base64,${image.toString("base64")}`,
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

export async function createTextEmbedding(text: string): Promise<number[]> {
    const client = generateClient();
    if (!client) {
        return Promise.reject("OpenAI client not configured");
    }

    const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });

    log.info(`[ai] embedding model=${response.model}, usage=${response.usage}`);
    return Promise.resolve(response.data[0].embedding);
}