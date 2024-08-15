const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let usdPlus = '0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65';
let exchange = '0x5A8EEe279096052588DfCc4e8b466180490DB821';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdt: BSC.usdt,
                usdc: BSC.usdc,
                usdPlus: usdPlus,
                exchange: exchange,
                oracleUsdt: BSC.chainlinkUsdt,
                oracleUsdc: BSC.chainlinkUsdc,
                wombatRouter: BSC.wombatRouter,
                wombatPool: BSC.wombatPool,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyUsdPlusUsdt'];
