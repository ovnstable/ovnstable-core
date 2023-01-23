const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let the = '0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11';
let pair = '0x7e61c053527A7Af0c700aD9D2C8207E386273222';
let router = '0x20a304a7d126758dfe6B243D0fc515F83bCA8431';
let gauge = '0x11E79bC17cb1fF3D4f6A025412ac84960B20Ba81';
let wombatPool = '0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                busd: BSC.busd,
                usdc: BSC.usdc,
                the: the,
                pair: pair,
                router: router,
                gauge: gauge,
                wombatPool: wombatPool,
                wombatRouter: BSC.wombatRouter,
                oracleBusd: BSC.chainlinkBusd,
                oracleUsdc: BSC.chainlinkUsdc,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyThenaBusdUsdc'];
