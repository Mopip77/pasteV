import { join } from 'node:path'
import { app } from "electron";
import Database from 'better-sqlite3/lib/database';
import { ClipboardHisotryEntity, ListClipboardHistoryQuery } from './schemes';

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

        insert.run(
            entity.type,
            entity.text,
            entity.blob,
            entity.createTime,
            entity.lastReadTime
        );
    }

    public listClipboardHistory(query: ListClipboardHistoryQuery): ClipboardHisotryEntity[] {
        const querySql = this.db.prepare(`
            SELECT id, type, text, blob, create_time, last_read_time
            FROM clipboard_history
            ORDER BY id DESC
            LIMIT ?
          `);

        const result = querySql.all(query.size);
        console.debug("listClipboardHistory result, ", result)

        return result.map(row => ({
            id: row.id,
            type: row.type,
            text: row.text,
            blob: row.blob,
            createTime: row.create_time,
            lastReadTime: row.last_read_time
        }))
    }

}

export default DatabaseManager