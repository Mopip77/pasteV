import { join } from 'node:path'
import { app } from "electron";
import Database from 'better-sqlite3/lib/database';
import { ClipboardHisotryEntity, ListClipboardHistoryQuery } from './schemes';
import log from 'electron-log/main';

class DatabaseManager {

    private db: Database

    constructor() {
    }

    public init() {
        const baseDir = process.env.NODE_ENV === 'development' ? process.cwd() : process.resourcesPath;

        const betterSqlite3NodePath = join(baseDir, '/build', 'better_sqlite3.node');
        const databasePath = join(app.getPath('userData'), 'clipboard.db');

        log.info(`Init database, db path=${databasePath}, better_sqlite3.node path=${betterSqlite3NodePath}`);
        try {
            this.db = new Database(databasePath, { verbose: log.debug, nativeBinding: betterSqlite3NodePath });
        } catch (e) {
            log.error("create database failed", e);
            return;
        }
        this.db.pragma('journal_mode = WAL');

        this.db.function('regexp', { deterministic: true }, (regex, text) => {
            return new RegExp(regex).test(text) ? 1 : 0;
        });

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

        // add details column
        const columns: { name: string }[] = this.db.pragma('table_info(clipboard_history)');
        const hasDetailColumn = columns.some(column => column.name === 'details');
        if (!hasDetailColumn) {
            this.db.exec(`
                ALTER TABLE clipboard_history ADD COLUMN details TEXT DEFAULT '{}';
            `);
        }
    }

    public insertClipboardHistory(entity: ClipboardHisotryEntity) {
        const insert = this.db.prepare(`
            INSERT INTO clipboard_history (type, text, blob, hash_key, create_time, last_read_time, details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

        insert.run(
            entity.type,
            entity.text,
            entity.blob,
            entity.hashKey,
            entity.createTime,
            entity.lastReadTime,
            entity.details
        );
    }

    public listClipboardHistory(query: ListClipboardHistoryQuery): ClipboardHisotryEntity[] {
        const queryParams = []
        let keywordFilterClause = ''

        if (query.keyword) {
            queryParams.push(query.keyword)
            keywordFilterClause = query.regex ? "AND (text REGEXP ?)" : "AND (text LIKE CONCAT('%', ?, '%'))"
        }

        const querySql = this.db.prepare(`
            SELECT id, type, text, blob, hash_key, create_time, last_read_time, details
            FROM clipboard_history
            WHERE 1 = 1 ${keywordFilterClause}
            ORDER BY last_read_time DESC
            LIMIT ?, ?
          `);
        queryParams.push(query.offset || 0)
        queryParams.push(query.size)

        return querySql.all(
            queryParams
        ).map(row => ({
            id: row.id,
            type: row.type,
            text: row.text,
            blob: row.blob,
            hashKey: row.hash_key,
            createTime: row.create_time,
            lastReadTime: row.last_read_time,
            details: row.details,
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

    public updateClipboardHistoryText(hashKey: string, text: string) {
        const sql = this.db.prepare(`
            UPDATE clipboard_history SET text = ? WHERE hash_key = ?
            `);

        sql.run(
            text,
            hashKey
        )
    }

    public updateClipboardHistoryDetails(hashKey: string, details: string) {
        const sql = this.db.prepare(`
            UPDATE clipboard_history SET details = ? WHERE hash_key = ?
            `);

        sql.run(
            details,
            hashKey
        )
    }

}

export default DatabaseManager