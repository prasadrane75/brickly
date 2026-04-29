import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export const aiRepository = {
  createRequest(data: Prisma.AiRequestUncheckedCreateInput) {
    return prisma.aiRequest.create({ data });
  },

  findLatestValidByCacheKey(cacheKey: string) {
    return prisma.aiRequest.findFirst({
      where: {
        cacheKey,
        status: "COMPLETED",
        cacheValidUntil: {
          gt: new Date(),
        },
        response: {
          isNot: null,
        },
      },
      include: {
        response: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  completeRequest(
    requestId: string,
    input: {
      provider: string;
      model: string;
      cacheValidUntil?: Date | null;
      errorMessage?: string | null;
      rawResponse?: Prisma.InputJsonValue;
      formattedResponse?: Prisma.InputJsonValue;
      renderedText?: string | null;
    }
  ) {
    return prisma.aiRequest.update({
      where: { id: requestId },
      data: {
        status: "COMPLETED",
        provider: input.provider,
        model: input.model,
        cacheValidUntil: input.cacheValidUntil ?? null,
        errorMessage: input.errorMessage ?? null,
        completedAt: new Date(),
        response: {
          create: {
            rawResponse: input.rawResponse,
            formattedResponse: input.formattedResponse,
            renderedText: input.renderedText ?? null,
          },
        },
      },
    });
  },

  failRequest(requestId: string, input: { errorMessage: string; provider: string; model: string }) {
    return prisma.aiRequest.update({
      where: { id: requestId },
      data: {
        status: "FAILED",
        provider: input.provider,
        model: input.model,
        errorMessage: input.errorMessage,
        completedAt: new Date(),
      },
    });
  },
};
