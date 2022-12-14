const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const { ethers } = require("hardhat");

let bbamUsdc = "0xF93579002DBE8046c43FEfE86ec78b1112247BB8";
let bbamUsdt = "0xFf4ce5AAAb5a627bf82f4A571AB1cE94Aa365eA6";
let bbamDai = "0x178E029173417b1F9C8bC16DCeC6f697bC323746";
let bpt = "0x48e6B98ef6329f8f0A30eBB8c7C960330d648085";
let vault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let gauge = "0x1c514fEc643AdD86aeF0ef14F4add28cC3425306";
let bbamUsdcPoolId = "0xf93579002dbe8046c43fefe86ec78b1112247bb8000000000000000000000759";
let bbamUsdtPoolId = "0xff4ce5aaab5a627bf82f4a571ab1ce94aa365ea600000000000000000000075a";
let bbamDaiPoolId = "0x178e029173417b1f9c8bc16dcec6f697bc323746000000000000000000000758";
let bbamUsdPoolId = "0x48e6b98ef6329f8f0a30ebb8c7c960330d64808500000000000000000000075b";

module.exports = async ({deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('FlashLoanAttackStrategy', {
        from: deployer,
        args: [POLYGON.aaveProvider],
        log: true,
    });

    const attackContract = await ethers.getContract("FlashLoanAttackStrategy");

    await (await attackContract.setParams(
        {
            usdc: POLYGON.usdc,
            usdt: POLYGON.usdt,
            dai: POLYGON.dai,
            bbamUsdc: bbamUsdc,
            bbamUsdt: bbamUsdt,
            bbamDai: bbamDai,
            bpt: bpt,
            vault: vault,
            gauge: gauge,
            bbamUsdcPoolId: bbamUsdcPoolId,
            bbamUsdtPoolId: bbamUsdtPoolId,
            bbamDaiPoolId: bbamDaiPoolId,
            bbamUsdPoolId: bbamUsdPoolId,
        }
    )).wait();

    console.log("FlashLoanAttackStrategy deployed");
};

module.exports.tags = ['FlashLoanAttackStrategy'];
