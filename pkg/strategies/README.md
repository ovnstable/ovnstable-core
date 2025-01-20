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



## Скрипт для повышения и понижения объема в SWAP-стратегиях

Рассмотрим принципы работы данного скрипта на примере стратегии AerodromeSwap и пула USDC / USDC+. В рамках излагаемой задачи будем считать, что 1USDC = 1USDC+.

### Повышение объема 
В нашем примере будем повышать количество USDC+ в пуле. Рассмотрим, одну итерацию скрипта.

**Алгоритм**

0. На балансе кошелька есть USDC в количестве N

1. Мы минтим на эту сумму N USDC+ 
В этот момент в CASH-стратегии становится на N USDC больше

2. Меняем N USDC+ на N USDC в пуле
Таким образом в пуле уменьшается количество USDC и цена двигается вправо

3. Пересчитываем какую долю портфеля должна составлять CASH стратегия 
Это необходимо, потому что с каждой итерацией объем SWAP-стратегии увеличивается. Значит, общий объем портфеля растет. Значит, (так как доля CASH-стратегии фиксирована) растет и количество денег в CASH-стратегии. Проблема в том, что эта прибавка берется именно из USDC, которые находятся в SWAP-стратегии. Таким образом количество USDC в пуле уменьшается. Мы же хотим, чтобы оно было постоянно. Поэтому мы должны рассчитать, насколько нужно сократить долю CASH стратегии.

Целевая доля CASH стратегии в портфеле считается по следующей формуле:

```
cashTargetShare = (cashStrategyInitAmount / (swapStrategyInitAmount + i * N + cashStrategyInitAmount))
```

cashStrategyInitAmount - количество USDC в CASH-стратегии изначально 
swapStrategyInitAmount - количество USDC в SWAP-стратегии изначально 
i - номер итерации цикла

4. Производим балансировку 
Это позволяет перебросить ту часть денег, на которую увеличилось количество денег в CASH-стратегии, обратно в SWAP-стратегию


**Замечания**

- Обратите внимание, что изменения весов для балансировки происходит не каждую итерацию, а только когда накопится достаточная разница между текущим и целевым значениями веса CASH-стратегии
- Необходимо, чтобы N было меньше, чем количество USDC в пуле


### Понижение объема 

Понижение работает почти полностью аналогично, поэтому здесь более коротко.

**Алгоритм**

1. На балансе кошелька есть USDC+ в количестве N

2. Мы бёрним эти USDC+ и получаем на баланс кошелька N USDC

3. Меняем эти N USDC на N USDC+ в пуле 

4. Пересчитываем долю CASH-стратегии в портфеле
Так как объем портфеля уменьшается, нам нужно увеличить долю CASH стратегии для сохранения ее абсолютного значения постоянным 

5. Производим балансировку 
То есть перебрасываем излишек из SWAP- в CASH-стратегию


**Замечания**

- Важно понимать, что, если в пуле осталось меньше USDC+, чем N, то скрутить их дальше будет невозможно 