const {ethers} = require("hardhat");

let {FANTOM} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let poolIdDeiUsdc = "0x8b858eaf095a7337de6f9bc212993338773ca34e00020000000000000000023c";
let poolIdBeetsWFtm = "0xcde5a11a4acb4ee4c805352cec57e236bdbc3837000200000000000000000019";
let poolIdDeusWFtm = "0x0310c6929a70acd591d8ac4bf67632bb34aaa4eb00020000000000000000034e";
let poolIdWFtmUsdc = "0xcdf68a4d525ba2e90fe959c74330430a5a6b8226000200000000000000000008";
let pidBeethovenxDeiUsdc = 67;

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyBeethovenxDeiUsdc");

    await (await strategy.setTokens(FANTOM.usdc, FANTOM.bptDeiUsdc, FANTOM.beets, FANTOM.deus, FANTOM.wFtm, FANTOM.dei)).wait();
    await (await strategy.setParams(FANTOM.beethovenxVault, FANTOM.beethovenxMasterChef, poolIdDeiUsdc,
        poolIdBeetsWFtm, poolIdDeusWFtm, poolIdWFtmUsdc, pidBeethovenxDeiUsdc)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyBeethovenxDeiUsdc setting done');
};

module.exports.tags = ['setting', 'StrategyBeethovenxDeiUsdcSetting'];

