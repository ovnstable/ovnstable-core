# Overnight Contracts

This repository contains all contracts Overnight

##### Requirement:

- Node v16
- yarn v1.22.18

## How to install?

1. Install node 
2. Install yarn
3. Run `yarn install --frozen-lockfile`
4. Create .env file from copy .env.example

### For local developing

1. Define ETH_NODE_URI_{CHAIN} - public RPC
2. Define HARDHAT_BLOCK_NUMBER_{CHAIN} - blockNumber for startup hardhat node
3. Define ETH_NETWORK - chain ID 
4. Define STAND - stand id [polygon, bsc, optimism]

### For deploy

1. Define PK_${CHAIN} if you need to deploy contracts to real chain
2. Define GAS_PRICE - gas price if you need deploy
3. Define ETHERSCAN_API_${CHAIN} - for verify contracts

 
```
enum CHAIN:

- POLYGON
- FANTOM
- OPTIMISM
- BSC

```


## Modules:

This repository contains is next modules:

1) common - it contains common scripts for deploying, build, testing contracts
2) governance - governance contracts
3) core - core contracts 
4) strategies - contains sub modules with strategies for each chain

## How to deploy new strategy:

1. Set in .env file your parameters and check actual gas price in gas station.
2. Deploy strategy and setting in pkg/strategies/polygon
   npx hardhat deploy --tags StrategyEtsAlfaPlus --setting --network polygon
3. Verify strategy in pkg/strategies/polygon and verify it on scan service.
   npx hardhat run scripts/verify.js --network polygon
4. Add new record in dict.strategies.
5. Add FREE_RIDER_ROLE and WHITELIST_ROLE in ETS if it's ETS strategy. Create and execute proposal if ETS under governance.
6. Change in payout service order of payouts, if it's ETS strategy.
7. Add strategy in PM through proposal in pkg/core
   npx hardhat run scripts/addStrategy.js --network polygon
8. Move rules of strategy to governance in pkg/governance
   npx hardhat run scripts/move_strategies_to_gov.js --network polygon
9. Set percentage in anal.collateral after adding liquidity in strategy.

