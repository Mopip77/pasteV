interface ClipboardHisotryEntity {
    type: string
    text: string
    blob?: Buffer
    createTime: string
    lastReadTime: string
}