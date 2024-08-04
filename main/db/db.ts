import { join } from 'node:path'
import { app } from "electron";
import Database from 'better-sqlite3/lib/database';

class DatabaseManager {

    private db: Database

    constructor() {
    }

    public init() {
        const databasePath = join(app.getPath('userData'), 'clipboard.db');
        console.log(`Init database, path=${databasePath}`);
        try {
            this.db = new Database(databasePath, { verbose: console.log });
        } catch (e) {
            console.error("create database failed", e);
            return;
        }
        this.db.pragma('journal_mode = WAL');

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS clipboard_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                text TEXT,
                blob BLOB,
                create_time DATETIME NOT NULL,
                last_read_time DATETIME NOT NULL
            );
        `)
    }

    public insertClipboardHistory(entity: ClipboardHisotryEntity) {
        const insert = this.db.prepare(`
            INSERT INTO clipboard_history (type, text, blob, create_time, last_read_time)
            VALUES (?, ?, ?, ?, ?)
          `);

        // 执行插入
        const info = insert.run(
            entity.type,
            entity.text,
            entity.blob,
            entity.createTime,
            entity.lastReadTime
        );

        console.log('Inserted row id:', info.lastInsertRowid);
    }

}

export default DatabaseManager