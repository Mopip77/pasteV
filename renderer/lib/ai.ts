import store from "@/stores/store";
import OpenAI from "openai";

function generateClient() {
    const openaiConfig = store.getState().appSettingConfig.openaiConfig;
    return new OpenAI({
        dangerouslyAllowBrowser: true,
        baseURL: openaiConfig.apiHost,
        apiKey: openaiConfig.apiKey,
    });
}

export async function chatComplection(prompt: string): Promise<string> {
    const client = generateClient();
    const response = await client.chat.completions.create({
        model: store.getState().appSettingConfig.openaiConfig.model,
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

export async function chatComplectionWithImage(prompt: string, image: Buffer): Promise<string> {
    const client = generateClient();

    const response = await client.chat.completions.create({
        model: store.getState().appSettingConfig.openaiConfig.model,
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