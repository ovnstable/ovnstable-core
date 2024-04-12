# Propsals

## Setup local network

Before running tests setup local network
Run `npx hardhat node --last`

### Errors

- NETWORK_ERROR - [possible solution](https://stackoverflow.com/a/70057321)

## How to add new proposal

1. Create new script in /proposals/scripts/[network]/

## How to run tests

At the end of propasl use:

- testProposal() for testing transation with abi updates and etc.
- testStrategy() for testing startegies
- testUsdPlus()

## How to execute proposal

1. Comment out all tesing functions
2. Run inside /proposal folder `npx hardhat run ./scripts/[network]/[file name].js --network [network]`  
   ex: `npx hardhat run ./scripts/arbitrum/34_update_silo_claim.js --network arbitrum --stand arbitrum`
3. File would be saved inside ./batches/[network]
