import { db } from "@/server/db";
import { auditLogs } from "@/server/db/schema";

type AuditMetadata =
  | string
  | number
  | boolean
  | null
  | AuditMetadata[]
  | { [key: string]: AuditMetadata };

type AuditInput = {
  action: string;
  entityType?: string;
  entityId?: number;
  summary: string;
  metadata?: AuditMetadata;
  headers?: Headers;
};

const firstHeaderValue = (value: string | null) => {
  const firstValue = value?.split(",").at(0)?.trim();
  return firstValue === "" ? null : (firstValue ?? null);
};

export const getAuditRequestContext = (headers?: Headers) => ({
  ipAddress:
    firstHeaderValue(headers?.get("x-forwarded-for") ?? null) ??
    headers?.get("x-real-ip") ??
    headers?.get("cf-connecting-ip") ??
    null,
  userAgent: headers?.get("user-agent") ?? null,
});

export const writeAuditLog = async ({
  action,
  entityType,
  entityId,
  summary,
  metadata,
  headers,
}: AuditInput) => {
  const { ipAddress, userAgent } = getAuditRequestContext(headers);

  try {
    await db.insert(auditLogs).values({
      action,
      entityType,
      entityId,
      summary,
      ipAddress,
      userAgent,
      metadata: metadata === undefined ? null : JSON.stringify(metadata),
    });
  } catch (error) {
    console.error("[audit] Failed to write audit log", error);
  }
};
