-- Prevent the same blockchain transaction from being reused across orders.
-- PostgreSQL unique indexes allow multiple NULL values, so non-crypto and
-- pre-verification rows remain unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS "pagos_txHash_key" ON "pagos"("txHash");
