import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { env } from "../../config/env.js";

const uploadsRoot = path.resolve(process.cwd(), "apps/api/dev-uploads");
const documentsRoot = path.join(uploadsRoot, "documents");

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

export const documentStorageService = {
  getPublicRoot() {
    return uploadsRoot;
  },

  async saveUploadStub(input: {
    fileName: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    uploadedByUserId: string;
    linkTarget: { type: string; id: string };
    kind: string;
    notes?: string | null;
  }) {
    const dateSegment = new Date().toISOString().slice(0, 10);
    const id = crypto.randomUUID();
    const baseName = sanitizeSegment(input.fileName.replace(/\.[^.]+$/, "")) || "document";
    const relativeFilePath = path.join("documents", dateSegment, `${baseName}-${id}.json`);
    const absoluteFilePath = path.join(uploadsRoot, relativeFilePath);

    await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
    await fs.writeFile(
      absoluteFilePath,
      JSON.stringify(
        {
          phase: "phase-1-document-stub",
          generatedAt: new Date().toISOString(),
          originalFileName: input.fileName,
          mimeType: input.mimeType ?? null,
          fileSizeBytes: input.fileSizeBytes ?? null,
          uploadedByUserId: input.uploadedByUserId,
          kind: input.kind,
          linkTarget: input.linkTarget,
          notes: input.notes ?? null,
          // PHASE_2_AI: document text extraction and summarization artifacts should
          // be attached alongside this storage record rather than changing callers.
        },
        null,
        2
      ),
      "utf8"
    );

    return {
      storageKey: relativeFilePath.replaceAll(path.sep, "/"),
      fileUrl: `${env.apiBaseUrl}/dev-uploads/${relativeFilePath.replaceAll(path.sep, "/")}`,
    };
  },
};
