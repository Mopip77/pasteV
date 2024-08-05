interface ClipboardHisotryEntity {
    id?: number
    type: string
    text: string
    blob?: Buffer
    hashKey: string
    createTime: string
    lastReadTime: string
}

interface ListClipboardHistoryQuery {
    offset?: number
    size: number
}

export type {
    ClipboardHisotryEntity,
    ListClipboardHistoryQuery
}