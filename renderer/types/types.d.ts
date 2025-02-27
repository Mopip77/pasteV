export interface SearchBody {
    keyword: string
    regex: boolean
    type: string
    tags: string[]
}

interface OpenaiConfig {
    apiHost: string;
    apiKey: string;
    model: string;
}

interface AppSettingConfig {
    // 展示/隐藏窗口快捷键
    appWindowToggleShortcut: string;
    // 历史记录清理天数
    historyClearDays: number;
    // 通过 ai 打标签
    aiTagEnable: boolean;
    // ai 打标签通过图片还是 ocr 文本
    imageInputType: 'text' | 'image';
    openaiConfig: OpenaiConfig;
}

export type {
    SearchBody,
    OpenaiConfig,
    AppSettingConfig
}