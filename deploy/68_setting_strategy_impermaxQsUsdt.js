const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));



let impermaxRouter = "0x7c79a1c2152665273ebd50e9e88d92a887a83ba0";

let balancerPoolId = "0x0d34e5dd4d8f043557145598e4e2dc286b35fd4f000000000000000000000068";
let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    // await impermaxQsUsdt("0xEaB52C4eFBbB54505EB3FC804A29Dcf263668965", "StrategyImpermaxQsUsdcUsdt");
    await impermaxQsUsdt("0xed618c29abc8fa6ee05b33051b3cdb4a1efb7924", "StrategyImpermaxQsMaticUsdt");
    // await impermaxQsUsdt("0x64ce3e18c091468acf30bd861692a74ce48a0c7c", "StrategyImpermaxQsWethUsdt");
    // await impermaxQsUsdt("0x65a0effbb58e4beb2f3a40fdca740f85585213", "StrategyImpermaxQsMaiUsdt");
};

module.exports.tags = ['setting', 'StrategyImpermaxQsUsdtSetting'];



async function impermaxQsUsdt(imxbToken, strategyName){


    const strategy = await ethers.getContract(strategyName);
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setTokens(assets.usdc, assets.usdt, imxbToken)).wait();
    await (await strategy.setParams(impermaxRouter, balancerVault, balancerPoolId)).wait();
    await (await strategy.setPortfolioManager(pm.address)).wait();

    console.log('StrategyImpermaxQsUsdt setting done');
}
