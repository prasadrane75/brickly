import {
  AuditAction,
  AuditActorType,
  DocumentEntityType,
  DocumentKind,
  DocumentStatus,
  NotificationType,
  Prisma,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import { documentRepository } from "../../repositories/document.repository.js";
import { buildExtensionFields } from "../../shared/http/extensions.js";
import { ApiError } from "../../shared/http/apiError.js";
import { documentStorageService } from "../storage/document-storage.js";

type DocumentLinkTargetType = "PROPERTY" | "TRANSACTION" | "USER" | "ADMIN_NOTE";

type DocumentActor = {
  id: string;
  role: UserRole;
};

function buildDocumentResponse(document: Awaited<ReturnType<typeof documentRepository.findById>> extends infer T
  ? NonNullable<T>
  : never) {
  const metadata =
    document.metadata && typeof document.metadata === "object"
      ? (document.metadata as Record<string, unknown>)
      : {};

  const linkedEntityType =
    (metadata.linkTargetType as string | undefined) ??
    (document.tradeId
      ? "TRANSACTION"
      : document.propertyId
        ? "PROPERTY"
        : "USER");
  const linkedEntityId =
    (metadata.linkTargetId as string | undefined) ??
    document.tradeId ??
    document.propertyId ??
    null;

  return {
    id: document.id,
    entityType: document.entityType,
    kind: document.kind,
    status: document.status,
    fileName: document.fileName,
    fileUrl: document.fileUrl,
    mimeType: document.mimeType,
    fileSizeBytes: document.fileSizeBytes,
    propertyId: document.propertyId,
    tradeId: document.tradeId,
    buyOrderId: document.buyOrderId,
    sellOrderId: document.sellOrderId,
    uploadedBy: document.uploadedBy,
    property: document.property,
    trade: document.trade,
    createdAt: document.createdAt,
    metadata: document.metadata,
    linkedEntity: {
      type: linkedEntityType,
      id: linkedEntityId,
      label:
        linkedEntityType === "PROPERTY" && document.property
          ? `${document.property.address1}, ${document.property.city}, ${document.property.state}`
          : linkedEntityType === "TRANSACTION"
            ? `Trade ${document.tradeId ?? linkedEntityId ?? ""}`.trim()
            : linkedEntityType === "ADMIN_NOTE"
              ? String(metadata.adminNoteTitle ?? metadata.linkTargetId ?? "Admin note")
              : String(metadata.userLabel ?? metadata.linkTargetId ?? "User attachment"),
    },
    ...buildExtensionFields({
      verificationStatus: document.verificationStatus,
      blockchainTxHash: document.blockchainTxHash,
      aiSummaryCache: document.aiSummaryCache,
    }),
  };
}

function buildMetadataForLinkTarget(input: {
  linkTargetType: DocumentLinkTargetType;
  linkTargetId: string;
  notes?: string | null;
  originalFileName?: string;
  storageKey?: string;
}) {
  return {
    linkTargetType: input.linkTargetType,
    linkTargetId: input.linkTargetId,
    ...(input.linkTargetType === "ADMIN_NOTE"
      ? { adminNoteTitle: input.linkTargetId }
      : {}),
    ...(input.linkTargetType === "USER"
      ? { userLabel: input.linkTargetId }
      : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.originalFileName ? { originalFileName: input.originalFileName } : {}),
    ...(input.storageKey ? { storageKey: input.storageKey } : {}),
  } satisfies Record<string, unknown>;
}

function resolveDocumentEntity(linkTargetType: DocumentLinkTargetType) {
  switch (linkTargetType) {
    case "PROPERTY":
      return DocumentEntityType.PROPERTY;
    case "TRANSACTION":
      return DocumentEntityType.TRANSACTION;
    case "USER":
    case "ADMIN_NOTE":
      // Phase 1 keeps user/admin-note attachments in the existing metadata model.
      // A dedicated admin-note entity can be introduced later without changing the
      // upload/listing API surface.
      return DocumentEntityType.USER;
    default:
      return DocumentEntityType.USER;
  }
}

function ensureDocumentWriteAllowed(actor: DocumentActor, linkTargetType: DocumentLinkTargetType) {
  if (actor.role === UserRole.ADMIN || actor.role === UserRole.LISTER) {
    return;
  }

  if (actor.role === UserRole.INVESTOR && linkTargetType === "USER") {
    return;
  }

  throw new ApiError(
    403,
    "FORBIDDEN",
    "You are not allowed to upload documents for this entity type"
  );
}

export const documentService = {
  async list(
    filters: {
      propertyId?: string;
      tradeId?: string;
      buyOrderId?: string;
      sellOrderId?: string;
      userId?: string;
      adminNoteKey?: string;
      entityType?: string;
      status?: string;
      kind?: string;
    },
    pagination: { skip: number; take: number; page: number; pageSize: number }
  ) {
    const andFilters: Prisma.DocumentWhereInput[] = [];

    if (filters.userId) {
      andFilters.push({
        metadata: {
          path: ["linkTargetType"],
          equals: "USER",
        },
      });
      andFilters.push({
        metadata: {
          path: ["linkTargetId"],
          equals: filters.userId,
        },
      });
    }

    if (filters.adminNoteKey) {
      andFilters.push({
        metadata: {
          path: ["linkTargetType"],
          equals: "ADMIN_NOTE",
        },
      });
      andFilters.push({
        metadata: {
          path: ["linkTargetId"],
          equals: filters.adminNoteKey,
        },
      });
    }

    const where: Prisma.DocumentWhereInput = {
      propertyId: filters.propertyId,
      tradeId: filters.tradeId,
      buyOrderId: filters.buyOrderId,
      sellOrderId: filters.sellOrderId,
      entityType: (filters.entityType as any) || undefined,
      status: (filters.status as any) || undefined,
      kind: (filters.kind as any) || undefined,
      ...(andFilters.length ? { AND: andFilters } : {}),
    };

    const [total, documents] = await Promise.all([
      documentRepository.count(where),
      documentRepository.findMany(where, pagination.skip, pagination.take),
    ]);

    return {
      total,
      items: documents.map((document) => buildDocumentResponse(document)),
    };
  },

  async createMetadata(userId: string, payload: Prisma.DocumentUncheckedCreateInput) {
    const document = await documentRepository.create({
      ...payload,
      uploadedByUserId: userId,
    });
    await Promise.all([
      documentRepository.createNotification({
        userId,
        propertyId: document.propertyId,
        sellOrderId: document.sellOrderId,
        type: NotificationType.DOCUMENT,
        message: `Document uploaded: ${document.fileName}.`,
      }),
      documentRepository.createAuditLog({
        actorUserId: userId,
        actorType: AuditActorType.USER,
        action: AuditAction.CREATE,
        entityType: "DOCUMENT",
        entityId: document.id,
        propertyId: document.propertyId,
        tradeId: document.tradeId,
        metadata: {
          event: "document_uploaded",
          fileName: document.fileName,
          kind: document.kind,
          status: document.status,
        },
      }),
    ]);
    const hydrated = await documentRepository.findById(document.id);
    if (!hydrated) {
      throw new ApiError(500, "DOCUMENT_CREATE_FAILED", "Document could not be loaded");
    }
    return buildDocumentResponse(hydrated);
  },

  async uploadStub(
    actor: DocumentActor,
    payload: {
      fileName: string;
      mimeType?: string | null;
      fileSizeBytes?: number | null;
      kind: DocumentKind;
      status?: DocumentStatus;
      verificationStatus?: VerificationStatus;
      linkTarget: {
        type: DocumentLinkTargetType;
        id: string;
      };
      propertyId?: string;
      tradeId?: string;
      buyOrderId?: string;
      sellOrderId?: string;
      notes?: string | null;
    }
  ) {
    ensureDocumentWriteAllowed(actor, payload.linkTarget.type);

    if (payload.linkTarget.type === "PROPERTY" && !payload.propertyId) {
      throw new ApiError(400, "VALIDATION_ERROR", "Property uploads require propertyId");
    }

    if (payload.linkTarget.type === "TRANSACTION" && !payload.tradeId) {
      throw new ApiError(400, "VALIDATION_ERROR", "Transaction uploads require tradeId");
    }

    const storage = await documentStorageService.saveUploadStub({
      fileName: payload.fileName,
      mimeType: payload.mimeType ?? null,
      fileSizeBytes: payload.fileSizeBytes ?? null,
      uploadedByUserId: actor.id,
      linkTarget: payload.linkTarget,
      kind: payload.kind,
      notes: payload.notes ?? null,
    });

    const document = await documentRepository.create({
      uploadedByUserId: actor.id,
      entityType: resolveDocumentEntity(payload.linkTarget.type),
      kind: payload.kind,
      status: payload.status ?? DocumentStatus.ACTIVE,
      verificationStatus: payload.verificationStatus ?? VerificationStatus.PENDING,
      fileName: payload.fileName,
      fileUrl: storage.fileUrl,
      mimeType: payload.mimeType ?? null,
      fileSizeBytes: payload.fileSizeBytes ?? null,
      propertyId: payload.propertyId,
      tradeId: payload.tradeId,
      buyOrderId: payload.buyOrderId,
      sellOrderId: payload.sellOrderId,
      metadata: buildMetadataForLinkTarget({
        linkTargetType: payload.linkTarget.type,
        linkTargetId: payload.linkTarget.id,
        notes: payload.notes ?? null,
        originalFileName: payload.fileName,
        storageKey: storage.storageKey,
      }),
      // PHASE_2_AI: extracted text, risk flags, and cached summaries should be
      // attached through aiSummaryCache/metadata, not by changing the upload API.
    });

    const actorType =
      actor.role === UserRole.ADMIN ? AuditActorType.ADMIN : AuditActorType.USER;

    await Promise.all([
      documentRepository.createNotification({
        userId: actor.id,
        propertyId: document.propertyId,
        sellOrderId: document.sellOrderId,
        type: NotificationType.DOCUMENT,
        message: `Document uploaded: ${document.fileName} linked to ${payload.linkTarget.type.toLowerCase().replaceAll("_", " ")} ${payload.linkTarget.id}.`,
      }),
      documentRepository.createAuditLog({
        actorUserId: actor.id,
        actorType,
        action: AuditAction.CREATE,
        entityType: "DOCUMENT",
        entityId: document.id,
        targetUserId: payload.linkTarget.type === "USER" ? payload.linkTarget.id : null,
        propertyId: document.propertyId,
        tradeId: document.tradeId,
        metadata: {
          event: "document_uploaded",
          linkTargetType: payload.linkTarget.type,
          linkTargetId: payload.linkTarget.id,
          fileName: document.fileName,
          kind: document.kind,
          status: document.status,
        },
      }),
      ...(actor.role === UserRole.ADMIN
        ? [
            documentRepository.createNotification({
              userId: actor.id,
              propertyId: document.propertyId,
              sellOrderId: document.sellOrderId,
              type: NotificationType.SYSTEM,
              message: `Admin action recorded: uploaded ${document.fileName} and wrote an audit entry.`,
            }),
          ]
        : []),
    ]);

    const hydrated = await documentRepository.findById(document.id);
    if (!hydrated) {
      throw new ApiError(500, "DOCUMENT_CREATE_FAILED", "Document could not be loaded");
    }

    return buildDocumentResponse(hydrated);
  },
};
