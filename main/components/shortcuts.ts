import { globalShortcut } from "electron";

export class ShortcutManager {

    private globalTagMap = new Map<string, string>();
    private globalShortcutMap = new Map<string, () => void>();

    public registerGlobalShortcut(tag: string, shortcut: string, callback: () => void) {
        if (this.globalTagMap.has(tag)) {
            globalShortcut.unregister(this.globalTagMap.get(tag));
        }
        this.globalTagMap.set(tag, shortcut);
        this.globalShortcutMap.set(shortcut, callback);
        globalShortcut.register(shortcut, callback);
    }

    public replaceGlobalShortcut(tag: string, newShortcut: string) {
        if (!this.globalTagMap.has(tag)) {
            return;
        }

        const oldShortcut = this.globalTagMap.get(tag);
        const callback = this.globalShortcutMap.get(oldShortcut);
        if (callback) {
            globalShortcut.unregister(oldShortcut);
            this.globalTagMap.set(tag, newShortcut);
            this.globalShortcutMap.set(newShortcut, callback);
            globalShortcut.register(newShortcut, callback);
        }
    }

    public disableAllGlobalShortcuts() {
        globalShortcut.unregisterAll();
    }

    public enableAllGlobalShortcuts() {
        this.globalTagMap.forEach((shortcut, tag) => {
            const callback = this.globalShortcutMap.get(shortcut);
            if (callback) {
                globalShortcut.register(shortcut, callback);
            }
        })
    }

    public init() { }

    constructor() { }
}