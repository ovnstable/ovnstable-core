const {ethers} = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let meshToken = '0x82362Ec182Db3Cf7829014Bc61E9BE8a2E82868a';
let meshSwapUsdc = '0x590Cd248e16466F747e74D4cfa6C48f597059704';
let meshSwapRouter = '0x10f4A785F458Bc144e3706575924889954946639';
let recipient = '0xe497285e466227f4e8648209e34b465daa1f90a0';

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyMeshSwapUsdc");

    await (await strategy.setTokens(POLYGON.usdc, meshToken)).wait();
    await (await strategy.setParams(meshSwapUsdc, meshSwapRouter, recipient)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyMeshSwapUsdc setting done');
};

module.exports.tags = ['setting', 'StrategyMeshSwapUsdcSetting'];
