import DatabaseManager from "../db/db";
import ClipboardMemoCache from "./clipboardMemoCache";
import Settings from "./settings";

const db = new DatabaseManager();
const cache = new ClipboardMemoCache();
const settings = new Settings();

export const initSingletons = () => {
    db.init();
    cache.init();
    settings.init();
}

export { db, cache, settings }