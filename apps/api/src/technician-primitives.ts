export type TechnicianStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "SUSPENDED" | "REACTIVATED" | "PENDING_APPROVAL";

const transitions: Record<TechnicianStatus, TechnicianStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "REJECTED"],
  CHANGES_REQUESTED: ["SUBMITTED", "REJECTED"],
  APPROVED: ["SUSPENDED"],
  REJECTED: [],
  SUSPENDED: ["REACTIVATED"],
  REACTIVATED: ["SUSPENDED"],
  PENDING_APPROVAL: ["SUBMITTED"]
};

export function canTransitionTechnician(from: TechnicianStatus, to: TechnicianStatus) {
  return transitions[from]?.includes(to) ?? false;
}

export function assertTechnicianTransition(from: TechnicianStatus, to: TechnicianStatus, reason?: string) {
  if (!canTransitionTechnician(from, to)) throw new Error(`Invalid technician status change: ${from} → ${to}`);
  if (["CHANGES_REQUESTED", "REJECTED", "SUSPENDED"].includes(to) && !reason?.trim()) throw new Error(`A reason is required for ${to.toLowerCase().replaceAll("_", " ")}`);
}

export function validatePriceGuide(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) throw new Error("Price guidance must be non-negative and the maximum must not be below the minimum");
}

export function isAllowedImage(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export function stripImageExif(type: string, bytes: Uint8Array): Uint8Array {
  if (type === "image/jpeg") {
    const out: number[] = [0xff, 0xd8];
    let offset = 2;
    while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
      const marker = bytes[offset + 1]!;
      if (marker === 0xda) { out.push(...bytes.slice(offset)); return Uint8Array.from(out); }
      const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
      if (length < 2 || offset + 2 + length > bytes.length) break;
      const isExif = marker === 0xe1 && String.fromCharCode(...bytes.slice(offset + 4, offset + 10)) === "Exif\0\0";
      if (!isExif) out.push(...bytes.slice(offset, offset + 2 + length));
      offset += 2 + length;
    }
    out.push(...bytes.slice(offset)); return Uint8Array.from(out);
  }
  if (type === "image/png") {
    const out: number[] = Array.from(bytes.slice(0, 8));
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = ((bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!) >>> 0;
      const end = offset + 12 + length; if (end > bytes.length) return bytes;
      const kind = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
      if (kind !== "eXIf") out.push(...bytes.slice(offset, end));
      offset = end; if (kind === "IEND") break;
    }
    return Uint8Array.from(out);
  }
  if (type === "image/webp") {
    const out: number[] = Array.from(bytes.slice(0, 12)); let offset = 12;
    while (offset + 8 <= bytes.length) {
      const kind = String.fromCharCode(...bytes.slice(offset, offset + 4));
      const length = bytes[offset + 4]! | (bytes[offset + 5]! << 8) | (bytes[offset + 6]! << 16) | (bytes[offset + 7]! << 24);
      const end = offset + 8 + length + (length % 2); if (end > bytes.length) return bytes;
      if (kind !== "EXIF") out.push(...bytes.slice(offset, end)); offset = end;
    }
    const result = Uint8Array.from(out); const size = result.length - 8; result[4] = size & 255; result[5] = (size >>> 8) & 255; result[6] = (size >>> 16) & 255; result[7] = (size >>> 24) & 255; return result;
  }
  return bytes;
}

