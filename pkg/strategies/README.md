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
