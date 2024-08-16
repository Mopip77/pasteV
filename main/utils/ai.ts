import { settings } from "main/components/singletons";
import OpenAI from "openai";

function generateClient(): OpenAI | undefined {
    const openaiConfig = settings.loadConfig()?.openaiConfig;
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
        model: settings.loadConfig().openaiConfig.model,
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
    });

    return new Promise((resolve, reject) => {
        resolve(response.choices[0].message.content);
    });
}

export async function chatComplectionJsonFormatted(prompt: string): Promise<string> {
    const client = generateClient();
    const response = await client.chat.completions.create({
        model: settings.loadConfig().openaiConfig.model,
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

    return new Promise((resolve, reject) => {
        resolve(response.choices[0].message.content);
    });
}

export async function chatComplectionWithImage(prompt: string, image: Buffer): Promise<string> {
    const client = generateClient();

    const response = await client.chat.completions.create({
        model: settings.loadConfig().openaiConfig.model,
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

    return new Promise((resolve, reject) => {
        resolve(response.choices[0].message.content);
    });
}

export async function chatComplectionWithImageJsonFormatted(prompt: string, image: Buffer): Promise<string> {
    const client = generateClient();

    const response = await client.chat.completions.create({
        model: settings.loadConfig().openaiConfig.model,
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

    return new Promise((resolve, reject) => {
        resolve(response.choices[0].message.content);
    });
}