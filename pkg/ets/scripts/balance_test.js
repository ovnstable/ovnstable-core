const {getContract, getPrice, showHedgeM2M} = require("@overnight-contracts/common/utils/script-utils");
const {toE6} = require("@overnight-contracts/common/utils/decimals");
const BigNumber = require('bignumber.js');

async function main() {

    let healthFactorBefore0;
    let borrowAssetBefore0;
    let poolAssetBefore0;
    let deltaInAssetBefore0;
    let deltaInBpsBefore0;

    let healthFactorBefore;
    let borrowAssetBefore;
    let poolAssetBefore;
    let deltaInAssetBefore;
    let deltaInBpsBefore;

    let healthFactorAfter;
    let borrowAssetAfter;
    let poolAssetAfter;
    let deltaInAssetAfter;
    let deltaInBpsAfter;

    let strategy = await getContract('StrategyOpUsdc');
    let exchanger = await getContract('HedgeExchangerOpUsdc');
    let usdPlus = await getContract('UsdPlusToken');

    let params = await getPrice();
    params.gasLimit = 15000000;

    await showHedgeM2M();

    healthFactorBefore0 = await strategy.currentHealthFactor();
    let balances = await strategy.balances(params);

    borrowAssetBefore0 = new BigNumber(balances[0][1].toString());
    poolAssetBefore0 = new BigNumber(balances[2][1].toString());

    if (borrowAssetBefore0.comparedTo(poolAssetBefore0) == 1) {
        deltaInAssetBefore0 = borrowAssetBefore0.minus(poolAssetBefore0);
        deltaInBpsBefore0 = parseInt(deltaInAssetBefore0.multipliedBy(10000).div(borrowAssetBefore0).toFixed(0));
    } else {
        deltaInAssetBefore0 = poolAssetBefore0.minus(borrowAssetBefore0);
        deltaInBpsBefore0 = parseInt(deltaInAssetBefore0.multipliedBy(10000).div(poolAssetBefore0).toFixed(0));
    }

    let sum = toE6(50);

    await (await usdPlus.approve(exchanger.address, sum, params)).wait();
    console.log('Approve done');

    await (await exchanger.buy(sum, "", params)).wait();
    console.log('Buy done');

    const delay = 60 * 60 * 1000;
    await ethers.provider.send("evm_increaseTime", [delay])
    await ethers.provider.send('evm_mine');

    await showHedgeM2M();

    healthFactorBefore = await strategy.currentHealthFactor();
    balances = await strategy.balances(params);

    borrowAssetBefore = new BigNumber(balances[0][1].toString());
    poolAssetBefore = new BigNumber(balances[2][1].toString());

    if (borrowAssetBefore.comparedTo(poolAssetBefore) == 1) {
        deltaInAssetBefore = borrowAssetBefore.minus(poolAssetBefore);
        deltaInBpsBefore = parseInt(deltaInAssetBefore.multipliedBy(10000).div(borrowAssetBefore).toFixed(0));
    } else {
        deltaInAssetBefore = poolAssetBefore.minus(borrowAssetBefore);
        deltaInBpsBefore = parseInt(deltaInAssetBefore.multipliedBy(10000).div(poolAssetBefore).toFixed(0));
    }

    await (await exchanger.balance(params)).wait();

    healthFactorAfter = await strategy.currentHealthFactor();
    balances = await strategy.balances(params);

    borrowAssetAfter = new BigNumber(balances[0][1].toString());
    poolAssetAfter = new BigNumber(balances[2][1].toString());

    if (borrowAssetAfter.comparedTo(poolAssetAfter) == 1) {
        deltaInAssetAfter = borrowAssetAfter.minus(poolAssetAfter);
        deltaInBpsAfter = parseInt(deltaInAssetAfter.multipliedBy(10000).div(borrowAssetAfter).toFixed(0));
    } else {
        deltaInAssetAfter = poolAssetAfter.minus(borrowAssetAfter);
        deltaInBpsAfter = parseInt(deltaInAssetAfter.multipliedBy(10000).div(poolAssetAfter).toFixed(0));
    }

    await showHedgeM2M();

    console.log("healthFactorBefore0: " + healthFactorBefore0);
    console.log("borrowAssetBefore0: " + borrowAssetBefore0);
    console.log("poolAssetBefore0: " + poolAssetBefore0);
    console.log("deltaInAssetBefore0: " + deltaInAssetBefore0);
    console.log("deltaInBpsBefore0: " + deltaInBpsBefore0);
    console.log("healthFactorBefore: " + healthFactorBefore);
    console.log("borrowAssetBefore: " + borrowAssetBefore);
    console.log("poolAssetBefore: " + poolAssetBefore);
    console.log("deltaInAssetBefore: " + deltaInAssetBefore);
    console.log("deltaInBpsBefore: " + deltaInBpsBefore);
    console.log("healthFactorAfter: " + healthFactorAfter);
    console.log("borrowAssetAfter: " + borrowAssetAfter);
    console.log("poolAssetAfter: " + poolAssetAfter);
    console.log("deltaInAssetAfter: " + deltaInAssetAfter);
    console.log("deltaInBpsAfter: " + deltaInBpsAfter);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });