interface ClipboardHisotryEntity {
    id?: number
    type: 'text' | 'image' | 'file'
    text: string
    blob?: Buffer
    hashKey: string
    createTime: string
    lastReadTime: string
}

interface ListClipboardHistoryQuery {
    keyword?: string
    offset?: number
    size: number
}

export type {
    ClipboardHisotryEntity,
    ListClipboardHistoryQuery
}