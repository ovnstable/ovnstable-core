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

# 1. General Version

## UsdPlusTokenV1
Где задеплоен: 
- Arbitrum: Dai, eth, usdt              (v)
- Base: dai, usdc                       (v)


Базовый контракт для своей группы. Задеплоен на большинстве сетей. Upradeable rebase-токен под нашу архитектуру.


## UsdPlusTokenV3
Где задеплоен:
- OP: usd, dai                          (v)
- Blast: usd, usdc                      (v)
- Bsc: usd, usdt                        (v)
- Linea: usd, usdt                      (v)

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
- Arbitrum: xUsd                        (v)

Сильно модифицированная версия UsdPlusTokenV1, но функционал очень схож. xUSD - модернизированный V1 для Arbitrum с RemoteHub, нативной математикой Solidity 0.8, и дополнительными модификаторами для работы с wrapper-ом.

# 2. Lock

## UsdPlusTokenWithLock

## UsdPlusToken_Base
Где задеплоен:
- Base: usd, ovn                        (v)


# 3. Old

## UsdPlusTokenOld
Не задеплоен нигде. Референс к старой версии Usd+, которая сколько-нибудь актуальна только для Polygon

// практически не отличается от версии на polygon помимо логики decimals
## UsdPlusToken_Polygon
Задеплоен на:
- Polygon                               (v)



# 4. ZkSync

## ZkSync
Soon.
