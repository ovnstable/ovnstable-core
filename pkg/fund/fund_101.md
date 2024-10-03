# Инструкция по использованию контрактов FundExchanger и MotivationalFund

1. Дать *approve* токенов USDC на адрес контракта `FundExchanger` ([0x92AB4cb069Ce1C0598bEBE24e3915484F82337B5](https://basescan.org/address/0x92AB4cb069Ce1C0598bEBE24e3915484F82337B5#writeProxyContract)).
2. С помощью метода `deposit` в `FundExchanger` можно внести средства в фонд. Чтобы вывести их, используйте метод `withdrawDeposit`.
3. Минт и сжигание *shares* осуществляется в контракте `MotivationalFund` ([0xEA4eE8e40109EC34C5eac187919427bcD9645D4E](https://basescan.org/address/0xea4ee8e40109ec34c5eac187919427bcd9645d4e#writeProxyContract)) с помощью методов `giveShares` и `burnShares` соответственно.
