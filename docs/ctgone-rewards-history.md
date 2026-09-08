# CTG One Rewards + PISÁO history

## Boundary

PISÁO remains authoritative for orders and reservations. CTG One remains authoritative for ecosystem identity and rewards. The integration never uses email as an ownership key; `ctgOneSubject` is the canonical subject.

## Event lifecycle

- `ORDER_PAID`: emitted only after a trusted payment rail approves a payment.
- `ORDER_FULFILLED`: emitted when staff moves the paid order to `ENTREGADO`.
- `ORDER_CANCELLED`: emitted when a linked order is cancelled; CTG One uses it to reverse or void previously eligible activity idempotently.
- `RESERVATION_COMPLETED`: emitted only when staff records actual attendance.

Order creation and reservation creation alone never award benefits.

## Delivery guarantees

The PISÁO database contains a durable `ctgone_reward_outbox`. Restaurant state changes and outbox insertion happen in the same PostgreSQL transaction. Delivery to CTG One occurs after commit and is best-effort; failures remain retryable and never roll back a restaurant operation.

Every event has a stable `eventKey`, sent as both payload event id and `x-idempotency-key`. CTG One must treat duplicates as the same event.

Requests are authenticated with HMAC-SHA256 over `<unixTimestamp>.<rawBody>` using a Rewards-only secret and the headers:

- `x-ctgone-pisao-rewards-timestamp`
- `x-ctgone-pisao-rewards-signature`
- `x-idempotency-key`

The SSO/federation secret is intentionally not reused.

## Customer surface

`/mi-cuenta` is the PISÁO-local history surface. It resolves ownership by the signed CTG One customer session and queries only rows matching `ctgOneSubject`. CTG One is the future canonical surface for the consolidated cross-ecosystem reward balance.

## Operations

The protected `POST /api/internal/ctgone/rewards/drain` endpoint retries pending/failed events. It requires `PISAO_REWARDS_WORKER_SECRET` and can be called by the deployment scheduler once production activation is approved.

Crypto reward emission remains intentionally excluded until the configured crypto provider has a real, verified webhook-signature contract.
