interface ClipboardHisotryEntity {
    id?: number
    type: string
    text: string
    blob?: Buffer
    createTime: string
    lastReadTime: string
}

interface ListClipboardHistoryQuery {
    size: number
}

export {
    ClipboardHisotryEntity,
    ListClipboardHistoryQuery
}