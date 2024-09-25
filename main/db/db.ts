import { join } from 'node:path'
import { app } from "electron";
import Database from 'better-sqlite3/lib/database';
import { ClipboardHisotryEntity, ListClipboardHistoryQuery } from './schemes';
import log from 'electron-log/main';
import * as sqlite_vss from './sqlite_vss';
import { singletons } from 'main/components/singletons';
import { EMBEDDING_DISTANCE } from 'main/utils/consts';

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
            sqlite_vss.load(this.db);
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

        // add details column
        const columns: { name: string }[] = this.db.pragma('table_info(clipboard_history)');
        const hasDetailColumn = columns.some(column => column.name === 'details');
        if (!hasDetailColumn) {
            this.db.exec(`
                ALTER TABLE clipboard_history ADD COLUMN details TEXT DEFAULT '{}';
            `);
        }

        // add vector table
        this.db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS vss_clipboard_history USING vss0(
                text_embedding(768)
            );
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
        if (query.usingEmbedding) {
            return this.embeddingSearch(query);
        }
        return this.normalSearch(query);
    }

    private embeddingSearch(query: ListClipboardHistoryQuery): ClipboardHisotryEntity[] {
        // count vss table
        const countSql = this.db.prepare(`
            SELECT COUNT(*) as count FROM vss_clipboard_history
        `);
        const count = countSql.get().count;
        log.info(`embedding search: count=${count}`)
        if (count === 0) {
            return [];
        }

        const clip = singletons.clip.getClip();
        if (!clip || !query.keyword) {
            return [];
        }

        const searchEmbedding = clip.computeLabelEmbeddingsJs([query.keyword])[0]
        const searchEmbeddingParams = [JSON.stringify(searchEmbedding), ((query.offset || 0) + 1) * query.size]

        const queryEmbeddingSql = this.db.prepare(`
            SELECT rowid, distance
            FROM vss_clipboard_history
            WHERE vss_search(
                text_embedding,
                json(?)
            )
            LIMIT ?
        `);

        let vssResult = []
        try {
            vssResult = queryEmbeddingSql.all(searchEmbeddingParams)
        } catch (e) {
            log.error(`embedding search error: ${e}`)
            return [];
        }

        // 手动分页
        vssResult = vssResult.slice((query.offset || 0) * query.size, (query.offset || 0) * query.size + query.size)
        log.info(`embedding search: vssResult:${JSON.stringify(vssResult)}`)
        // 过滤距离
        const rowids = vssResult.filter(row => row.distance < EMBEDDING_DISTANCE).map(row => row.rowid)

        if (rowids.length === 0) {
            return [];
        }
        
        const querySql = this.db.prepare(`
            SELECT id, type, text, blob, hash_key, create_time, last_read_time, details
            FROM clipboard_history
            WHERE rowid IN (${rowids.map(() => '?').join(',')})
          `);
        
        return querySql.all(
            rowids
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

    private normalSearch(query: ListClipboardHistoryQuery): ClipboardHisotryEntity[] {
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

    // date 为 yyyy-MM-dd 格式
    // 返回删除的记录数
    public deleteLastReadTimeBefore(date: string): number {
        const sql = this.db.prepare(`
            DELETE FROM clipboard_history WHERE last_read_time < ?
            `);

        const info = sql.run(date);

        return info.changes;
    }

    public insertEmbeddings(hashKey: string, embeddings: number[]) {
        // 查出 hashKey 对应的 rowid
        const id = this.db.prepare(`
            SELECT id FROM clipboard_history WHERE hash_key = ?
        `).get(hashKey)?.id

        if (!id) {
            return;
        }

        const sql = this.db.prepare(`
            INSERT INTO vss_clipboard_history (rowid, text_embedding) VALUES (?, ?)
            `);

        sql.run(
            id,
            JSON.stringify(embeddings)
        )
    }

}

export default DatabaseManager