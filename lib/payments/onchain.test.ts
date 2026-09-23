import assert from "node:assert/strict";
import test from "node:test";
import {
  cryptoExplorerUrl,
  normalizeCryptoTransactionHash,
} from "./onchain";

const evmHash = `0x${"A".repeat(64)}`;
const btcHash = "B".repeat(64);

test("normalizes EVM transaction hashes", () => {
  assert.equal(
    normalizeCryptoTransactionHash("BNB", evmHash),
    evmHash.toLowerCase(),
  );
  assert.equal(
    normalizeCryptoTransactionHash("USDT", evmHash),
    evmHash.toLowerCase(),
  );
  assert.equal(
    normalizeCryptoTransactionHash("ETH", evmHash),
    evmHash.toLowerCase(),
  );
});

test("normalizes Bitcoin transaction ids", () => {
  assert.equal(
    normalizeCryptoTransactionHash("BTC", btcHash),
    btcHash.toLowerCase(),
  );
});

test("rejects malformed transaction identifiers", () => {
  assert.throws(() => normalizeCryptoTransactionHash("ETH", "0x1234"));
  assert.throws(() => normalizeCryptoTransactionHash("BTC", "not-a-txid"));
});

test("builds the correct public explorer URL per network", () => {
  assert.equal(
    cryptoExplorerUrl("BNB", evmHash),
    `https://bscscan.com/tx/${evmHash.toLowerCase()}`,
  );
  assert.equal(
    cryptoExplorerUrl("USDT", evmHash),
    `https://bscscan.com/tx/${evmHash.toLowerCase()}`,
  );
  assert.equal(
    cryptoExplorerUrl("ETH", evmHash),
    `https://etherscan.io/tx/${evmHash.toLowerCase()}`,
  );
  assert.equal(
    cryptoExplorerUrl("BTC", btcHash),
    `https://mempool.space/tx/${btcHash.toLowerCase()}`,
  );
});
