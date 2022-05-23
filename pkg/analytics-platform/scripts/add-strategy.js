const hre = require("hardhat");

const {getContract, getERC20, getPrice, showPlatform} = require('@overnight-contracts/common/utils/script-utils')
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");
const {fromUSDC} = require("../../common/utils/decimals");
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

    // await (await usdc.transfer(analyticsPlatform.address, toUSDC(10), price)).wait();

    // console.log(fromUSDC(await usdc.balanceOf(analyticsPlatform.address)));

    await showPlatform(analyticsPlatform);

}





main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

