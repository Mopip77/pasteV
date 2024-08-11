import log from "electron-log/main";
import { ClipboardHisotryEntity, ListClipboardHistoryQuery } from "../db/schemes";
import { db } from "./singletons";
import { LinkedDictionary } from 'typescript-collections';
import { postHandleClipboardContent } from "main/helpers/clipboard-content-post-handler";

class ClipboardMemoCache {

    private caches: LinkedDictionary<string, ClipboardHisotryEntity>
    private last: ClipboardHisotryEntity | undefined = undefined

    constructor() {
    }

    public init() {
        this.caches = new LinkedDictionary<string, ClipboardHisotryEntity>();

        const historiesFromDb = db.listClipboardHistory({ size: 100 });
        historiesFromDb.reverse().forEach(history => {
            this.caches.setValue(history.hashKey, history)
        })

        if (!this.caches.isEmpty()) {
            this.last = this.caches.values[this.caches.values.length - 1];
        }

        log.debug("Loading histories from db, ", this.caches);
    }

    public add(data: ClipboardHisotryEntity) {
        if (this.caches.containsKey(data.hashKey)) {
            if (this.last?.hashKey === data.hashKey) {
                return
            }
            this.caches.remove(data.hashKey)
            db.updateClipboardHistoryLastReadTime(data.hashKey, data.lastReadTime)
        } else {
            db.insertClipboardHistory(data)
            postHandleClipboardContent(data)
        }
        this.caches.setValue(data.hashKey, data)
        this.last = data
    }

    public query(queryBody: ListClipboardHistoryQuery): ClipboardHisotryEntity[] {
        log.debug("query history, body=", queryBody)
        return db.listClipboardHistory(queryBody)
    }
}

export default ClipboardMemoCache;