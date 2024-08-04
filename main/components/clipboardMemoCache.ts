import { ClipboardHisotryEntity } from "../db/schemes";
import { db } from "./singletons";

class ClipboardMemoCache {

    private caches: ClipboardHisotryEntity[]

    constructor() {
    }

    public init() {
        const historiesFromDb = db.listClipboardHistory({ size: 20 });
        this.caches = historiesFromDb;

        console.debug("Loading histories from db, ", this.caches);
    }

}

export default ClipboardMemoCache;