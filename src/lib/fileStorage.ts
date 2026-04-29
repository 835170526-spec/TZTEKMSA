/**
 * fileStorage.ts
 * 使用 Supabase 持久化存储上传的 Excel 文件及分组信息，实现跨设备同步。
 *
 * ─── Supabase 一次性配置步骤 ───────────────────────────────────────────────
 * 1. 建表（在 Supabase > SQL Editor 执行）：
 *
 *    create table if not exists msa_groups (
 *      id          text primary key,
 *      name        text not null,
 *      created_at  bigint not null,
 *      "order"     int not null default 0
 *    );
 *
 *    create table if not exists msa_files (
 *      id           text primary key,
 *      file_name    text not null,
 *      uploaded_at  bigint not null,
 *      group_id     text not null default 'default',
 *      storage_path text not null
 *    );
 *
 * 2. 创建 Storage Bucket：在 Supabase > Storage 新建名为 msa-excel-files 的 Bucket，
 *    并为 anon 角色添加 SELECT / INSERT / DELETE 策略（详见 README）。
 *
 * 3. 配置环境变量（项目根目录新建 .env.local）：
 *    VITE_SUPABASE_URL=https://<your-project>.supabase.co
 *    VITE_SUPABASE_ANON_KEY=eyJ...
 * ───────────────────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase';

const BUCKET = 'msa-excel-files';

// ─── 类型 ────────────────────────────────────────────────────────────────────

export interface StoredFile {
  id: string;
  fileName: string;
  uploadedAt: number;
  buffer: ArrayBuffer;
  groupId: string;
}

export interface StoredGroup {
  id: string;
  name: string;
  createdAt: number;
  order: number;
}

// ─── 分组 CRUD ───────────────────────────────────────────────────────────────

/** 保存（新建或更新）分组，对应原 IndexedDB 的 put */
export async function saveGroupToDB(group: StoredGroup): Promise<StoredGroup> {
  const { error } = await supabase
    .from('msa_groups')
    .upsert({
      id:          group.id,
      name:        group.name,
      created_at:  group.createdAt,
      order:       group.order,
    });
  if (error) throw error;
  return group;
}

/** 读取所有分组，按 order 升序排列 */
export async function loadAllGroupsFromDB(): Promise<StoredGroup[]> {
  const { data, error } = await supabase
    .from('msa_groups')
    .select('*')
    .order('order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => ({
    id:        row.id,
    name:      row.name,
    createdAt: row.created_at,
    order:     row.order,
  }));
}

/** 删除分组 */
export async function deleteGroupFromDB(id: string): Promise<void> {
  const { error } = await supabase
    .from('msa_groups')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── 文件 CRUD ───────────────────────────────────────────────────────────────

/** 保存文件：上传到 Storage + 写入数据库元数据 */
export async function saveFileToDB(file: File, groupId = 'default'): Promise<StoredFile> {
  const id          = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const storagePath = `files/${id}-${file.name}`;
  const uploadedAt  = Date.now();

  // 1. 上传文件本体到 Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false });
  if (uploadError) throw uploadError;

  // 2. 写入元数据记录
  const { error: dbError } = await supabase.from('msa_files').insert({
    id,
    file_name:    file.name,
    uploaded_at:  uploadedAt,
    group_id:     groupId,
    storage_path: storagePath,
  });
  if (dbError) {
    // 数据库写入失败时，回滚已上传的文件
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw dbError;
  }

  // 3. 返回含 buffer 的记录（供调用方即时使用）
  const buffer = await file.arrayBuffer();
  return { id, fileName: file.name, uploadedAt, buffer, groupId };
}

/** 读取所有已保存文件（按上传时间升序） */
export async function loadAllFilesFromDB(): Promise<StoredFile[]> {
  // 1. 查询元数据
  const { data: rows, error: dbError } = await supabase
    .from('msa_files')
    .select('*')
    .order('uploaded_at', { ascending: true });
  if (dbError) throw dbError;
  if (!rows || rows.length === 0) return [];

  // 2. 并发下载每个文件内容
  const files = await Promise.all(
    rows.map(async row => {
      const { data: blob, error: dlError } = await supabase.storage
        .from(BUCKET)
        .download(row.storage_path);
      if (dlError || !blob) {
        console.warn(`[fileStorage] 下载失败: ${row.storage_path}`, dlError);
        return null;
      }
      const buffer = await blob.arrayBuffer();
      return {
        id:         row.id,
        fileName:   row.file_name,
        uploadedAt: row.uploaded_at,
        buffer,
        groupId:    row.group_id ?? 'default',
      };
    })
  );

  return files.filter((f): f is StoredFile => f !== null);
}

/** 更新文件所属分组 */
export async function moveFileToDB(fileId: string, newGroupId: string): Promise<void> {
  const { error } = await supabase
    .from('msa_files')
    .update({ group_id: newGroupId })
    .eq('id', fileId);
  if (error) throw error;
}

/** 删除文件：删除 Storage 对象 + 删除数据库记录 */
export async function deleteFileFromDB(id: string): Promise<void> {
  // 1. 查 storage_path
  const { data, error: fetchError } = await supabase
    .from('msa_files')
    .select('storage_path')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;

  // 2. 删除 Storage 中的文件
  if (data?.storage_path) {
    await supabase.storage.from(BUCKET).remove([data.storage_path]);
  }

  // 3. 删除数据库记录
  const { error: dbError } = await supabase
    .from('msa_files')
    .delete()
    .eq('id', id);
  if (dbError) throw dbError;
}

/** 清空所有文件 */
export async function clearAllFilesFromDB(): Promise<void> {
  // 1. 查所有 storage_path
  const { data, error: fetchError } = await supabase
    .from('msa_files')
    .select('storage_path');
  if (fetchError) throw fetchError;

  // 2. 删除 Storage 中的所有文件
  const paths = (data ?? [])
    .map(r => r.storage_path)
    .filter(Boolean) as string[];
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }

  // 3. 清空数据库记录
  const { error: dbError } = await supabase
    .from('msa_files')
    .delete()
    .neq('id', '');
  if (dbError) throw dbError;
}
