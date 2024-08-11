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
}

interface ListClipboardHistoryQuery {
    keyword?: string
    regex?: boolean
    offset?: number
    size: number
}

export type {
    ClipboardHisotryEntity,
    ListClipboardHistoryQuery
}