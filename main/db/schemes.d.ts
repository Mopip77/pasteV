interface ClipboardHisotryEntity {
    id?: number
    type: 'text' | 'image' | 'file'
    text: string
    blob?: Buffer
    hashKey: string
    createTime: string
    lastReadTime: string
    // json format
    details: string
}

interface ClipboardHistoryEntityDetail {
    // For image
    width?: number
    // For image
    height?: number
    // For image
    byteLength?: number
    // For text
    wordCount?: number
    // For image:
    tags?: string[]
}

interface ListClipboardHistoryQuery {
    keyword?: string
    regex?: boolean
    type?: sting
    offset?: number
    size: number
    tags?: string[]
}

interface ClipboardEmbeddingEntity {
    id?: number
    clipboard_history_id: number
    embedding: Buffer
    model: string
    create_time: string
}

export type {
    ClipboardHisotryEntity,
    ListClipboardHistoryQuery,
    ClipboardHistoryEntityDetail,
    ClipboardEmbeddingEntity
}