/**
 * Keep each PDF byte-range request modest enough for large architectural sets
 * while avoiding hundreds of tiny requests. pdf.js fetches only the chunks it
 * needs for the page being viewed and the document cross-reference table.
 */
export const PDF_RANGE_CHUNK_BYTES = 1024 * 1024;

export function pdfRangeLoadOptions(url: string) {
  return {
    url,
    rangeChunkSize: PDF_RANGE_CHUNK_BYTES,
    disableRange: false,
    disableStream: false,
    disableAutoFetch: false,
  } as const;
}
