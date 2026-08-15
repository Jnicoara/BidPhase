import { describe, expect, it } from "vitest";
import {
  PDF_RANGE_CHUNK_BYTES,
  pdfRangeLoadOptions,
} from "@shared/pdfRangeLoading";

describe("pdfRangeLoadOptions", () => {
  it("keeps range and streaming enabled for a storage-backed PDF URL", () => {
    expect(pdfRangeLoadOptions("/manus-storage/plans/example.pdf")).toEqual({
      url: "/manus-storage/plans/example.pdf",
      rangeChunkSize: 1024 * 1024,
      disableRange: false,
      disableStream: false,
      disableAutoFetch: false,
    });
  });

  it("uses a one-megabyte request chunk", () => {
    expect(PDF_RANGE_CHUNK_BYTES).toBe(1024 * 1024);
  });
});
