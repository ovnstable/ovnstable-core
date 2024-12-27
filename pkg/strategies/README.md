# Startegies

## Deploy strategy

1. Navigate to folder /[network-name]
2. Run deploy script
   ```bash
   npx hardhat deploy --tags StrategySiloUsdc --network arbitrum_usdt --impl
   ```
   NB: For proxy implememtation deployment --network value should be equal to /deplyments subfolder.  
   For example if you want to deploy StrategySiloEth implementation use --network arbitrum_eth

## Test strategy

0. In .env file add TEST_STRATEGY=[strategy tag], ex: TEST_STRATEGY=StrategySiloUsdc
1. Navigate to folder /[network-name]
2. Run test script
   ```bash
   npx hardhat test ./test/main.js --network [network] --stand [network_(token you want to run tests for)]
   ```
   example: `npx hardhat test ./test/main.js --network arbitrum --stand arbitrum_usdt`


## Editing script for collecting rewards from Fenix via Merkl

1. Add the contract address to the Rabby wallet and impersonate from it: 0xa09A8e94FBaAC9261af8f34d810D96b923B559D2 
2. Go to the Merkl website and find information about this address: https://merkl.angle.money/user/0xa09a8e94fbaac9261af8f34d810d96b923b559d2
3. Click the "Claim all" button in Unclaimed rewards section. Simulation of this operation will open in the Rabby wallet.
4. In the central section, click on the "View Raw" button. In the window that opens, select the "ABI" section.
5. Look at the array by the "params" key. Copy the number (it's the only one there) from the third subarray.
6. Go to the file ovnstable-core/pkg/strategies/blast/scripts/claimFenixRewards.js
In the fourth parameter fenixSwap.claimMerkleTreeRewards there will be an array with number (there is a comment "amounts"), replace this number with what you copied earlier.
7. In the ABI in Rabby copy the list of 16 strings and paste it in place of the list that is in the claimFenixRewards.js 
8. Add the prefix "0x" to each string.