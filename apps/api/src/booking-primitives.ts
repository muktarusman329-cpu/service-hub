export type BookingState = "REQUESTED" | "QUOTED" | "ACCEPTED" | "TECHNICIAN_EN_ROUTE" | "IN_PROGRESS" | "COMPLETED_PENDING_CONFIRMATION" | "COMPLETED" | "CANCELLED_BY_USER" | "CANCELLED_BY_TECHNICIAN" | "EXPIRED" | "DISPUTED";
export type BookingActor = "USER" | "TECHNICIAN" | "ADMIN" | "SYSTEM";

const transitions: Partial<Record<BookingState, Partial<Record<BookingState, BookingActor[]>>>> = {
  REQUESTED: { QUOTED: ["SYSTEM"], CANCELLED_BY_USER: ["USER"], CANCELLED_BY_TECHNICIAN: ["TECHNICIAN"], EXPIRED: ["SYSTEM"] },
  QUOTED: { ACCEPTED: ["USER"], CANCELLED_BY_USER: ["USER"], CANCELLED_BY_TECHNICIAN: ["TECHNICIAN"], EXPIRED: ["SYSTEM"] },
  ACCEPTED: { TECHNICIAN_EN_ROUTE: ["TECHNICIAN"], CANCELLED_BY_USER: ["USER"], CANCELLED_BY_TECHNICIAN: ["TECHNICIAN"] },
  TECHNICIAN_EN_ROUTE: { IN_PROGRESS: ["TECHNICIAN"], CANCELLED_BY_USER: ["USER"], CANCELLED_BY_TECHNICIAN: ["TECHNICIAN"] },
  IN_PROGRESS: { COMPLETED_PENDING_CONFIRMATION: ["TECHNICIAN"], CANCELLED_BY_USER: ["USER"], CANCELLED_BY_TECHNICIAN: ["TECHNICIAN"] },
  COMPLETED_PENDING_CONFIRMATION: { COMPLETED: ["USER", "SYSTEM"], DISPUTED: ["USER"], CANCELLED_BY_USER: ["USER"], CANCELLED_BY_TECHNICIAN: ["TECHNICIAN"] }
};

const reasonRequired = new Set<BookingState>(["CANCELLED_BY_USER", "CANCELLED_BY_TECHNICIAN", "DISPUTED"]);

export function canTransitionBooking(from: BookingState, to: BookingState, actor: BookingActor, reason?: string): boolean {
  const allowed = transitions[from]?.[to];
  if (!allowed?.includes(actor)) return false;
  if (reasonRequired.has(to) && !reason?.trim()) return false;
  return true;
}

export function assertBookingTransition(from: BookingState, to: BookingState, actor: BookingActor, reason?: string): void {
  if (!canTransitionBooking(from, to, actor, reason)) throw new Error(`Invalid booking transition ${from} -> ${to} for ${actor}${reasonRequired.has(to) ? " (reason required)" : ""}`);
}

export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isExpired(expiresAt: Date, now = new Date()): boolean { return expiresAt.getTime() <= now.getTime(); }

export interface MatchCandidate {
  id: string;
  distanceMeters: number | null;
  ratingAverage: number;
  responseRate: number;
  lastActiveAt: Date;
}

export interface MatchingStrategy { rank<T extends MatchCandidate>(candidates: T[]): T[] }

export class DefaultMatchingStrategy implements MatchingStrategy {
  rank<T extends MatchCandidate>(candidates: T[]): T[] {
    return [...candidates].sort((a, b) => {
      if (a.distanceMeters !== null || b.distanceMeters !== null) {
        if (a.distanceMeters === null) return 1;
        if (b.distanceMeters === null) return -1;
        if (a.distanceMeters !== b.distanceMeters) return a.distanceMeters - b.distanceMeters;
      }
      return b.ratingAverage - a.ratingAverage || b.responseRate - a.responseRate || b.lastActiveAt.getTime() - a.lastActiveAt.getTime() || a.id.localeCompare(b.id);
    });
  }
}

export function detectMessageFlags(text: string): string[] {
  const flags = new Set<string>();
  if (/(?:\+?234[\s().-]?(?:70|80|81|90|91)[\s().-]?\d{3}[\s().-]?\d{4}|\b0(?:70|80|81|90|91)\d{8}\b|\b\d{10,11}\b)/i.test(text)) flags.add("phone_number");
  if (/\b(pay|payment|transfer|send|settle)\b.{0,35}\b(outside|directly|off[- ]?platform|personal account|my account)\b|\b(outside|off[- ]?platform)\b.{0,35}\b(pay|payment|transfer)\b/i.test(text)) flags.add("off_platform_payment");
  if (/(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(?:com|net|org|ng|co\.uk)\b/i.test(text)) flags.add("external_link");
  return [...flags];
}

export function sanitizeMessageText(value: string): string {
  return value.normalize("NFC").replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 4000);
}

export function isTechnicianAvailableInWindow(start: Date, end: Date, blocks: Array<{ startsAt: Date; endsAt: Date }>, activeBookings: Array<{ startsAt: Date; endsAt: Date }>): boolean {
  if (end <= start) return false;
  return !blocks.some(block => intervalsOverlap(start, end, block.startsAt, block.endsAt)) && !activeBookings.some(booking => intervalsOverlap(start, end, booking.startsAt, booking.endsAt));
}
