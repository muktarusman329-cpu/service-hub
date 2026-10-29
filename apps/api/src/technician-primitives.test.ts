import assert from "node:assert/strict";
import { test } from "node:test";
import { assertTechnicianTransition, canTransitionTechnician, isAllowedImage, stripImageExif, validatePriceGuide } from "./technician-primitives";

test("technician status machine only permits reviewed transitions", () => {
  assert.equal(canTransitionTechnician("DRAFT", "SUBMITTED"), true);
  assert.equal(canTransitionTechnician("SUBMITTED", "APPROVED"), true);
  assert.equal(canTransitionTechnician("DRAFT", "APPROVED"), false);
  assert.throws(() => assertTechnicianTransition("SUBMITTED", "REJECTED"), /reason is required/);
  assert.doesNotThrow(() => assertTechnicianTransition("SUBMITTED", "REJECTED", "ID could not be verified"));
});

test("catalog price guidance requires a non-negative ordered range", () => {
  assert.doesNotThrow(() => validatePriceGuide(500, 2500));
  assert.throws(() => validatePriceGuide(2500, 500));
  assert.throws(() => validatePriceGuide(-1, 500));
});

test("KYC image validation checks magic bytes against declared MIME", () => {
  assert.equal(isAllowedImage("image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);
  assert.equal(isAllowedImage("image/png", Uint8Array.from([0xff, 0xd8, 0xff])), false);
  assert.equal(isAllowedImage("application/pdf", Uint8Array.from([0x25, 0x50, 0x44, 0x46])), false);
});

test("PNG metadata stripping preserves the image and removes EXIF chunks", () => {
  const chunk = (type: string, payload = Buffer.alloc(0)) => {
    const header = Buffer.alloc(8);
    header.writeUInt32BE(payload.length, 0);
    header.write(type, 4, "ascii");
    return Buffer.concat([header, payload, Buffer.alloc(4)]);
  };
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const png = Buffer.concat([signature, chunk("IHDR", Buffer.alloc(13)), chunk("eXIf", Buffer.from("private metadata")), chunk("IDAT", Buffer.from([1, 2, 3])), chunk("IEND")]);
  const stripped = stripImageExif("image/png", png);
  assert.ok(stripped instanceof Uint8Array);
  assert.deepEqual(Array.from(stripped.slice(0, 8)), Array.from(signature));
  assert.equal(Buffer.from(stripped).includes(Buffer.from("eXIf")), false);
  assert.equal(Buffer.from(stripped).includes(Buffer.from("private metadata")), false);
});
