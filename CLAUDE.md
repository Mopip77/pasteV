# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PasteV is an Electron-based clipboard history manager for macOS with advanced features including regex search, image OCR, and LLM-powered automatic tagging. Built with:
- **Main Process**: Electron (TypeScript) - handles clipboard monitoring, database, OCR, AI processing
- **Renderer**: Next.js + React + Redux Toolkit + Tailwind CSS + shadcn/ui
- **Database**: better-sqlite3 with custom native bindings
- **Architecture**: Nextron framework (combines Next.js with Electron)

## Development Commands

### Core Development
```bash
# Start dev server (opens with DevTools)
npm run dev

# Build production app
npm run build

# Reinstall app dependencies (run after installing new dependencies)
npm run postinstall

# Rebuild native modules (required after better-sqlite3 changes or Node version updates)
npm run rebuild
```

### Native Module Handling
- After installing dependencies, run `npm run postinstall`
- If better-sqlite3 fails, run `npm run rebuild`
- Native binding path is configured in `main/db/db.ts` to load from `build/better_sqlite3.node`

## Architecture

### Process Separation (Electron)

**Main Process** (`main/`):
- `background.ts`: Entry point, initializes singletons, registers global shortcuts, manages window lifecycle
- Runs a 1-second polling daemon (`read-clipboard-daemon.ts`) to monitor clipboard changes
- All clipboard data flows through the singleton cache (`clipboardMemoCache.ts`)

**Renderer Process** (`renderer/`):
- Next.js app with pages: `home.tsx` (clipboard history), `settings.tsx`
- Communicates with main process via IPC handlers defined in `main/helpers/ipc-handlers.ts`

### Core Data Flow

1. **Clipboard Monitoring** (`read-clipboard-daemon.ts`):
   - Polls clipboard every 1 second
   - Generates hash key from content to detect duplicates
   - Filters text content exceeding 1MB (`MAX_STORED_TEXT_BYTE_LENGTH`)

2. **Clipboard Cache** (`clipboardMemoCache.ts`):
   - Maintains in-memory LRU cache (last 100 items)
   - Deduplicates by hash key
   - Updates `lastReadTime` for existing items (moves to top)
   - Triggers post-processing for new items

3. **Post-Processing Pipeline** (`clipboard-content-post-handler.ts`):
   - **Images**: Extract metadata → OCR → AI tagging (if enabled)
   - **Text**: Count words, store in details
   - All async operations don't block clipboard monitoring

4. **Database** (`db/db.ts`):
   - SQLite with WAL mode
   - Custom `regexp` function for regex search
   - Tables: `clipboard_history`, `tag_relation`
   - Indexes on `hash_key`, `last_read_time`, `type`

### Singletons Pattern

All core services are managed through `singletons.ts`:
- `db`: DatabaseManager
- `cache`: ClipboardMemoCache
- `settings`: Settings (electron-store)
- `shortcuts`: ShortcutManager (global shortcuts)

Initialize once in `background.ts` with `singletons.initSingletons()`.

### IPC Communication

**Renderer → Main** (defined in `ipc-handlers.ts`):
- `app:hide` - Hide window
- `app:toggleGlobalShortcuts` - Enable/disable shortcuts (prevents conflicts during typing)
- `clipboard:query` - Query clipboard history
- `clipboard:add` - Write to clipboard and optionally paste
- `tags:query` - Query available tags
- `setting:loadConfig` / `setting:saveConfig` - Settings management

**Main → Renderer**:
- `app:show` - Triggered when window becomes visible (sent via `webContents.send`)

### State Management

- **Redux Toolkit** for app settings (`appSettingConfigSlice.ts`)
- **React Context** for search filters (`SearchBodyContext` in `ClipboardHistory.tsx`)
- Settings persisted via electron-store, loaded on startup

### AI Features

**OCR** (`helpers/ocr.ts`):
- Extracts text from clipboard images
- Text stored in `clipboard_history.text` field

**Auto-Tagging** (`clipboard-content-post-handler.ts`):
- OpenAI integration for image classification
- Two modes: send compressed image or OCR text
- Generates up to 3 tags per image
- Tags stored in `tag_relation` table

## Key Technical Constraints

### Native Modules
- better-sqlite3 requires native compilation
- Custom binding path in `build/better_sqlite3.node`
- Must run `npm run rebuild` after Node version changes
- Sharp and PNG processing libs must be unasarred (see `electron-builder.yml`)

### Clipboard Handling
- macOS-specific: Uses AppleScript for paste (`osascript -e 'tell application "System Events"...`)
- 50ms delay before paste execution (`CLIPBOARD_PASTE_DELAY`)
- Hash-based deduplication prevents duplicate entries

### Window Management
- Frameless window (`frame: false`)
- Global shortcut to toggle (default: `Cmd+Shift+Option+V`)
- Auto-hide on blur in production
- Prevents close, only hides window
- `skipTaskbar: true` keeps it out of dock

### Database Schema
```sql
clipboard_history:
  - id (PRIMARY KEY)
  - type ('text' | 'image' | 'file')
  - text (TEXT) - for text content or OCR results
  - blob (BLOB) - for image data
  - hash_key (UNIQUE) - deduplication key
  - create_time (DATETIME)
  - last_read_time (DATETIME) - used for sorting
  - details (TEXT) - JSON string with metadata

tag_relation:
  - name (tag string)
  - clipboard_history_hash_key (foreign key)
```

## Common Patterns

### Adding New IPC Handlers
1. Define handler in `main/helpers/ipc-handlers.ts`
2. Use `ipcMain.handle` for async responses, `ipcMain.on` for fire-and-forget
3. Add TypeScript definition in `renderer/types/preload.d.ts`
4. Expose in `main/preload.ts` via `contextBridge`

### Querying Clipboard History
Always use regex safety check:
```typescript
if (queryBody.regex) {
  try {
    new RegExp(queryBody.keyword)
  } catch (error) {
    return [] // Invalid regex
  }
}
```

### Adding Settings
1. Update config interface in `main/components/settings.ts`
2. Add form fields in `renderer/pages/settings.tsx`
3. Use electron-store for persistence
4. Reload dependent services after save (e.g., shortcuts)

## Path Aliases
- `@/*` → `renderer/*` (configured in tsconfig.json)
- Main process uses relative imports

## Cleanup Mechanism
- Scheduled cleanup via `cleanup-scheduler.ts`
- Deletes records older than N days (configurable, default 30)
- Runs on app startup and on schedule
- Orphaned tags cleaned up automatically
