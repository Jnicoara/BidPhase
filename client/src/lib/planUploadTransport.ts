/**
 * The two ways a plan PDF gets to storage, and the rule for choosing between
 * them.
 *
 * ── Two paths, one preferred ─────────────────────────────────────────────────
 *   direct  browser PUTs straight to storage with a presigned URL. No size
 *           ceiling, nothing buffered on our server, real progress. This is the
 *           path the app is designed around.
 *   proxy   browser POSTs to our own origin and the server forwards the bytes.
 *           Capped by the platform's request body limit, so it is a fallback.
 *
 * `direct` is always tried first. `proxy` is used only when direct fails having
 * transferred ZERO bytes — the `blocked` diagnosis, which means the request was
 * refused before its body was read. In practice that is a storage bucket with
 * no CORS rule for this origin: a cross-origin PUT is always preflighted, and a
 * refused preflight fails at any file size, every time, forever.
 *
 * ── Why fall back rather than just switching ─────────────────────────────────
 * Routing everything through the server would work today and quietly give up
 * the size ceiling the direct path exists to provide. Falling back keeps the
 * good path primary, so the day the bucket's CORS rule is added the app returns
 * to it on its own with nothing to remember to change. The cost is one refused
 * preflight per upload, which is milliseconds.
 *
 * A failure that is NOT `blocked` is never retried through the proxy. A dropped
 * connection, a stall or an HTTP rejection are all things the fallback would
 * hit too, and retrying a large file through a smaller pipe turns one honest
 * error into two.
 */
import {
  UPLOAD_STALL_SECONDS,
  diagnoseUploadFailure,
  type UploadFailureKind,
} from "@shared/uploadDiagnosis";

/** An upload error that remembers what kind of failure it was. */
export type UploadError = Error & {
  kind: UploadFailureKind;
  detail: string | null;
  /** The transfer itself, when there was a response to read. */
  xhr?: XMLHttpRequest;
};

function uploadError(
  attempt: Parameters<typeof diagnoseUploadFailure>[0],
  xhr?: XMLHttpRequest
): UploadError {
  const failure = diagnoseUploadFailure(attempt);
  const error = new Error(failure.message) as UploadError;
  error.kind = failure.kind;
  error.detail = failure.detail;
  error.xhr = xhr;
  return error;
}

export type TransferHandle = {
  /** Bytes confirmed sent, for the progress bar. */
  onProgress: (bytesSent: number) => void;
  /** Receives the XHR so the cancel button can abort it. */
  onStart?: (xhr: XMLHttpRequest) => void;
};

/**
 * Send a file with XMLHttpRequest, reporting progress and diagnosing failure.
 *
 * XHR rather than fetch because fetch cannot report upload progress, and a
 * multi-minute transfer with no feedback is indistinguishable from a hang.
 *
 * The stall watchdog measures SILENCE, not total duration — see
 * UPLOAD_STALL_SECONDS. A 500MB set on a site connection is a legitimately long
 * request, and `xhr.timeout` would cancel exactly the uploads the app raised
 * its limit to support.
 */
function send({
  method,
  url,
  file,
  contentType,
  handle,
}: {
  method: "PUT" | "POST";
  url: string;
  file: File;
  contentType: string;
  handle: TransferHandle;
}): Promise<XMLHttpRequest> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    handle.onStart?.(xhr);

    let bytesSent = 0;
    let stalled = false;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;

    const armStall = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        stalled = true;
        xhr.abort();
        reject(
          uploadError({
            filename: file.name,
            byteSize: file.size,
            bytesSent,
            reason: "stall",
            stalledAfterSeconds: UPLOAD_STALL_SECONDS,
            online: navigator.onLine,
          })
        );
      }, UPLOAD_STALL_SECONDS * 1000);
    };

    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = event => {
      if (!event.lengthComputable) return;
      bytesSent = event.loaded;
      handle.onProgress(event.loaded);
      armStall();
    };

    xhr.onload = () => {
      clearTimeout(stallTimer);
      if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr);
      reject(
        uploadError(
          {
            filename: file.name,
            byteSize: file.size,
            bytesSent,
            status: xhr.status,
            reason: "status",
          },
          xhr
        )
      );
    };

    xhr.onerror = () =>
      reject(
        uploadError({
          filename: file.name,
          byteSize: file.size,
          bytesSent,
          status: xhr.status,
          reason: "error",
          online: navigator.onLine,
        })
      );

    xhr.onabort = () => {
      if (stalled) return; // already reported as a stall
      clearTimeout(stallTimer);
      reject(
        uploadError({
          filename: file.name,
          byteSize: file.size,
          bytesSent,
          reason: "abort",
        })
      );
    };

    armStall();
    xhr.send(file);
  });
}

/** Straight to storage with a presigned URL. The preferred path. */
export async function putDirectToStorage(
  uploadUrl: string,
  file: File,
  handle: TransferHandle
): Promise<void> {
  await send({
    method: "PUT",
    url: uploadUrl,
    file,
    contentType: "application/pdf",
    handle,
  });
}

/**
 * Through our own server. Used only when the direct PUT was blocked.
 *
 * Returns the storage key the server produced, which the caller then hands to
 * `confirmAttach` — the same second step the direct path uses, so both converge
 * on one place that records a sheet.
 */
export async function postViaServer(
  bidId: number,
  file: File,
  handle: TransferHandle
): Promise<string> {
  const url =
    `/api/plan-upload?bidId=${encodeURIComponent(bidId)}` +
    `&filename=${encodeURIComponent(file.name)}`;

  let xhr: XMLHttpRequest;
  try {
    xhr = await send({
      method: "POST",
      url,
      file,
      contentType: "application/pdf",
      handle,
    });
  } catch (raw) {
    const error = raw as UploadError;
    // Our own route answers refusals as JSON with a real sentence — the size
    // cap especially, which explains that the file is NOT too large for the app
    // and must not be split. `send` built its message from the bare status,
    // which is right for an opaque S3 403 and wrong here, so the server's own
    // words win when it supplied any.
    const supplied = error.xhr ? serverMessageFrom(error.xhr) : null;
    if (supplied) error.message = supplied;
    throw error;
  }

  const body = JSON.parse(xhr.responseText || "{}") as { storageKey?: string };
  if (!body.storageKey) {
    throw new Error(
      "The upload finished but storage did not say where it went, so nothing was attached."
    );
  }
  return body.storageKey;
}

/**
 * Read the server's own message out of a failed proxy upload.
 *
 * Returns null when the body is not ours to read — an infrastructure error page
 * cut in ahead of the handler, for instance — so the caller keeps the status
 * message rather than showing a fragment of HTML.
 */
export function serverMessageFrom(xhr: XMLHttpRequest): string | null {
  try {
    const body = JSON.parse(xhr.responseText || "{}") as { message?: string };
    return typeof body.message === "string" && body.message
      ? body.message
      : null;
  } catch {
    return null;
  }
}
