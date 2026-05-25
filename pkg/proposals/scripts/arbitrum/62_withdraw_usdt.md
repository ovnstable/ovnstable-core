# Proposal 62 — Withdraw USDT+ (Arbitrum)

**Order (atomic, one proposal):**
1. Unstake `StrategyAaveUsdt` NAV → WAL (strategy first, before pools).
2. Upgrade USDT+ to temp impl, `swapNuke`: drain each pool, then `nuke()` (pause + zero supply).

## Pools drained

| Pool | Address | DEX | Pair | ~USD+ taken |
|---|---|---|---|---|
| Ape | `0x488A565E7D2335239692671C1D58738473EBd1ed` | Uniswap V2 fork | USDT+/USD+ | ~25 |
| Curve NG | `0x1446999B0b0E4f7aDA6Ee73f2Ae12a2cfdc5D9E7` | Curve StableSwapNG | USDT+/USD+ | ~7,900 |
| Pancake V3 A | `0x8a06339Abd7499Af755DF585738ebf43D5D62B94` | Pancake V3 | USDT+/USD+ | ~37,500 |
| Pancake V3 B | `0xb9c2d906f94b27bC403Ab76B611D2C4490c2ae3F` | Pancake V3 | USDT+/USD+ | ~30 |

All output (USD+) → WAL `0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856`.

## Skipped

| Pool | Address | Reason |
|---|---|---|
| Uniswap V4 USDT+/USDT | poolId `0xfbd68baf…04d17e93` (PoolManager `0x360E68f…`) | Only ~20 USDT drainable (dead pool) — not worth the extra V4 swap surface. |

## Notes

```sh
cd pkg/core && hh node
```

```sh
cd pkg/core && hh deploy --tags UsdPlusTokenArbUsdtTmp --stand arbitrum_usdt --network localhost --impl
```

```sh
cd pkg/proposals/scripts/arbitrum && hh run 62_withdraw_usdt.js --stand arbitrum_usdt --network localhost
```
