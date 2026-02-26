/**
 * Database datetime utilities — ローカル時刻ベース
 *
 * SQLite の datetime('now') は UTC を返すため、ローカル日付フィルター
 * (DATE(created_at) = getTodayString()) と不一致が生じる。
 * DB に保存する時刻は必ずこのユーティリティを使用すること。
 *
 * ⚠️ datetime('now') の直接使用は禁止
 */

/**
 * DB保存用のローカル時刻文字列を返す (YYYY-MM-DD HH:MM:SS)
 * SQLiteの DATE() 関数で正しくローカル日付が抽出される形式。
 */
export function getLocalDatetime(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${h}:${m}:${s}`;
}

/**
 * ローカル日付文字列を返す (YYYY-MM-DD)
 * DailyManager.getTodayString() と同じロジック。
 */
export function getTodayString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
