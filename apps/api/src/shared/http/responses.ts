import type express from "express";

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function buildPaginationMeta(input: {
  page: number;
  pageSize: number;
  total: number;
}) {
  return {
    page: input.page,
    pageSize: input.pageSize,
    total: input.total,
    totalPages: Math.max(1, Math.ceil(input.total / input.pageSize)),
  };
}

export function sendSuccess<T>(
  res: express.Response,
  data: T,
  meta?: Record<string, unknown>
) {
  return res.json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function sendCreated<T>(
  res: express.Response,
  data: T,
  meta?: Record<string, unknown>
) {
  return res.status(201).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function sendPaginated<T>(
  res: express.Response,
  data: T[],
  pagination: PaginationMeta,
  meta?: Record<string, unknown>
) {
  return res.json({
    success: true,
    data,
    meta: {
      pagination,
      ...(meta ?? {}),
    },
  });
}
