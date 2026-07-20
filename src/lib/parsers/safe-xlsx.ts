import { Worker } from "node:worker_threads";
import path from "node:path";

/**
 * Parses an XLSX buffer in an isolated worker thread with a hard timeout, so a
 * ReDoS-triggering file (xlsx has no fix for GHSA-5pgg-2g8v-p4x9) can only hang
 * one disposable worker, never the request-handling process. Output is plain
 * string arrays only — the worker never forwards live xlsx objects across the
 * boundary, containing the prototype-pollution advisory too.
 */
export function parseXlsxSafely(buffer: Buffer, timeoutMs = 8000): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "xlsx-worker.cjs"), {
      workerData: { bufferBase64: buffer.toString("base64") },
    });

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`xlsx parse exceeded ${timeoutMs}ms — file quarantined, not parsed`));
    }, timeoutMs);

    worker.once("message", (msg: { ok: boolean; rows?: string[][]; error?: string }) => {
      clearTimeout(timer);
      worker.terminate();
      if (msg.ok && msg.rows) resolve(msg.rows);
      else reject(new Error(msg.error ?? "xlsx worker failed"));
    });

    worker.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
