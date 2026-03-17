# Pools Info

Generated at: 2026-02-18T04:33:13.702Z
RPC: `http://127.0.0.1:8011`
ChainId: `324`
Block: `68512979`

## Summary

| Pool | Address | Classification |
|---|---|---|
| PancakeSwap | `0x6a8Fc7e8186ddC572e149dFAa49CfAE1E571108b` | UniswapV3/PancakeV3-style concentrated liquidity pool |
| Ezkalibur | `0x0DfD96f6DbA1F3AC4ABb4D5CA36ce7Cb48767a13` | UniswapV2-like pair |
| SyncSwap | `0xA06f1cce2Bb89f59D244178C2134e4Fc17B07306` | SyncSwap-style pool (vault/master API) |
| Mute | `0x3848dbd3EAc429497abd464A18fBEC78EF76f750` | Solidly/Mute-style V2 pair (stable/volatile) |
| VeSync | `0x16D0fC836FED0f645d832Eacc65106dDB67108Ef` | Solidly/Mute-style V2 pair (stable/volatile) |
| KyberSwap | `0x760B36C9024d27b95e45a1aA033aaDCB87DA77Dc` | Kyber Classic/DMM-style V2 pair |

## PancakeSwap

- Address: `0x6a8Fc7e8186ddC572e149dFAa49CfAE1E571108b`
- Pair hint: `USD+-USDC`
- Code size: `168160` bytes
- Code hash: `0x64155f382723eb5efb38e280f0ef6dda18823bc300d370f4726b139828a0b3f7`
- Classification: **UniswapV3/PancakeV3-style concentrated liquidity pool**

### Proxy Slots

- implementation slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- implementation address: `none`
- admin slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- admin address: `none`
- beacon slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- beacon address: `none`

### Selector Probes

| Function | Selector | Status | Result |
|---|---|---|---|
| `factory() returns (address)` | `0xc45a0155` | ok | `0x1BB72E0CbbEA93c08f535fc7856E0338D7F7a8aB` |
| `token0() returns (address)` | `0x0dfe1681` | ok | `0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4` |
| `token1() returns (address)` | `0xd21220a7` | ok | `0x8E86e46278518EFc1C5CEd245cBA2C7e3ef11557` |
| `getReserves() returns (uint112,uint112,uint32)` | `0x0902f1ac` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getReserves() returns (uint256,uint256)` | `0x0902f1ac` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `stable() returns (bool)` | `0x22be3de1` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `pairFee() returns (uint256)` | `0x218cf69a` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `fee() returns (uint24)` | `0xddca3f43` | ok | `100` |
| `slot0() returns (uint160,int24,uint16,uint16,uint16,uint8,bool)` | `0x3850c7bd` | ok | `["82896440074549154728373677840","905","301","500","500","228",true]` |
| `liquidity() returns (uint128)` | `0x1a686502` | ok | `12809630` |
| `tickSpacing() returns (int24)` | `0xd0c93a7c` | ok | `1` |
| `swapFeeUnits() returns (uint24)` | `0xc79a590e` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `tickDistance() returns (int24)` | `0x48626a8c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getFeeGrowthGlobal() returns (uint256)` | `0x72cc5148` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `vault() returns (address)` | `0xfbfa77cf` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `master() returns (address)` | `0xee97f7f3` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `poolType() returns (uint16)` | `0xb1dd61b6` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getAssets() returns (address[])` | `0x67e4ac2c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getProtocolFee() returns (uint24)` | `0xa5a41031` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `reserve0() returns (uint256)` | `0x443cb4bc` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `reserve1() returns (uint256)` | `0x5a76f25e` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `invariantLast() returns (uint256)` | `0x07f293f7` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `feeInPrecision() returns (uint256)` | `0x2502884c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getTradeInfo() returns (uint112,uint112,uint112,uint112,uint256)` | `0xd6694027` | fail | `execution reverted (no data present; likely require(false) occurred` |

## Ezkalibur

- Address: `0x0DfD96f6DbA1F3AC4ABb4D5CA36ce7Cb48767a13`
- Pair hint: `USDC/USD+`
- Code size: `101152` bytes
- Code hash: `0xa44e1cfaf2ee162a4fd143899d8984dc4839e97c15a962b16304cc6e4b282795`
- Classification: **UniswapV2-like pair**

### Proxy Slots

