import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { env } from "../../config/env.js";

const uploadsRoot = path.resolve(process.cwd(), "apps/api/dev-uploads");
const documentsRoot = path.join(uploadsRoot, "documents");

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function buildSimplePdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 780 Td",
    ...lines.flatMap((line, index) =>
      index === 0
        ? [`(${escapePdfText(line)}) Tj`]
        : ["0 -24 Td", `(${escapePdfText(line)}) Tj`]
    ),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return pdf;
}

async function writePdf(relativeFilePath: string, lines: string[]) {
  const absoluteFilePath = path.join(uploadsRoot, relativeFilePath);
  await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
  await fs.writeFile(absoluteFilePath, buildSimplePdf(lines), "utf8");
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
    const isPdf =
      input.mimeType === "application/pdf" || input.fileName.toLowerCase().endsWith(".pdf");
    const relativeFilePath = path.join(
      "documents",
      dateSegment,
      `${baseName}-${id}.${isPdf ? "pdf" : "json"}`
    );
    const absoluteFilePath = path.join(uploadsRoot, relativeFilePath);

    await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
    if (isPdf) {
      await writePdf(relativeFilePath, [
        "Brickly Document Placeholder",
        `Original file: ${input.fileName}`,
        `Kind: ${input.kind}`,
        `Linked to: ${input.linkTarget.type} ${input.linkTarget.id}`,
        `Generated: ${new Date().toISOString()}`,
      ]);
    } else {
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
    }

    return {
      storageKey: relativeFilePath.replaceAll(path.sep, "/"),
      fileUrl: `${env.apiBaseUrl}/dev-uploads/${relativeFilePath.replaceAll(path.sep, "/")}`,
    };
  },

  async saveGeneratedPdf(input: {
    fileName: string;
    lines: string[];
  }) {
    const dateSegment = new Date().toISOString().slice(0, 10);
    const id = crypto.randomUUID();
    const baseName = sanitizeSegment(input.fileName.replace(/\.[^.]+$/, "")) || "document";
    const relativeFilePath = path.join("documents", dateSegment, `${baseName}-${id}.pdf`);

    await writePdf(relativeFilePath, input.lines);

    return {
      storageKey: relativeFilePath.replaceAll(path.sep, "/"),
      fileUrl: `${env.apiBaseUrl}/dev-uploads/${relativeFilePath.replaceAll(path.sep, "/")}`,
    };
  },
};
