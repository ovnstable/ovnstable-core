const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let usdtPlus = '0x5335E87930b410b8C5BB4D43c3360ACa15ec0C8C';
let exchange = '0xd3F827C0b1D224aeBCD69c449602bBCb427Cb708';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: BSC.usdc,
        usdt: BSC.usdt,
        usdtPlus: usdtPlus,
        exchange: exchange,
        oracleUsdc: BSC.chainlinkUsdc,
        oracleUsdt: BSC.chainlinkUsdt,
        pancakeSwapV3Router: BSC.pancakeSwapV3Router,
    }
}

module.exports.tags = ['StrategyUsdcUsdtPlus'];
module.exports.strategyUsdcUsdtPlusParams = getParams;