- implementation slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- implementation address: `none`
- admin slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- admin address: `none`
- beacon slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- beacon address: `none`

### Selector Probes

| Function | Selector | Status | Result |
|---|---|---|---|
| `factory() returns (address)` | `0xc45a0155` | ok | `0x15C664A62086c06D43E75BB3fddED93008B8cE63` |
| `token0() returns (address)` | `0x0dfe1681` | ok | `0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4` |
| `token1() returns (address)` | `0xd21220a7` | ok | `0x8E86e46278518EFc1C5CEd245cBA2C7e3ef11557` |
| `getReserves() returns (uint112,uint112,uint32)` | `0x0902f1ac` | ok | `["70964876","94156948","50"]` |
| `getReserves() returns (uint256,uint256)` | `0x0902f1ac` | ok | `["70964876","94156948"]` |
| `stable() returns (bool)` | `0x22be3de1` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `pairFee() returns (uint256)` | `0x218cf69a` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `fee() returns (uint24)` | `0xddca3f43` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `slot0() returns (uint160,int24,uint16,uint16,uint16,uint8,bool)` | `0x3850c7bd` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `liquidity() returns (uint128)` | `0x1a686502` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `tickSpacing() returns (int24)` | `0xd0c93a7c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `swapFeeUnits() returns (uint24)` | `0xc79a590e` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `tickDistance() returns (int24)` | `0x48626a8c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getFeeGrowthGlobal() returns (uint256)` | `0x72cc5148` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `vault() returns (address)` | `0xfbfa77cf` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `master() returns (address)` | `0xee97f7f3` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `poolType() returns (uint16)` | `0xb1dd61b6` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getAssets() returns (address[])` | `0x67e4ac2c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getProtocolFee() returns (uint24)` | `0xa5a41031` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `reserve0() returns (uint256)` | `0x443cb4bc` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `reserve1() returns (uint256)` | `0x5a76f25e` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `invariantLast() returns (uint256)` | `0x07f293f7` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `feeInPrecision() returns (uint256)` | `0x2502884c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getTradeInfo() returns (uint112,uint112,uint112,uint112,uint256)` | `0xd6694027` | fail | `execution reverted (no data present; likely require(false) occurred` |

## SyncSwap

- Address: `0xA06f1cce2Bb89f59D244178C2134e4Fc17B07306`
- Pair hint: `USD+/USDC`
- Code size: `127904` bytes
- Code hash: `0xf5d5574e143ff553bc16f9e4165f6a1c1b363b08b9f24daf2026bb361cdf67db`
- Classification: **SyncSwap-style pool (vault/master API)**

### Proxy Slots

- implementation slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- implementation address: `none`
- admin slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- admin address: `none`
- beacon slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- beacon address: `none`

### Selector Probes

| Function | Selector | Status | Result |
|---|---|---|---|
| `factory() returns (address)` | `0xc45a0155` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `token0() returns (address)` | `0x0dfe1681` | ok | `0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4` |
| `token1() returns (address)` | `0xd21220a7` | ok | `0x8E86e46278518EFc1C5CEd245cBA2C7e3ef11557` |
| `getReserves() returns (uint112,uint112,uint32)` | `0x0902f1ac` | fail | `could not decode result data` |
| `getReserves() returns (uint256,uint256)` | `0x0902f1ac` | ok | `["150802218","1307156933"]` |
| `stable() returns (bool)` | `0x22be3de1` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `pairFee() returns (uint256)` | `0x218cf69a` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `fee() returns (uint24)` | `0xddca3f43` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `slot0() returns (uint160,int24,uint16,uint16,uint16,uint8,bool)` | `0x3850c7bd` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `liquidity() returns (uint128)` | `0x1a686502` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `tickSpacing() returns (int24)` | `0xd0c93a7c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `swapFeeUnits() returns (uint24)` | `0xc79a590e` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `tickDistance() returns (int24)` | `0x48626a8c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getFeeGrowthGlobal() returns (uint256)` | `0x72cc5148` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `vault() returns (address)` | `0xfbfa77cf` | ok | `0x621425a1Ef6abE91058E9712575dcc4258F8d091` |
| `master() returns (address)` | `0xee97f7f3` | ok | `0xFdFE03bAE6B8113Ee1002d2bE453Fb71CA5783d3` |
| `poolType() returns (uint16)` | `0xb1dd61b6` | ok | `2` |
| `getAssets() returns (address[])` | `0x67e4ac2c` | ok | `["0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4","0x8E86e46278518EFc1C5CEd245cBA2C7e3ef11557"]` |
| `getProtocolFee() returns (uint24)` | `0xa5a41031` | ok | `99000` |
| `reserve0() returns (uint256)` | `0x443cb4bc` | ok | `150802218` |
| `reserve1() returns (uint256)` | `0x5a76f25e` | ok | `1307156933` |
| `invariantLast() returns (uint256)` | `0x07f293f7` | ok | `1457336049781021184406` |
| `feeInPrecision() returns (uint256)` | `0x2502884c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getTradeInfo() returns (uint112,uint112,uint112,uint112,uint256)` | `0xd6694027` | fail | `execution reverted (no data present; likely require(false) occurred` |

## Mute

- Address: `0x3848dbd3EAc429497abd464A18fBEC78EF76f750`
- Pair hint: `USDC/USD+`
- Code size: `79328` bytes
- Code hash: `0xad8364d5754b2413c9b7cf6432a700ae483e5bf13e1e7f15f91027554565d22a`
- Classification: **Solidly/Mute-style V2 pair (stable/volatile)**

### Proxy Slots

- implementation slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- implementation address: `none`
- admin slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- admin address: `none`
- beacon slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- beacon address: `none`

### Selector Probes

| Function | Selector | Status | Result |
|---|---|---|---|
| `factory() returns (address)` | `0xc45a0155` | ok | `0x40be1cBa6C5B47cDF9da7f963B6F761F4C60627D` |
| `token0() returns (address)` | `0x0dfe1681` | ok | `0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4` |
| `token1() returns (address)` | `0xd21220a7` | ok | `0x8E86e46278518EFc1C5CEd245cBA2C7e3ef11557` |
| `getReserves() returns (uint112,uint112,uint32)` | `0x0902f1ac` | ok | `["1147575257","1533405215","1770550931"]` |
| `getReserves() returns (uint256,uint256)` | `0x0902f1ac` | ok | `["1147575257","1533405215"]` |
| `stable() returns (bool)` | `0x22be3de1` | ok | `true` |
| `pairFee() returns (uint256)` | `0x218cf69a` | ok | `5` |
| `fee() returns (uint24)` | `0xddca3f43` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `slot0() returns (uint160,int24,uint16,uint16,uint16,uint8,bool)` | `0x3850c7bd` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `liquidity() returns (uint128)` | `0x1a686502` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `tickSpacing() returns (int24)` | `0xd0c93a7c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `swapFeeUnits() returns (uint24)` | `0xc79a590e` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `tickDistance() returns (int24)` | `0x48626a8c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getFeeGrowthGlobal() returns (uint256)` | `0x72cc5148` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `vault() returns (address)` | `0xfbfa77cf` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `master() returns (address)` | `0xee97f7f3` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `poolType() returns (uint16)` | `0xb1dd61b6` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getAssets() returns (address[])` | `0x67e4ac2c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getProtocolFee() returns (uint24)` | `0xa5a41031` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `reserve0() returns (uint256)` | `0x443cb4bc` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `reserve1() returns (uint256)` | `0x5a76f25e` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `invariantLast() returns (uint256)` | `0x07f293f7` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `feeInPrecision() returns (uint256)` | `0x2502884c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getTradeInfo() returns (uint112,uint112,uint112,uint112,uint256)` | `0xd6694027` | fail | `execution reverted (no data present; likely require(false) occurred` |

## VeSync

- Address: `0x16D0fC836FED0f645d832Eacc65106dDB67108Ef`
- Pair hint: `USDC/USD+`
- Code size: `116384` bytes
- Code hash: `0x3483b73a2808ed590ca657a3e501bb7042255b24975550276f8f3110f2d90bf6`
- Classification: **Solidly/Mute-style V2 pair (stable/volatile)**

### Proxy Slots

- implementation slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- implementation address: `none`
- admin slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- admin address: `none`
- beacon slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- beacon address: `none`

### Selector Probes

| Function | Selector | Status | Result |
|---|---|---|---|
| `factory() returns (address)` | `0xc45a0155` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `token0() returns (address)` | `0x0dfe1681` | ok | `0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4` |
| `token1() returns (address)` | `0xd21220a7` | ok | `0x8E86e46278518EFc1C5CEd245cBA2C7e3ef11557` |
| `getReserves() returns (uint112,uint112,uint32)` | `0x0902f1ac` | ok | `["66225815","92025022","1769418258"]` |
| `getReserves() returns (uint256,uint256)` | `0x0902f1ac` | ok | `["66225815","92025022"]` |
| `stable() returns (bool)` | `0x22be3de1` | ok | `true` |
| `pairFee() returns (uint256)` | `0x218cf69a` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `fee() returns (uint24)` | `0xddca3f43` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `slot0() returns (uint160,int24,uint16,uint16,uint16,uint8,bool)` | `0x3850c7bd` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `liquidity() returns (uint128)` | `0x1a686502` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `tickSpacing() returns (int24)` | `0xd0c93a7c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `swapFeeUnits() returns (uint24)` | `0xc79a590e` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `tickDistance() returns (int24)` | `0x48626a8c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getFeeGrowthGlobal() returns (uint256)` | `0x72cc5148` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `vault() returns (address)` | `0xfbfa77cf` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `master() returns (address)` | `0xee97f7f3` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `poolType() returns (uint16)` | `0xb1dd61b6` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getAssets() returns (address[])` | `0x67e4ac2c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getProtocolFee() returns (uint24)` | `0xa5a41031` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `reserve0() returns (uint256)` | `0x443cb4bc` | ok | `66225815` |
| `reserve1() returns (uint256)` | `0x5a76f25e` | ok | `92025022` |
| `invariantLast() returns (uint256)` | `0x07f293f7` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `feeInPrecision() returns (uint256)` | `0x2502884c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getTradeInfo() returns (uint112,uint112,uint112,uint112,uint256)` | `0xd6694027` | fail | `execution reverted (no data present; likely require(false) occurred` |

## KyberSwap

- Address: `0x760B36C9024d27b95e45a1aA033aaDCB87DA77Dc`
- Pair hint: `USDC/USD+`
- Code size: `82528` bytes
- Code hash: `0xabd859c5122e2536db23efdcccaec4d25a44473c3bdf034b59999889ff5526a1`
- Classification: **Kyber Classic/DMM-style V2 pair**

### Proxy Slots

- implementation slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- implementation address: `none`
- admin slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- admin address: `none`
- beacon slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
- beacon address: `none`

### Selector Probes

| Function | Selector | Status | Result |
|---|---|---|---|
| `factory() returns (address)` | `0xc45a0155` | ok | `0x9017f5A42fbe5bCA3853400D2660a2Ee771b241e` |
| `token0() returns (address)` | `0x0dfe1681` | ok | `0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4` |
| `token1() returns (address)` | `0xd21220a7` | ok | `0x8E86e46278518EFc1C5CEd245cBA2C7e3ef11557` |
| `getReserves() returns (uint112,uint112,uint32)` | `0x0902f1ac` | fail | `could not decode result data` |
| `getReserves() returns (uint256,uint256)` | `0x0902f1ac` | ok | `["147401433","27303138"]` |
| `stable() returns (bool)` | `0x22be3de1` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `pairFee() returns (uint256)` | `0x218cf69a` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `fee() returns (uint24)` | `0xddca3f43` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `slot0() returns (uint160,int24,uint16,uint16,uint16,uint8,bool)` | `0x3850c7bd` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `liquidity() returns (uint128)` | `0x1a686502` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `tickSpacing() returns (int24)` | `0xd0c93a7c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `swapFeeUnits() returns (uint24)` | `0xc79a590e` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `tickDistance() returns (int24)` | `0x48626a8c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getFeeGrowthGlobal() returns (uint256)` | `0x72cc5148` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `vault() returns (address)` | `0xfbfa77cf` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `master() returns (address)` | `0xee97f7f3` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `poolType() returns (uint16)` | `0xb1dd61b6` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getAssets() returns (address[])` | `0x67e4ac2c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getProtocolFee() returns (uint24)` | `0xa5a41031` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `reserve0() returns (uint256)` | `0x443cb4bc` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `reserve1() returns (uint256)` | `0x5a76f25e` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `invariantLast() returns (uint256)` | `0x07f293f7` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `feeInPrecision() returns (uint256)` | `0x2502884c` | fail | `execution reverted (no data present; likely require(false) occurred` |
| `getTradeInfo() returns (uint112,uint112,uint112,uint112,uint256)` | `0xd6694027` | ok | `["147401433","27303138","3663065606","3677854796","3000000000000000"]` |
