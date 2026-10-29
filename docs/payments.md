# Payments and settlement notes

## Ledger state model

The platform must not treat a gateway's successful charge response as escrow. Store the gateway transaction and the platform's own funds state separately. The initial ledger lifecycle is `pending → held → released`, with a permitted refund path `pending/held → refunded`. Every transition is an idempotent, auditable ledger event; never edit or delete posted entries. A successful webhook is verified and reconciled before the ledger moves to `held`. Completion/dispute resolution authorizes release or refund in the platform records. Whether the platform may hold, control, or delay payout of funds is a legal and business question requiring confirmation before launch.

```text
Customer payment → Paystack collects → settlement to the configured business account (typically T+1 for local NGN) → platform ledger remains held → release decision → payout/transfer to technician less commission
```

`held` means the platform's ledger says the amount is not yet payable to the technician. It does not mean Paystack has placed funds in a regulated escrow account. Do not promise “escrow” or “payment protected” until the funds flow and legal position support that wording.

## Paystack in practice (Nigeria / NGN)

Paystack's standard settlement documentation describes local transactions settling to the merchant's configured payout account on a T+1 business-day schedule; settlement depends on the acquiring/partner bank and can be delayed. The optional “Settled to Balance”/manual payout arrangement can leave funds in the merchant's Paystack balance once enabled for that merchant. Paystack says that feature is eligibility-dependent. Its Transfers product can then send money from the Paystack balance to local bank accounts; transfer availability is for registered businesses and requires sufficient balance including fees. Reconcile settlement and transfer status using Paystack APIs/webhooks and keep a separate internal ledger.

Paystack transaction splits/subaccounts can distribute a transaction settlement between the merchant and configured subaccounts, but that is split settlement, not escrow: money is routed to those accounts according to a split configuration and does not itself model delayed release after work completion. Do not use splits as a substitute for a held/released funds arrangement without explicitly approving the operational and legal consequences.

References (review again during gateway integration because availability and terms can change):

- [Paystack: Getting your money](https://support.paystack.com/en/articles/2125314)
- [Paystack: Manual payouts](https://support.paystack.com/en/articles/2131074)
- [Paystack: Transfers](https://support.paystack.com/en/articles/2132866)
- [Paystack: Managing transfers](https://paystack.com/docs/transfers/managing-transfers/)
- [Paystack: Transaction splits](https://paystack.com/docs/payments/split-payments/)
- [Paystack Terms: settlement and payout](https://paystack.com/terms)

## Business and legal decisions required before launch

1. Confirm with Paystack whether this marketplace use case can retain collected funds in its Paystack balance until job completion, how the merchant's eligibility is established, and what limits/fees/operational controls apply.
2. Obtain Nigerian legal advice on custody, delayed settlement, refunds, safeguarding, marketplace payouts, and whether “escrow” is an appropriate product/legal description. Product copy stays “payment status” until approved.
3. Confirm the payout policy for disputes, chargebacks, reversals and jobs completed offline; document who bears payment-processing costs and gateway settlement delays.
4. Confirm the business's registered status and Paystack account configuration needed for Transfers and any transaction split usage.
5. Decide whether release is automated after customer confirmation, after a timeout, or only after staff resolution; define a safe dispute hold and evidence process.

## Cash jobs

Cash is a booking commitment, not a gateway charge. On job completion, record a cash settlement and post the platform commission as a debit to the technician wallet. Reject new accept/quote actions when the wallet is below the configured negative threshold. Top-ups, reversals and adjustments must each create ledger entries; no direct balance edits.
