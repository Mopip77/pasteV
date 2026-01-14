import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

// 文本截断阈值（与 db.ts 保持一致）
const TEXT_TRUNCATE_THRESHOLD = 10000

interface ClipboardHistoryMeta {
  id?: number
  type: 'text' | 'image' | 'file'
  text: string
  textTruncated: boolean
  hashKey: string
  createTime: string
  lastReadTime: string
  details: string
}

interface ListClipboardHistoryQuery {
  keyword?: string
  regex?: boolean
  type?: string
  size: number
  tags?: string[]
  cursor?: string
}

/**
 * 测试用的数据库管理器
 * 直接使用 better-sqlite3 进行测试，避免依赖 electron
 */
class TestDatabaseManager {
  private db: Database.Database

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath)
    this.init()
  }

  private init() {
    this.db.pragma('journal_mode = WAL')

    this.db.function('regexp', { deterministic: true }, (regex: unknown, text: unknown) => {
      return new RegExp(regex as string, 'i').test(text as string) ? 1 : 0
    })

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clipboard_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        text TEXT,
        blob BLOB,
        hash_key TEXT,
        create_time DATETIME NOT NULL,
        last_read_time DATETIME NOT NULL,
        details TEXT DEFAULT '{}'
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uidx_hash_key ON clipboard_history(hash_key);
      CREATE INDEX IF NOT EXISTS idx_last_read_time ON clipboard_history(last_read_time);
      CREATE INDEX IF NOT EXISTS idx_type_last_read ON clipboard_history(type, last_read_time DESC);
    `)

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
  }

  public insertClipboardHistory(entity: {
    type: string
    text?: string
    blob?: Buffer
    hashKey: string
    createTime: string
    lastReadTime: string
    details?: string
  }) {
    const insert = this.db.prepare(`
      INSERT INTO clipboard_history (type, text, blob, hash_key, create_time, last_read_time, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    insert.run(
      entity.type,
      entity.text || null,
      entity.blob || null,
      entity.hashKey,
      entity.createTime,
      entity.lastReadTime,
      entity.details || '{}'
    )
  }

  public insertTagRelation(hashKey: string, tags: string[]) {
    const insertSql = this.db.prepare(`
      INSERT INTO tag_relation (name, clipboard_history_hash_key, create_time)
      VALUES (?, ?, ?)
    `)

    tags.forEach(tag => {
      insertSql.run(tag, hashKey, new Date().toISOString())
    })
  }

  public listClipboardHistory(query: ListClipboardHistoryQuery): ClipboardHistoryMeta[] {
    const queryParams: (string | number)[] = []
    let whereClause = 'WHERE 1 = 1'

    // 游标分页
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
      const placeholders = query.tags.map(() => '?').join(',')
      whereClause += `
        AND hash_key IN (
          SELECT clipboard_history_hash_key
          FROM tag_relation
          WHERE name IN (${placeholders})
          GROUP BY clipboard_history_hash_key
          HAVING COUNT(DISTINCT name) = ${query.tags.length}
        )
      `
      queryParams.push(...query.tags)
    }

    queryParams.push(query.size)

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
    `)

    return querySql.all(queryParams).map((row: any) => ({
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

  public getClipboardBlob(hashKey: string): Buffer | null {
    const sql = this.db.prepare(`
      SELECT blob FROM clipboard_history WHERE hash_key = ?
    `)
    const row = sql.get(hashKey) as { blob: Buffer } | undefined
    return row ? row.blob : null
  }

  public getFullText(hashKey: string): string | null {
    const sql = this.db.prepare(`
      SELECT text FROM clipboard_history WHERE hash_key = ?
    `)
    const row = sql.get(hashKey) as { text: string } | undefined
    return row ? row.text : null
  }

  public close() {
    this.db.close()
  }
}

describe('DatabaseManager', () => {
  let db: TestDatabaseManager

  beforeAll(() => {
    db = new TestDatabaseManager()
  })

  afterAll(() => {
    db.close()
  })

  beforeEach(() => {
    // 清空数据
    const clearDb = new Database(':memory:')
    clearDb.close()
  })

  describe('listClipboardHistory', () => {
    it('should return items ordered by lastReadTime DESC', () => {
      const testDb = new TestDatabaseManager()

      // 插入测试数据
      testDb.insertClipboardHistory({
        type: 'text',
        text: 'First item',
        hashKey: 'hash1',
        createTime: '2024-01-01T00:00:00.000Z',
        lastReadTime: '2024-01-01T00:00:00.000Z',
      })
      testDb.insertClipboardHistory({
        type: 'text',
        text: 'Second item',
        hashKey: 'hash2',
        createTime: '2024-01-02T00:00:00.000Z',
        lastReadTime: '2024-01-02T00:00:00.000Z',
      })
      testDb.insertClipboardHistory({
        type: 'text',
        text: 'Third item',
        hashKey: 'hash3',
        createTime: '2024-01-03T00:00:00.000Z',
        lastReadTime: '2024-01-03T00:00:00.000Z',
      })

      const results = testDb.listClipboardHistory({ size: 10 })

      expect(results).toHaveLength(3)
      expect(results[0].text).toBe('Third item')
      expect(results[1].text).toBe('Second item')
      expect(results[2].text).toBe('First item')

      testDb.close()
    })

    it('should support cursor pagination', () => {
      const testDb = new TestDatabaseManager()

      // 插入 5 条测试数据
      for (let i = 1; i <= 5; i++) {
        testDb.insertClipboardHistory({
          type: 'text',
          text: `Item ${i}`,
          hashKey: `hash${i}`,
          createTime: `2024-01-0${i}T00:00:00.000Z`,
          lastReadTime: `2024-01-0${i}T00:00:00.000Z`,
        })
      }

      // 第一页
      const page1 = testDb.listClipboardHistory({ size: 2 })
      expect(page1).toHaveLength(2)
      expect(page1[0].text).toBe('Item 5')
      expect(page1[1].text).toBe('Item 4')

      // 第二页（使用上一页最后一条的 lastReadTime 作为游标）
      const page2 = testDb.listClipboardHistory({
        size: 2,
        cursor: page1[1].lastReadTime,
      })
      expect(page2).toHaveLength(2)
      expect(page2[0].text).toBe('Item 3')
      expect(page2[1].text).toBe('Item 2')

      // 第三页
      const page3 = testDb.listClipboardHistory({
        size: 2,
        cursor: page2[1].lastReadTime,
      })
      expect(page3).toHaveLength(1)
      expect(page3[0].text).toBe('Item 1')

      testDb.close()
    })

    it('should truncate text exceeding threshold', () => {
      const testDb = new TestDatabaseManager()

      // 创建超过阈值的长文本
      const longText = 'a'.repeat(TEXT_TRUNCATE_THRESHOLD + 1000)
      const shortText = 'short text'

      testDb.insertClipboardHistory({
        type: 'text',
        text: longText,
        hashKey: 'hashLong',
        createTime: '2024-01-02T00:00:00.000Z',
        lastReadTime: '2024-01-02T00:00:00.000Z',
      })
      testDb.insertClipboardHistory({
        type: 'text',
        text: shortText,
        hashKey: 'hashShort',
        createTime: '2024-01-01T00:00:00.000Z',
        lastReadTime: '2024-01-01T00:00:00.000Z',
      })

      const results = testDb.listClipboardHistory({ size: 10 })

      // 长文本应该被截断
      const longResult = results.find(r => r.hashKey === 'hashLong')
      expect(longResult!.text.length).toBe(TEXT_TRUNCATE_THRESHOLD)
      expect(longResult!.textTruncated).toBe(true)

      // 短文本不应该被截断
      const shortResult = results.find(r => r.hashKey === 'hashShort')
      expect(shortResult!.text).toBe(shortText)
      expect(shortResult!.textTruncated).toBe(false)

      testDb.close()
    })

    it('should filter by type', () => {
      const testDb = new TestDatabaseManager()

      testDb.insertClipboardHistory({
        type: 'text',
        text: 'Text item',
        hashKey: 'hashText',
        createTime: '2024-01-01T00:00:00.000Z',
        lastReadTime: '2024-01-01T00:00:00.000Z',
      })
      testDb.insertClipboardHistory({
        type: 'image',
        text: 'Image OCR',
        blob: Buffer.from('fake-image-data'),
        hashKey: 'hashImage',
        createTime: '2024-01-02T00:00:00.000Z',
        lastReadTime: '2024-01-02T00:00:00.000Z',
      })

      const textResults = testDb.listClipboardHistory({ size: 10, type: 'text' })
      expect(textResults).toHaveLength(1)
      expect(textResults[0].type).toBe('text')

      const imageResults = testDb.listClipboardHistory({ size: 10, type: 'image' })
      expect(imageResults).toHaveLength(1)
      expect(imageResults[0].type).toBe('image')

      testDb.close()
    })

    it('should filter by keyword with LIKE', () => {
      const testDb = new TestDatabaseManager()

      testDb.insertClipboardHistory({
        type: 'text',
        text: 'Hello world',
        hashKey: 'hash1',
        createTime: '2024-01-01T00:00:00.000Z',
        lastReadTime: '2024-01-01T00:00:00.000Z',
      })
      testDb.insertClipboardHistory({
        type: 'text',
        text: 'Goodbye world',
        hashKey: 'hash2',
        createTime: '2024-01-02T00:00:00.000Z',
        lastReadTime: '2024-01-02T00:00:00.000Z',
      })
      testDb.insertClipboardHistory({
        type: 'text',
        text: 'Something else',
        hashKey: 'hash3',
        createTime: '2024-01-03T00:00:00.000Z',
        lastReadTime: '2024-01-03T00:00:00.000Z',
      })

      const results = testDb.listClipboardHistory({ size: 10, keyword: 'world' })
      expect(results).toHaveLength(2)
      expect(results.every(r => r.text.includes('world'))).toBe(true)

      testDb.close()
    })

    it('should filter by keyword with REGEXP', () => {
      const testDb = new TestDatabaseManager()

      testDb.insertClipboardHistory({
        type: 'text',
        text: 'function test() { return 1; }',
        hashKey: 'hash1',
        createTime: '2024-01-01T00:00:00.000Z',
        lastReadTime: '2024-01-01T00:00:00.000Z',
      })
      testDb.insertClipboardHistory({
        type: 'text',
        text: 'const func = () => {}',
        hashKey: 'hash2',
        createTime: '2024-01-02T00:00:00.000Z',
        lastReadTime: '2024-01-02T00:00:00.000Z',
      })
      testDb.insertClipboardHistory({
        type: 'text',
        text: 'just some text',
        hashKey: 'hash3',
        createTime: '2024-01-03T00:00:00.000Z',
        lastReadTime: '2024-01-03T00:00:00.000Z',
      })

      // 使用正则表达式匹配函数定义
      const results = testDb.listClipboardHistory({
        size: 10,
        keyword: 'function.*\\{',
        regex: true,
      })
      expect(results).toHaveLength(1)
      expect(results[0].hashKey).toBe('hash1')

      testDb.close()
    })

    it('should filter by tags', () => {
      const testDb = new TestDatabaseManager()

      testDb.insertClipboardHistory({
        type: 'image',
        text: 'Screenshot 1',
        hashKey: 'hash1',
        createTime: '2024-01-01T00:00:00.000Z',
        lastReadTime: '2024-01-01T00:00:00.000Z',
      })
      testDb.insertClipboardHistory({
        type: 'image',
        text: 'Screenshot 2',
        hashKey: 'hash2',
        createTime: '2024-01-02T00:00:00.000Z',
        lastReadTime: '2024-01-02T00:00:00.000Z',
      })
      testDb.insertClipboardHistory({
        type: 'text',
        text: 'Code snippet',
        hashKey: 'hash3',
        createTime: '2024-01-03T00:00:00.000Z',
        lastReadTime: '2024-01-03T00:00:00.000Z',
      })

      // 添加标签
      testDb.insertTagRelation('hash1', ['screenshot', 'ui'])
      testDb.insertTagRelation('hash2', ['screenshot'])
      testDb.insertTagRelation('hash3', ['code'])

      // 筛选单个标签
      const screenshotResults = testDb.listClipboardHistory({
        size: 10,
        tags: ['screenshot'],
      })
      expect(screenshotResults).toHaveLength(2)

      // 筛选多个标签（AND 逻辑）
      const multiTagResults = testDb.listClipboardHistory({
        size: 10,
        tags: ['screenshot', 'ui'],
      })
      expect(multiTagResults).toHaveLength(1)
      expect(multiTagResults[0].hashKey).toBe('hash1')

      testDb.close()
    })

    it('should not return blob field in list query', () => {
      const testDb = new TestDatabaseManager()

      testDb.insertClipboardHistory({
        type: 'image',
        text: 'Image with blob',
        blob: Buffer.from('large-image-data-here'),
        hashKey: 'hashImage',
        createTime: '2024-01-01T00:00:00.000Z',
        lastReadTime: '2024-01-01T00:00:00.000Z',
      })

      const results = testDb.listClipboardHistory({ size: 10 })

      expect(results).toHaveLength(1)
      // 结果中不应该包含 blob 字段
      expect((results[0] as any).blob).toBeUndefined()

      testDb.close()
    })
  })

  describe('getClipboardBlob', () => {
    it('should return blob for image items', () => {
      const testDb = new TestDatabaseManager()
      const testBlob = Buffer.from('test-image-binary-data')

      testDb.insertClipboardHistory({
        type: 'image',
        text: 'Image OCR text',
        blob: testBlob,
        hashKey: 'hashImage',
        createTime: '2024-01-01T00:00:00.000Z',
        lastReadTime: '2024-01-01T00:00:00.000Z',
      })

      const blob = testDb.getClipboardBlob('hashImage')
      expect(blob).not.toBeNull()
      expect(blob!.equals(testBlob)).toBe(true)

      testDb.close()
    })

    it('should return null for non-existent hash key', () => {
      const testDb = new TestDatabaseManager()

      const blob = testDb.getClipboardBlob('non-existent-hash')
      expect(blob).toBeNull()

      testDb.close()
    })

    it('should return null for text items without blob', () => {
      const testDb = new TestDatabaseManager()

      testDb.insertClipboardHistory({
        type: 'text',
        text: 'Just text',
        hashKey: 'hashText',
        createTime: '2024-01-01T00:00:00.000Z',
        lastReadTime: '2024-01-01T00:00:00.000Z',
      })

      const blob = testDb.getClipboardBlob('hashText')
      expect(blob).toBeNull()

      testDb.close()
    })
  })

  describe('getFullText', () => {
    it('should return full text for truncated items', () => {
      const testDb = new TestDatabaseManager()
      const longText = 'a'.repeat(TEXT_TRUNCATE_THRESHOLD + 5000)

      testDb.insertClipboardHistory({
        type: 'text',
        text: longText,
        hashKey: 'hashLong',
        createTime: '2024-01-01T00:00:00.000Z',
        lastReadTime: '2024-01-01T00:00:00.000Z',
      })

      // 列表查询返回截断的文本
      const listResults = testDb.listClipboardHistory({ size: 10 })
      expect(listResults[0].text.length).toBe(TEXT_TRUNCATE_THRESHOLD)
      expect(listResults[0].textTruncated).toBe(true)

      // getFullText 返回完整文本
      const fullText = testDb.getFullText('hashLong')
      expect(fullText).not.toBeNull()
      expect(fullText!.length).toBe(TEXT_TRUNCATE_THRESHOLD + 5000)
      expect(fullText).toBe(longText)

      testDb.close()
    })

    it('should return null for non-existent hash key', () => {
      const testDb = new TestDatabaseManager()

      const text = testDb.getFullText('non-existent-hash')
      expect(text).toBeNull()

      testDb.close()
    })
  })

  describe('cursor pagination edge cases', () => {
    it('should handle empty result set', () => {
      const testDb = new TestDatabaseManager()

      const results = testDb.listClipboardHistory({ size: 10 })
      expect(results).toHaveLength(0)

      testDb.close()
    })

    it('should handle cursor at the end of data', () => {
      const testDb = new TestDatabaseManager()

      testDb.insertClipboardHistory({
        type: 'text',
        text: 'Only item',
        hashKey: 'hash1',
        createTime: '2024-01-01T00:00:00.000Z',
        lastReadTime: '2024-01-01T00:00:00.000Z',
      })

      // 使用比所有数据都早的游标
      const results = testDb.listClipboardHistory({
        size: 10,
        cursor: '2023-01-01T00:00:00.000Z',
      })
      expect(results).toHaveLength(0)

      testDb.close()
    })

    it('should handle exact cursor match', () => {
      const testDb = new TestDatabaseManager()

      testDb.insertClipboardHistory({
        type: 'text',
        text: 'Item 1',
        hashKey: 'hash1',
        createTime: '2024-01-01T00:00:00.000Z',
        lastReadTime: '2024-01-01T00:00:00.000Z',
      })
      testDb.insertClipboardHistory({
        type: 'text',
        text: 'Item 2',
        hashKey: 'hash2',
        createTime: '2024-01-02T00:00:00.000Z',
        lastReadTime: '2024-01-02T00:00:00.000Z',
      })

      // 使用第二条的时间作为游标，应该只返回第一条
      const results = testDb.listClipboardHistory({
        size: 10,
        cursor: '2024-01-02T00:00:00.000Z',
      })
      expect(results).toHaveLength(1)
      expect(results[0].text).toBe('Item 1')

      testDb.close()
    })
  })
})
