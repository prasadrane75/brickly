import { Prisma } from "@prisma/client";
import { clampSummary } from "../formatters/summary.js";

export type DocumentSummaryPayload = {
  id: string;
  fileName: string;
  kind: string;
  status: string;
  createdAt: Date;
  fileUrl: string;
  metadata: Prisma.JsonValue | null;
  property?: { address1: string; city: string; state: string } | null;
};

export function buildDocumentSummaryPrompt(document: DocumentSummaryPayload) {
  return JSON.stringify(
    {
      document: {
        id: document.id,
        fileName: document.fileName,
        kind: document.kind,
        status: document.status,
        createdAt: document.createdAt.toISOString(),
        fileUrl: document.fileUrl,
      },
      property: document.property
        ? {
            address1: document.property.address1,
            city: document.property.city,
            state: document.property.state,
          }
        : null,
      metadata: document.metadata,
    },
    null,
    2
  );
}

export function buildDocumentSummaryFallback(document: DocumentSummaryPayload) {
  const metadata =
    document.metadata && typeof document.metadata === "object"
      ? (document.metadata as Record<string, unknown>)
      : {};
  const notes = typeof metadata.notes === "string" ? metadata.notes.trim() : "";
  const linkedLabel = document.property
    ? `${document.property.address1}, ${document.property.city}, ${document.property.state}`
    : "the linked operational record";

  return {
    summary: clampSummary(
      `${document.fileName} is a ${document.kind.replaceAll("_", " ").toLowerCase()} document currently marked ${document.status.toLowerCase()} and linked to ${linkedLabel}.${notes ? ` Notes indicate: ${notes}` : " No extracted body text is stored yet, so this summary is based on metadata only."}`
    ),
    keyPoints: [
      `${document.kind.replaceAll("_", " ")} document`,
      `Status: ${document.status}`,
      `Linked to ${linkedLabel}`,
    ],
    keyDates: [`Created ${document.createdAt.toISOString().slice(0, 10)}`],
    potentialRisks: notes
      ? ["Summary is metadata-driven and may miss body-text details."]
      : ["No extractable body text is stored, so only metadata could be summarized."],
    actionItems: notes ? ["Review attached notes alongside the document."] : [],
  };
}

export function getDocumentSummaryInstructions() {
  return [
    "Summarize the document for operations and investor review.",
    "Keep it grounded only in supplied metadata and available text context.",
    "If no body text is available, explicitly keep the result metadata-driven.",
    "Return valid JSON with keys: summary, keyPoints, keyDates, potentialRisks, actionItems.",
    "Each list field should be an array of short strings.",
  ].join(" ");
}
