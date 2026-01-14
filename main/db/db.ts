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

        // add details column
        const columns: { name: string }[] = this.db.pragma('table_info(clipboard_history)');
        const hasDetailColumn = columns.some(column => column.name === 'details');
        if (!hasDetailColumn) {
            this.db.exec(`
                ALTER TABLE clipboard_history ADD COLUMN details TEXT DEFAULT '{}';
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

}

export default DatabaseManager