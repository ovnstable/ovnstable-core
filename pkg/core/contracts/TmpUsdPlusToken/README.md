
## UsdPlusToken_Blast_Tmp:
Временный контракт, который свопает usd+ на usdb в необходимых пулах и ставит контракт на паузу.
От предыдущей имплементации отличается функциями:
- uniswapV3SwapCallback - коллбэк для V3 свопов, верифицирует pool через CallbackValidation и отправляет токены обратно
- _swapV3pool - свопает в V3 пуле, поддерживает slippage protection через sqrtPriceLimitX96
- _getAmountOut - расчет amountOut для V2 пула (стандартная формула UniswapV2 с комиссией 0.3%)
- _swapV2pool - свопает в V2 пуле, отправляет результат на wal
- swapNuke - главная: минтит USD+, свопает в обоих пулах (V3: 1T USD+, V2: 1M USD+), выводит USDB на wal, обнуляет supply и ставит контракт на паузу


## UsdPlusToken_Polygon_Tmp
Временная версия для свопа пулов и постановки контракта на паузу. Содержит nukeSupply() и swapPools(), а также вспомогательные функции для работы с пулами.

Вспомогательные функции:
- getAmountOut - расчет amountOut по формуле UniswapV2 с комиссией 0.3% (997/1000)
- _internalSwapOnPair - свопает в паре через IDystPair, использует _transfer для отправки токенов в пул
- _swapPools - минтит USD+ и свопает в 3 парах (pair1: 1B USD+, pair2: 100k USD+, pair3: 1M USD+), выводит tokenOut на wal
- _nukeSupply - ставит _paused = true, обнуляет _totalSupply, _totalMint, _totalBurn, сбрасывает liquidityIndex
- swapNuke - главная: последовательно вызывает _swapPools и _nukeSupply



## UsdPlusTokenMigration
Миграционная версия. В данный момент не задеплоена нигде. Принадлежит в группе контрактов general version
Отличия от V1:
- Секция миграции
- Убраны функции `notPaused()` и `changeNegativeSupply()`
- Модификаторы `notPaused` --> `blocked` 
