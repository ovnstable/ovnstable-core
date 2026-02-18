# zkSync Withdraw Local Runbook

README для локального теста апгрейда/пропозала:
- поднять локальную zkSync-ноду на форке;
- задеплоить новую имплементацию;
- прогнать proposal локально через impersonation `AgentTimelock`.

## 1) Установка зависимостей

```sh
cd zksync-withdraw
yarn install --frozen-lockfile
```

## 2) `.env` (обязательные переменные)

```conf
ZKSYNC_RPC_URL=https://mainnet.era.zksync.io
LOCAL_ZKSYNC_RPC_URL=http://127.0.0.1:8011
BLOCK_NUMBER=68512971
PRIVATE_KEY=0x<private_key>
PROPOSAL_GAS_LIMIT=200000000
GOAT=true
```

Примечания:
- `GOAT=true` включает gov-режим для скриптов, где нужен impersonation (`scripts/utils/gov-signer.js`).
- `PROPOSAL_GAS_LIMIT` опционален, но полезен для тяжелых proposal-транзакций.

## 3) Запуск локальной zkSync-ноды (fork, protocol version 29)

В отдельном терминале:

```sh
cd zksync-withdraw
yarn hardhat node-zksync --fork https://mainnet.era.zksync.io --fork-block-number 68619742 --protocol-version 29
```

`node-zk` уже содержит кастомный запуск:
- `--protocol-version 29`
- `--cache none --reset-cache`
- форк от `ZKSYNC_RPC_URL` на `BLOCK_NUMBER`

## 4) Деплой только имплементации (без `upgradeTo`)

Команда использует кастомный флаг `--impl` (через `tasks/deploy.js`):

```sh
yarn hardhat deploy --network local --impl --tags UsdPlusToken
```

Опционально можно переопределить прокси:

```sh
PROXY_ADDRESS=0x... yarn hardhat deploy --network local --impl --tags StrategyZerolend
```

## 5) Подготовка proposal

Текущий `proposals/001_upgrade_strategy_zerolend.js` использует захардкоженные адреса.  
После деплоя имплементации обнови в скрипте нужные константы (например `usdPlusNewImpl`/адреса impl).

## 6) Запуск proposal локально

```sh
cd zksync-withdraw
yarn hardhat run proposals/001_upgrade_strategy_zerolend.js --network local
```

Локальные proposal-утилиты и детали impersonation: `docs/PROPOSALS_LOCAL.md`
