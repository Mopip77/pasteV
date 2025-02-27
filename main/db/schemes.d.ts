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

export type {
    ClipboardHisotryEntity,
    ListClipboardHistoryQuery,
    ClipboardHistoryEntityDetail
}