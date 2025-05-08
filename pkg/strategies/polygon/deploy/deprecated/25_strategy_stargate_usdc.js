const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

let stgToken = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590';
let stargateRouter = '0x45A01E4e04F14f7A4a6702c74187c5F6222033cd';
let pool = '0x1205f31718499dBf1fCa446663B532Ef87481fe1';
let lpStaking = '0x8731d54E9D02c286767d56ac03e8037C07e01e98';
let pid = 0;
let sushiSwapRouter = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setTokens(POLYGON.usdc, stgToken)).wait();
        await (await strategy.setParams(stargateRouter, pool, lpStaking, pid, sushiSwapRouter)).wait();
    });
};

module.exports.tags = ['StrategyStargateUsdc'];
