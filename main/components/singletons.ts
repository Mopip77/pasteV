import DatabaseManager from "../db/db";
import ClipboardMemoCache from "./clipboardMemoCache";

const db = new DatabaseManager();
const cache = new ClipboardMemoCache();

export const initSingletons = () => {
    db.init();
    cache.init();
}

export { db, cache }