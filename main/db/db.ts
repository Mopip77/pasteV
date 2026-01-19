import { join } from 'node:path'
import { app } from "electron";
import Database from 'better-sqlite3/lib/database';
import { ClipboardHisotryEntity, ClipboardHistoryMeta, ListClipboardHistoryQuery } from './schemes';
import log from 'electron-log/main';

// 文本截断阈值：超过此长度的文本在列表中只返回前 N 个字符
const TEXT_TRUNCATE_THRESHOLD = 10000;

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

        // Register cosine similarity function for semantic search
        this.db.function('cosine_similarity', { deterministic: true },
            (embedding1: Buffer, embedding2: Buffer) => {
                if (!embedding1 || !embedding2) return -1;

                const vec1 = new Float32Array(embedding1.buffer, embedding1.byteOffset, embedding1.byteLength / 4);
                const vec2 = new Float32Array(embedding2.buffer, embedding2.byteOffset, embedding2.byteLength / 4);

                if (vec1.length !== vec2.length) return -1;

                let dotProduct = 0;
                let norm1 = 0;
                let norm2 = 0;

                for (let i = 0; i < vec1.length; i++) {
                    dotProduct += vec1[i] * vec2[i];
                    norm1 += vec1[i] * vec1[i];
                    norm2 += vec2[i] * vec2[i];
                }

                return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
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
        `)

        // 添加覆盖索引：type + last_read_time DESC（用于按类型筛选时的排序优化）
        // 移除旧的 idx_type_text 索引（包含 text 列，体积大且对 LIKE 无效）
        this.db.exec(`
            DROP INDEX IF EXISTS idx_type_text;
            CREATE INDEX IF NOT EXISTS idx_type_last_read ON clipboard_history(type, last_read_time DESC);
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

        // add query embedding cache table for semantic search
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS query_embedding_cache (
                query_text TEXT PRIMARY KEY,
                embedding BLOB NOT NULL,
                created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `)

        // add details column
        const columns: { name: string }[] = this.db.pragma('table_info(clipboard_history)');
        const hasDetailColumn = columns.some(column => column.name === 'details');
        if (!hasDetailColumn) {
            this.db.exec(`
                ALTER TABLE clipboard_history ADD COLUMN details TEXT DEFAULT '{}';
            `);
        }

        // add embedding column for semantic search
        const hasEmbeddingColumn = columns.some(column => column.name === 'embedding');
        if (!hasEmbeddingColumn) {
            this.db.exec(`
                ALTER TABLE clipboard_history ADD COLUMN embedding BLOB;
                CREATE INDEX IF NOT EXISTS idx_embedding_exists
                ON clipboard_history(type)
                WHERE embedding IS NOT NULL;
            `);
        }
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

    public listClipboardHistory(query: ListClipboardHistoryQuery): ClipboardHistoryMeta[] {
        const queryParams = []
        let whereClause = 'WHERE 1 = 1'

        // 游标分页：基于 last_read_time
        if (query.cursor) {
            queryParams.push(query.cursor)
            whereClause += ' AND last_read_time < ?'
        }

        if (query.keyword) {
            queryParams.push(query.keyword)
            whereClause += query.regex ? " AND (text REGEXP ?)" : " AND (text LIKE '%' || ? || '%')"
        }

        if (query.type) {
            queryParams.push(query.type)
            whereClause += " AND (type = ?)"
        }

        if (query.tags && query.tags.length > 0) {
            const placeholders = query.tags.map(() => '?').join(',');
            whereClause += `
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

        queryParams.push(query.size)

        // 不返回 blob，使用 SUBSTR 截断大文本
        const querySql = this.db.prepare(`
            SELECT
                id,
                type,
                CASE
                    WHEN LENGTH(text) > ${TEXT_TRUNCATE_THRESHOLD}
                    THEN SUBSTR(text, 1, ${TEXT_TRUNCATE_THRESHOLD})
                    ELSE text
                END as text,
                LENGTH(text) > ${TEXT_TRUNCATE_THRESHOLD} as text_truncated,
                hash_key,
                create_time,
                last_read_time,
                details
            FROM clipboard_history
            ${whereClause}
            ORDER BY last_read_time DESC
            LIMIT ?
        `);

        return querySql.all(queryParams).map(row => ({
            id: row.id,
            type: row.type,
            text: row.text,
            textTruncated: !!row.text_truncated,
            hashKey: row.hash_key,
            createTime: row.create_time,
            lastReadTime: row.last_read_time,
            details: row.details,
        }))
    }

    // 获取图片 blob（用于粘贴图片时）
    public getClipboardBlob(hashKey: string): Buffer | null {
        const sql = this.db.prepare(`
            SELECT blob FROM clipboard_history WHERE hash_key = ?
        `);
        const row = sql.get(hashKey);
        return row ? row.blob : null;
    }

    // 获取完整文本（用于查看被截断的大文本）
    public getFullText(hashKey: string): string | null {
        const sql = this.db.prepare(`
            SELECT text FROM clipboard_history WHERE hash_key = ?
        `);
        const row = sql.get(hashKey);
        return row ? row.text : null;
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

    // Update embedding for a clipboard item
    public updateClipboardHistoryEmbedding(hashKey: string, embedding: number[]) {
        const buffer = Buffer.from(new Float32Array(embedding).buffer);
        const sql = this.db.prepare(`
            UPDATE clipboard_history SET embedding = ? WHERE hash_key = ?
        `);
        sql.run(buffer, hashKey);
    }

    // Semantic search for clipboard history
    public semanticSearchClipboardHistory(
        queryEmbedding: number[],
        threshold: number,
        limit: number
    ): ClipboardHistoryMeta[] {
        const buffer = Buffer.from(new Float32Array(queryEmbedding).buffer);

        const sql = this.db.prepare(`
            SELECT
                id, type,
                CASE
                    WHEN LENGTH(text) > ${TEXT_TRUNCATE_THRESHOLD}
                    THEN SUBSTR(text, 1, ${TEXT_TRUNCATE_THRESHOLD})
                    ELSE text
                END as text,
                LENGTH(text) > ${TEXT_TRUNCATE_THRESHOLD} as text_truncated,
                hash_key, create_time, last_read_time, details,
                cosine_similarity(embedding, ?) as similarity
            FROM clipboard_history
            WHERE type = 'image'
              AND embedding IS NOT NULL
              AND cosine_similarity(embedding, ?) >= ?
            ORDER BY similarity DESC
            LIMIT ?
        `);

        return sql.all(buffer, buffer, threshold, limit).map(row => ({
            id: row.id,
            type: row.type,
            text: row.text,
            textTruncated: !!row.text_truncated,
            hashKey: row.hash_key,
            createTime: row.create_time,
            lastReadTime: row.last_read_time,
            details: row.details,
        }));
    }

    // Get query embedding from cache
    public getQueryEmbeddingCache(queryText: string): number[] | null {
        const sql = this.db.prepare(`
            SELECT embedding FROM query_embedding_cache WHERE query_text = ?
        `);
        const result = sql.get(queryText);

        if (!result || !result.embedding) {
            return null;
        }

        const buffer = result.embedding as Buffer;
        const embedding = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
        return Array.from(embedding);
    }

    // Save query embedding to cache
    public setQueryEmbeddingCache(queryText: string, embedding: number[]) {
        const buffer = Buffer.from(new Float32Array(embedding).buffer);
        const sql = this.db.prepare(`
            INSERT OR REPLACE INTO query_embedding_cache (query_text, embedding, created_time)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `);
        sql.run(queryText, buffer);
    }

}

export default DatabaseManager