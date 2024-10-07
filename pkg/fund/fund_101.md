# Подробная инструкция по использованию контрактов FundExchanger и MotivationalFund

## 1. Одобрение токенов USDC для контракта FundExchanger

Перед тем как взаимодействовать с контрактом **FundExchanger** ([0x92AB4cb069Ce1C0598bEBE24e3915484F82337B5](https://basescan.org/address/0x92AB4cb069Ce1C0598bEBE24e3915484F82337B5#writeProxyContract)), необходимо дать разрешение на использование ваших токенов USDC этим контрактом. Это делается через функцию `approve` в контракте [USDC](https://basescan.org/token/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913#writeProxyContract).

### Шаги:

1. **Перейдите на страницу контракта USDC** в обозревателе блокчейна [BaseScan](https://basescan.org/token/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913#writeProxyContract).

2. **Подключитесь к вашему кошельку** с USDC токенами.

3. **Найдите функцию `approve`**:

   - Перейдите во вкладку **"Contract"**.
   - Выберите **"Write as Proxy"**.
   - Подключите Web3.

4. **Вызовите функцию `approve`**:

   - **spender**: Введите адрес контракта **FundExchanger**: `0x92AB4cb069Ce1C0598bEBE24e3915484F82337B5`.
   - **amount**: Укажите количество токенов USDC, которое вы хотите одобрить (учитывая decimals, 6 для USDC). 

5. **Подтвердите транзакцию** в вашем кошельке.

## 2. Депозит и вывод средств через FundExchanger

После одобрения вы можете вносить средства в фонд и выводить их по необходимости.

### Депозит средств

1. **Перейдите на страницу контракта FundExchanger**: [0x92AB4cb069Ce1C0598bEBE24e3915484F82337B5](https://basescan.org/address/0x92AB4cb069Ce1C0598bEBE24e3915484F82337B5#writeProxyContract).

2. **Подключитесь к вашему кошельку** через Web3.

3. **Найдите функцию `deposit`** во вкладке **"Write as Proxy"**.

4. **Вызовите функцию `deposit`**:

   - **amount**: Введите количество USDC, которое вы хотите внести (с учетом decimals).

### Вывод средств

1. **Найдите функцию `withdrawDeposit`** в том же контракте.

2. **Вызовите функцию `withdrawDeposit`**:

    - **amount**: Введите количество USDC, которое вы хотите вывести (с учетом decimals).

## 3. Управление shares через MotivationalFund

Контракт **MotivationalFund** позволяет передавать и отзывать *shares*

### Передача долей (`giveShares`)

1. **Перейдите на страницу контракта MotivationalFund**: [0xEA4eE8e40109EC34C5eac187919427bcD9645D4E](https://basescan.org/address/0xea4ee8e40109ec34c5eac187919427bcd9645d4e#writeProxyContract).

2. **Подключитесь к вашему кошельку** через Web3.

3. **Найдите функцию `giveShares`** во вкладке **"Write as Proxy"**.

4. **Вызовите функцию `giveShares`**:

   - **recipient**: Введите адрес получателя долей.
   - **amount**: Укажите количество долей для передачи.

5. **Подтвердите транзакцию** и дождитесь ее подтверждения.

### Отзыв долей (`burnShares`)

1. **Найдите функцию `burnShares`** в контракте MotivationalFund.

2. **Вызовите функцию `burnShares`**:

   - **amount**: Укажите количество долей, которые вы хотите отозвать.


## Полезные ссылки

- **FundExchanger контракт**: [Просмотр и взаимодействие](https://basescan.org/address/0x92AB4cb069Ce1C0598bEBE24e3915484F82337B5#writeProxyContract)
- **MotivationalFund контракт**: [Просмотр и взаимодействие](https://basescan.org/address/0xea4ee8e40109ec34c5eac187919427bcd9645d4e#writeProxyContract)
- **USDC контракт**: [Approve токенов](https://basescan.org/token/0x...#writeProxyContract)

