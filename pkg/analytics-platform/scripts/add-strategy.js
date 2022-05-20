const hre = require("hardhat");

const {getContract, getERC20, getPrice } = require('@overnight-contracts/common/utils/script-utils')
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");
const {fromUSDC} = require("../../common/utils/decimals");

async function main() {

    let price = await getPrice();

    let analyticsPlatform = await getContract('AnalyticsPlatform', 'polygon');

    let strategyArrakisWeth = await getContract('StrategyArrakisWeth', 'platform');
    let strategyIzumi = await getContract('StrategyIzumi', 'platform');
    let strategyDodoUsdc = await getContract('StrategyDodoUsdc', 'platform');
    let strategyDodoUsdt = await getContract('StrategyDodoUsdt', 'platform');

    let usdc = await getERC20('usdc');

    // await (await usdc.transfer(analyticsPlatform.address, toUSDC(10), price)).wait();

    // console.log(fromUSDC(await usdc.balanceOf(analyticsPlatform.address)));

}





main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

