/**
 * fileStorage.ts
 * 使用 IndexedDB 持久化存储上传的 Excel 文件（ArrayBuffer）及分组信息，
 * 页面刷新后仍可自动恢复。
 */

const DB_NAME = 'msa-dashboard-db';
const DB_VERSION = 2;           // 升级到 v2，新增 groups store
const STORE_FILES  = 'excel-files';
const STORE_GROUPS = 'groups';

// ─── 类型 ────────────────────────────────────────────────────────────────────

export interface StoredFile {
  id: string;
  fileName: string;
  uploadedAt: number;
  buffer: ArrayBuffer;
  groupId: string;    // 所属分组 id，默认 'default'
}

export interface StoredGroup {
  id: string;
  name: string;
  createdAt: number;
  order: number;      // 排序权重
}

// ─── DB ──────────────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      // v1: excel-files store
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }

      // v2: groups store
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_GROUPS)) {
          db.createObjectStore(STORE_GROUPS, { keyPath: 'id' });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

// ─── 分组 CRUD ───────────────────────────────────────────────────────────────

export async function saveGroupToDB(group: StoredGroup): Promise<StoredGroup> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_GROUPS, 'readwrite');
    const req = tx.objectStore(STORE_GROUPS).put(group);
    req.onsuccess = () => resolve(group);
    req.onerror   = () => reject(req.error);
  });
}

export async function loadAllGroupsFromDB(): Promise<StoredGroup[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_GROUPS, 'readonly');
    const req = tx.objectStore(STORE_GROUPS).getAll();
    req.onsuccess = () => {
      const all: StoredGroup[] = req.result ?? [];
      all.sort((a, b) => a.order - b.order);
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteGroupFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_GROUPS, 'readwrite');
    const req = tx.objectStore(STORE_GROUPS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ─── 文件 CRUD ───────────────────────────────────────────────────────────────

/** 保存一个文件到 IndexedDB，返回分配的 id */
export async function saveFileToDB(file: File, groupId = 'default'): Promise<StoredFile> {
  const db     = await openDB();
  const buffer = await file.arrayBuffer();
  const id     = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const record: StoredFile = {
    id,
    fileName: file.name,
    uploadedAt: Date.now(),
    buffer,
    groupId,
  };

  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_FILES, 'readwrite');
    const req = tx.objectStore(STORE_FILES).put(record);
    req.onsuccess = () => resolve(record);
    req.onerror   = () => reject(req.error);
  });
}

/** 读取所有已保存文件（按上传时间升序） */
export async function loadAllFilesFromDB(): Promise<StoredFile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_FILES, 'readonly');
    const req = tx.objectStore(STORE_FILES).getAll();
    req.onsuccess = () => {
      const all: StoredFile[] = req.result ?? [];
      // 兼容旧数据（无 groupId）
      all.forEach(f => { if (!f.groupId) f.groupId = 'default'; });
      all.sort((a, b) => a.uploadedAt - b.uploadedAt);
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

/** 更新文件所属分组 */
export async function moveFileToDB(fileId: string, newGroupId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const getReq = store.get(fileId);
    getReq.onsuccess = () => {
      const record: StoredFile = getReq.result;
      if (!record) { resolve(); return; }
      record.groupId = newGroupId;
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror   = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/** 删除指定 id 的文件 */
export async function deleteFileFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_FILES, 'readwrite');
    const req = tx.objectStore(STORE_FILES).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** 清空所有文件 */
export async function clearAllFilesFromDB(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_FILES, 'readwrite');
    const req = tx.objectStore(STORE_FILES).clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
