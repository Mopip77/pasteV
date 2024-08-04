import { join } from 'node:path'
import Database from "better-sqlite3/lib/database";
import { app } from "electron";

class DatabaseManager {

    private db: Database | undefined = undefined

    constructor() {
    }

    public init() {
        const databasePath = join(app.getPath('userData'), 'clipboard.db');
        console.log('Init database...', databasePath);
        try {
            this.db = new Database(databasePath, { verbose: console.log });
        } catch (e) {
            console.error("create database failed", e);
            return;
        }
        this.db.pragma('journal_mode = WAL');

        this.db.exec(`
            CREATE TABLE clipboard_history (
                id BIGINT,
                type VARCHAR(5),
                text TEXT,
                blob BLOB,
                create_time TEXT,
                last_read_time TEXT
            );
        `)
    }

    public insertClipboard    

}

export default DatabaseManager