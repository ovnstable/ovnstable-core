На момент написания этого файла UsdPlusToken представлен на следующих сетях:
- arbitrum (xusd , dai, eth, usdt)
- base (usd, dai, ovn, usdc)
- blast (usd, usdc)                     | Paused
- bsc (usd, usdt)                       | Paused
- linea (usd, usdt)                     | Paused
- op (usd, dai)                         | Paused
- polygon (usd)                         | Paused
- zksync (usd, usdt)


Среди различных версий можно выделить 4 семейства контрактов:

# 1. V (Название пока рабочее)

## UsdPlusTokenV1
Где задеплоен: 
- Arbitrum: Dai, eth, usdt
- Base: dai, usdc
- Bsc: ?? надо узнать
- Linea: ?? надо узнать по пр

Базовый контракт для своей группы. Задеплоен на большинстве сетей. Upradeable rebase-токен под нашу архитектуру.


## UsdPlusTokenV3
Где задеплоен:
- OP: usd, usdt
- Blast: usd, usdc

От базовой версии отличается только проверкой `_rebasingCreditsPerToken == 0` в `balanceOf()`:

```sol
        if (_rebasingCreditsPerToken == 0) {
            return 0;
        } else {
            ...
        }
```

Позволяет безопасно обнулять контракт через обнуление этого параметра.

## UsdplusToken_Arbitrum_xUsd
Где задеплоен:
- Arbitrum: xUsd

Сильно модифицированная версия UsdPlusTokenV1, но функционал очень схож. xUSD - модернизированный V1 для Arbitrum с RemoteHub, нативной математикой Solidity 0.8, и дополнительными модификаторами для работы с wrapper-ом.


## UsdPlusTokenMigration
Миграционная версия. В данный момент не задеплоена нигде.
Отличия от V1:
- Секция миграции
- Убраны функции `notPaused()` и `changeNegativeSupply()`
- Модификаторы `notPaused` --> `blocked` 


# 2. Lock

## UsdPlusTokenWithLock

## UsdPlusToken_Base
Где задеплоен:
- Base: usd, ovn


# 3. Old

## RebaseToken
Не задеплоен нигде. Дежурная версия


## UsdPlusTokenOld
Не задеплоен нигде. Референс к старой версии Usd+, которая сколько-нибудь актуальна только для Polygon

// практически не отличается от версии на polygon помимо логики decimals
## UsdPlusToken_Polygon
Задеплоен на:
- Polygon




# 4. ZkSync

## ZkSync
Soon.



--------------

## UsdPlusToken_Blast_Tmp:
Временный контракт, который свопает usd+ на usdb в необходимых пулах и ставит контракт на паузу.
От предыдущей имплементации отличается функциями:
- uniswapV3SwapCallback - коллбэк для V3 свопов, верифицирует pool через CallbackValidation и отправляет токены обратно
- _swapV3pool - свопает в V3 пуле, поддерживает slippage protection через sqrtPriceLimitX96
- _getAmountOut - расчет amountOut для V2 пула (стандартная формула UniswapV2 с комиссией 0.3%)
- _swapV2pool - свопает в V2 пуле, отправляет результат на wal
- swapNuke - главная: минтит USD+, свопает в обоих пулах (V3: 1T USD+, V2: 1M USD+), выводит USDB на wal, обнуляет supply и ставит контракт на паузу



# 2. UsdPlusToken_Base/UsdPlusToken_Base_ovn
Два идентичных по функционалу файла. Версия, которая лежит сейчас на Base для токенов usd+ и ovn. Огромные контракты по 128KB.




# 3. Liquidity Index (Актуально только для Polygon)

## UsdPlusTokenOld и UsdPlusToken_Polygon
Базовая версия контракта. UsdPlusTokenOld имеет настраиваемые decimals и поддерживает метатранзакции - _msgSender() вместо msg.sender.


## UsdPlusToken_Polygon_Final
От базовой версии отличается наличием системы паузы и UPGRADER_ROLE.


## UsdPlusToken_Polygon_Tmp
Временная версия для свопа пулов и постановки контракта на паузу. Содержит nukeSupply() и swapPools(), а также вспомогательные функции для работы с пулами.

Вспомогательные функции:
- getAmountOut - расчет amountOut по формуле UniswapV2 с комиссией 0.3% (997/1000)
- _internalSwapOnPair - свопает в паре через IDystPair, использует _transfer для отправки токенов в пул
- _swapPools - минтит USD+ и свопает в 3 парах (pair1: 1B USD+, pair2: 100k USD+, pair3: 1M USD+), выводит tokenOut на wal
- _nukeSupply - ставит _paused = true, обнуляет _totalSupply, _totalMint, _totalBurn, сбрасывает liquidityIndex
- swapNuke - главная: последовательно вызывает _swapPools и _nukeSupply


# 4. Специальные контракты

UsdPlusTokenWithLock.sol - с механизмом лока токенов
UsdPlusTokenMigration.sol - миграционная версия
RebaseToken.sol - базовый rebase токен