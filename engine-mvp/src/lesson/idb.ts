// Twenty lines of IndexedDB: one store, get and put by key. Enough for one lesson per browser until
// the Laravel API saves lessons on the server (the same JSON goes there).
const DB = 'hp-studio'
const STORE = 'lessons'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

export const idbGet = <T>(key: string) => run<T | undefined>('readonly', (s) => s.get(key))
export const idbPut = (key: string, value: unknown) => run('readwrite', (s) => s.put(value, key))
export const idbDelete = (key: string) => run('readwrite', (s) => s.delete(key))
