export interface PaymentGateBooking {
  id: string;
  paymentMethod: "ONLINE" | "CASH";
  priceKobo: number;
  platformFeePreviewKobo: number;
  currencyCode: string;
}

/** Phase 4 contract only. Phase 5 supplies a real gateway implementation. */
export interface PaymentGate {
  canAccept(booking: PaymentGateBooking): Promise<boolean>;
  onAccepted(booking: PaymentGateBooking): Promise<void>;
  onCompleted(booking: PaymentGateBooking): Promise<void>;
  onCancelled(booking: PaymentGateBooking): Promise<void>;
}

export class NoopPaymentGate implements PaymentGate {
  async canAccept() { return true; }
  async onAccepted() {}
  async onCompleted() {}
  async onCancelled() {}
}

export interface CommissionPreview {
  feeKobo: number;
  rateBasisPoints: number;
  source: "CONFIGURED_DEFAULT";
}

export interface CommissionRuleProvider {
  preview(input: { priceKobo: number; serviceId: string; cityId: string }): Promise<CommissionPreview>;
}
