interface SearchBody {
    keyword: string
    regex: boolean
    type: string
}

interface OpenaiConfig {
    apiHost: string;
    apiKey: string;
    model: string;
}

interface AppSettingConfig {
    // 通过 ai 打标签
    aiTagEnable: boolean;
    // ai 打标签通过图片还是 ocr 文本
    aiTagByImage: boolean;
    openaiConfig: OpenaiConfig;
}

export type {
    SearchBody,
    OpenaiConfig,
    AppSettingConfig
}