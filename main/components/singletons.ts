import DatabaseManager from "../db/db";
import ClipManager from "./clip";
import ClipboardMemoCache from "./clipboardMemoCache";
import Settings from "./settings";
import { ShortcutManager } from "./shortcuts";

const db = new DatabaseManager();
const cache = new ClipboardMemoCache();
const settings = new Settings();
const shortcuts = new ShortcutManager();
const clip = new ClipManager();

const initSingletons = () => {
    db.init();
    cache.init();
    settings.init();
    shortcuts.init();
    clip.init();
}

export const singletons = {
    initSingletons,
    db,
    cache,
    settings,
    shortcuts,
    clip
};