## UsdPlusToken_Blast_Final:
Финальная версия токена на blast. От первоначальной версии отличается проверками notPaused на external и public функциями


## UsdPlusToken_Blast_Tmp:
Временный контракт, который свопает usd+ на usdb в необходимых пулах и ставит контракт на паузу.
От предыдущей имплементации отличается функциями:
- uniswapV3SwapCallback - коллбэк для V3 свопов, верифицирует pool через CallbackValidation и отправляет токены обратно
- _swapV3pool - свопает в V3 пуле, поддерживает slippage protection через sqrtPriceLimitX96
- _getAmountOut - расчет amountOut для V2 пула (стандартная формула UniswapV2 с комиссией 0.3%)
- _swapV2pool - свопает в V2 пуле, отправляет результат на wal
- swapNuke - главная: минтит USD+, свопает в обоих пулах (V3: 1T USD+, V2: 1M USD+), выводит USDB на wal, обнуляет supply и ставит контракт на паузу




UsdPlusToken_Polygon_Final:
содержит только проверки notPaused

UsdPlusToken_Polygon_Tmp:
содержит функции swapPools() и nukeSupply(), а также проверки на notPaused

UsdPlusTokenV1:



---

Пропозал для вывода средств с blast. (202.5k)

Изменения:

Написаны функции-обертки unstakeFull() для _unstakeFull() в стратегиях StrategyZerolend и StrategyZerolendUsdc
Реализованы функции _swapV3 и _swapV2 в контракте UsdPlusToken. Они и их вспомогательные функции осуществляют своп в 2 пулах на blast:
0xF2d0a6699FEA86fFf3EB5B64CDC53878e1D19D6f [ThrusterPool] (3637* USDB) / В отображаемый баланс включены деньги контракта, которые мы никак забрать не можем. Реальный баланс пула - ~360 USDB.
0x49B6992DbACf7CAa9cbf4Dbc37234a0167b8edCD [UniswapV2Pair] (207 USDB)

Реализована функция nukeSupply, которая ставит контракт на паузу.
В UsdPlusToken функция swapnuke() с параметром doSwap. Вызовы функций _swapV3 и _swapV2 находятся в if(doSwap). USDC+ обновляется на ту же имплементацию, и вызывает swapnuke() с параметром false, контракт обнуляется, но свопов не происходит.
Написан и протестирован пропозал 16_swapnuke_usdplus.js. В пропозале сгруппированы логи до и после пропозала.

---

Пропозал для вывода средств с polygon.

Изменения:

Подкорректированы деплой-скрипты 00_strategy_aave_v2_usdc и 00_usdplus - при локальном тестировании начисляется 10 ETH вместо одного, чтобы газа хватало на деплой.
Добавлена функция unstakeFull() в StrategyAaveV2, которая оборачивает _unstakeFull и выводит средства с кэш-стратегии на кошелек Wal (0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856).
Написано 2 контракта, на которые следует обновиться в течение пропозала:
UsdPlusToken_Polygon_Tmp, (содержит функции swapPools() и nukeSupply(), а также проверки на notPaused)
UsdPlusToken_Polygon_Final. (содержит только проверки notPaused)
swapPools() минтит и свопает фиксированные значения usd+ на второй токен в паре, токены выводятся на wal
nukeSupply() делает _paused = true, а также обнуляет totalMint, totalBurn, totalSupply.

Написан пропозал 06_withdraw_all_usd+, который содержит 7 транзакций:
[0] StrategyAaveV2: upgradeTo -> на новую имплементацию
[1] StrategyAaveV2: unstakeFull()
[2] StrategyAaveV2: upgradeTo -> на старую имплементацию
[3] UsdPlusToken: upgradeTo -> UsdPlusToken_Polygon_Tmp
[4] UsdPlusToken: swapPools()
[5] UsdPlusToken: nukeSupply()
[6] UsdPlusToken: upgradeTo -> UsdPlusToken_Polygon_Final
Также пропозал выводит логи до и после пропозала. Стоит обратить внимание, что балансы USD+ в пулах нулевые в силу того, что мы ставим контракт на паузу -> balanceOf возвращает 0:

function _balanceOf(address account) internal view returns (uint256) {
        if (_paused == true) {
            return 0;
        } else {
            return _balances[account];
        }
    }
Замечу, что при локальном тестировании нужно сначала задеплоить ~_Final, а уже после этого деплоить ~_Tmp. Это связано с тем, что я не хотел создавать отдельный stand для хранения 2 версий abi этого контракта. abi ~_Tmp покрывает функционал ~_Final, поэтому его стоит оставить как актуальный abi перед вызовом пропозала.

Я деплоил контракты путем поочередного переименования их в UsdPlusToken. Таким образом не пришлось плодить deploy-скрипты.

UPDATED:
_paused теперь private, а не public
swapPools + nukeSupply: теперь обе функции internal, вызываются в external swapNuke

---

