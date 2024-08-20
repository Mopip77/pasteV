import DatabaseManager from "../db/db";
import ClipboardMemoCache from "./clipboardMemoCache";
import Settings from "./settings";
import { ShortcutManager } from "./shortcuts";

const db = new DatabaseManager();
const cache = new ClipboardMemoCache();
const settings = new Settings();
const shortcuts = new ShortcutManager();

const initSingletons = () => {
    db.init();
    cache.init();
    settings.init();
    shortcuts.init();
}

export const singletons = {
    initSingletons,
    db,
    cache,
    settings,
    shortcuts
};