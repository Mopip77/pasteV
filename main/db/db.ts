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
                hash_key TEXT,
                create_time DATETIME NOT NULL,
                last_read_time DATETIME NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_hash_key ON clipboard_history(hash_key);
            CREATE INDEX IF NOT EXISTS idx_last_read_time ON clipboard_history(last_read_time);
            CREATE INDEX IF NOT EXISTS idx_type_text ON clipboard_history(type, text);
        `)
    }

    public insertClipboardHistory(entity: ClipboardHisotryEntity) {
        const insert = this.db.prepare(`
            INSERT INTO clipboard_history (type, text, blob, hash_key, create_time, last_read_time)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

        insert.run(
            entity.type,
            entity.text,
            entity.blob,
            entity.hashKey,
            entity.createTime,
            entity.lastReadTime
        );
    }

    public listClipboardHistory(query: ListClipboardHistoryQuery): ClipboardHisotryEntity[] {
        const querySql = this.db.prepare(`
            SELECT id, type, text, blob, hash_key, create_time, last_read_time
            FROM clipboard_history
            ORDER BY last_read_time DESC
            LIMIT ?
          `);

        return querySql.all(query.size).map(row => ({
            id: row.id,
            type: row.type,
            text: row.text,
            blob: row.blob,
            hashKey: row.hash_key,
            createTime: row.create_time,
            lastReadTime: row.last_read_time
        }))
    }

    public updateClipboardHistoryLastReadTime(hashKey: string, lastReadTime: string) {
        const sql = this.db.prepare(`
            UPDATE clipboard_history SET last_read_time = ? WHERE hash_key = ?
            `);

        sql.run(
            lastReadTime,
            hashKey
        )
    }

}

export default DatabaseManager