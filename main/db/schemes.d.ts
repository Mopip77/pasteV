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

// 列表查询返回的轻量级元数据（不含 blob，大文本截断）
interface ClipboardHistoryMeta {
    id?: number
    type: 'text' | 'image' | 'file'
    text: string  // 可能被截断
    textTruncated: boolean  // 标记文本是否被截断
    hashKey: string
    createTime: string
    lastReadTime: string
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
    type?: string
    size: number
    // 游标分页：上一页最后一条的 lastReadTime
    cursor?: string
}

export type {
    ClipboardHisotryEntity,
    ClipboardHistoryMeta,
    ListClipboardHistoryQuery,
    ClipboardHistoryEntityDetail
}