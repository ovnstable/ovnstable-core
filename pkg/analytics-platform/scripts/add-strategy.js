const hre = require("hardhat");

const {getContract, getERC20, getPrice, showPlatform} = require('@overnight-contracts/common/utils/script-utils')
const {toE6} = require("@overnight-contracts/common/utils/decimals");
const {fromE6} = require("../../common/utils/decimals");
const axios = require("axios");
const {Contract} = require("ethers");

async function main() {

    let price = await getPrice();

    let analyticsPlatform = await getContract('AnalyticsPlatform', 'polygon');

    let strategyArrakisWeth = await getContract('StrategyArrakisWeth', 'platform');
    let strategyIzumi = await getContract('StrategyIzumi', 'platform');
    let strategyDodoUsdc = await getContract('StrategyDodoUsdc', 'platform');
    let strategyDodoUsdt = await getContract('StrategyDodoUsdt', 'platform');

    let usdc = await getERC20('usdc');

    // await (await usdc.transfer(analyticsPlatform.address, toE6(10), price)).wait();

    // console.log(fromE6(await usdc.balanceOf(analyticsPlatform.address)));

    await showPlatform(analyticsPlatform);

}





main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

