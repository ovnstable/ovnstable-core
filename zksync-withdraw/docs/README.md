
Для запуска ноды:
```sh
yarn hardhat node-zksync --fork https://mainnet.era.zksync.io --fork-block-number 68512971 --cache none --reset-cache --protocol-version 29
```
TODO: убрать максимум флагов

Для апгрейда:
```sh
yarn hardhat deploy --network local --impl --tags StrategyZerolend                                        
```

Для скрипта:
```sh
yarn hardhat run scripts/callstatic_upgradeTo_fixed.js --network local
```

Для пропозала:
```sh
yarn hardhat run proposals/001_upgrade_strategy_zerolend.js --network local
```

.env:
```conf
ZKSYNC_RPC_URL=https://mainnet.era.zksync.io                                        # 
PRIVATE_KEY=0x2cd46334b0268c7ed25b5a69dde27560a615b833589f62a35e957475e5d7638e      # default transaction signer
NETWORK_NAME=hardhat                                                                # 
PROPOSAL_GAS_LIMIT=200000000                                                        # GasLimit for 1 trans in proposal
BLOCK_NUMBER=68512971                                                               #
GOAT=true                                                                           # scripts ran with timelock impersonation
```









Подпроект создал в папке чтобы не приходилось создавать новую репу

Использую HH2, потому что с HH3 еще не совместимы скрипты для zksync (может никогда и не будут)


Пока план такой:

- Найти контракты на zksync по возможности

Strategies:
StrategyZerolend.json                           (proxy)     0x1969937EFc0F86CAf3a613c23e6340cd8ce77F0e      (impl)      0x2998b840BcBcFdb6866FCb9B8638fD1940206E68      30'279 z0USDC
StrategyZerolendUsdt.json                       (proxy)     0x1d48b4612EbA39b7C073abE1f71d5dF79574869A      (impl)      0x764D9893044b682a45a623A8214034c08fAC8d7E       2'883 z0USDT

- 

Локальные proposal-скрипты через impersonation AgentTimelock: `docs/PROPOSALS_LOCAL.md`
