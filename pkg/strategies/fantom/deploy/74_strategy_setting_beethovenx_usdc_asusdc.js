const {ethers} = require("hardhat");

let {FANTOM} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let poolIdUsdcAsUsdc = "0x8bb1839393359895836688165f7c5878f8c81c5e0002000000000000000000e1";
let poolIdBeetsWFtm = "0xcde5a11a4acb4ee4c805352cec57e236bdbc3837000200000000000000000019";
let poolIdWFtmUsdc = "0xcdf68a4d525ba2e90fe959c74330430a5a6b8226000200000000000000000008";
let pidBeethovenxUsdcAsUsdc = 27;

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyBeethovenxUsdcAsUsdc");

    await (await strategy.setTokens(FANTOM.usdc, FANTOM.bptUsdcAsUSDC, FANTOM.beets, FANTOM.wFtm, FANTOM.asUsdc)).wait();
    await (await strategy.setParams(FANTOM.beethovenxVault, FANTOM.beethovenxMasterChef, poolIdUsdcAsUsdc,
        poolIdBeetsWFtm, poolIdWFtmUsdc, pidBeethovenxUsdcAsUsdc)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyBeethovenxUsdcAsUsdc setting done');
};

module.exports.tags = ['setting', 'StrategyBeethovenxUsdcAsUsdcSetting'];

