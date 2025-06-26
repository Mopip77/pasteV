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
            return new RegExp(regex, "i").test(text) ? 1 : 0;
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

            CREATE UNIQUE INDEX IF NOT EXISTS uidx_hash_key ON clipboard_history(hash_key);
            CREATE INDEX IF NOT EXISTS idx_last_read_time ON clipboard_history(last_read_time);
            CREATE INDEX IF NOT EXISTS idx_type_text ON clipboard_history(type, text);
        `)

        // add tag table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tag_relation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                clipboard_history_hash_key TEXT NOT NULL,
                create_time DATETIME NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_name ON tag_relation(name);
            CREATE INDEX IF NOT EXISTS idx_clipboard_history_hash_key ON tag_relation(clipboard_history_hash_key);
        `)

        // add details column
        const columns: { name: string }[] = this.db.pragma('table_info(clipboard_history)');
        const hasDetailColumn = columns.some(column => column.name === 'details');
        if (!hasDetailColumn) {
            this.db.exec(`
                ALTER TABLE clipboard_history ADD COLUMN details TEXT DEFAULT '{}';
            `);
        }

        // add embedding table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS clipboard_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clipboard_history_id INTEGER NOT NULL,
                embedding BLOB NOT NULL,
                model TEXT NOT NULL,
                create_time DATETIME NOT NULL,
                FOREIGN KEY (clipboard_history_id) REFERENCES clipboard_history(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_embedding_create_time ON clipboard_embeddings(create_time);
        `)
    }

    public getClipboardHistory(hashKey: string): ClipboardHisotryEntity | undefined {
        const query = this.db.prepare(`
            SELECT id, type, text, blob, hash_key, create_time, last_read_time, details
            FROM clipboard_history
            WHERE hash_key = ?
          `);

        const row = query.get(hashKey);
        if (!row) {
            return undefined;
        }

        return {
            id: row.id,
            type: row.type,
            text: row.text,
            blob: row.blob,
            hashKey: row.hash_key,
            createTime: row.create_time,
            lastReadTime: row.last_read_time,
            details: row.details,
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

        if (query.type) {
            queryParams.push(query.type)
            keywordFilterClause += "AND (type = ?)"
        }

        if (query.tags && query.tags.length > 0) {
            const placeholders = query.tags.map(() => '?').join(',');
            keywordFilterClause += `
                AND hash_key IN (
                    SELECT clipboard_history_hash_key 
                    FROM tag_relation 
                    WHERE name IN (${placeholders})
                    GROUP BY clipboard_history_hash_key 
                    HAVING COUNT(DISTINCT name) = ${query.tags.length}
                )
            `;
            queryParams.push(...query.tags);
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

        return querySql.all(queryParams).map(row => ({
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

    // date 为 yyyy-MM-dd 格式
    // 返回删除的记录数
    public deleteLastReadTimeBefore(date: string): number {
        const sql = this.db.prepare(`
            DELETE FROM clipboard_history WHERE last_read_time < ?
            `);

        const info = sql.run(date);

        return info.changes;
    }

    public insertTagRelation(hashKey: string, tags: string[]) {
        if (!hashKey || tags.length === 0) {
            return;
        }

        const insertSql = this.db.prepare(`
            INSERT INTO tag_relation (name, clipboard_history_hash_key, create_time)
            VALUES (?, ?, ?)
          `);

        tags.forEach(tag => {
            insertSql.run(tag, hashKey, new Date().toISOString());
        })
    }

    public cleanNotRelatedTags() {
        const sql = this.db.prepare(`
            DELETE FROM tag_relation 
            WHERE clipboard_history_hash_key NOT IN (
                SELECT hash_key FROM clipboard_history
            )
        `);

        const info = sql.run();
        return info.changes;
    }

    public queryTags(filter: string = ""): string[] {
        const sql = `
        SELECT DISTINCT name as tag
        FROM tag_relation
        WHERE name LIKE ?
        ORDER BY name
        `;

        return this.db.prepare(sql).all([`%${filter}%`]).map(row => row.tag);
    }

    public insertClipboardEmbedding(clipboardHistoryId: number, embedding: number[], model: string) {
        const insert = this.db.prepare(`
            INSERT INTO clipboard_embeddings (clipboard_history_id, embedding, model, create_time)
            VALUES (?, ?, ?, ?)
        `);
        const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);
        insert.run(clipboardHistoryId, embeddingBuffer, model, new Date().toISOString());
    }

}

export default DatabaseManager