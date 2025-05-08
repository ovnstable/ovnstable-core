const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let the = '0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11';
let pair = '0x6321B57b6fdc14924be480c54e93294617E672aB';
let router = '0x20a304a7d126758dfe6B243D0fc515F83bCA8431';
let gauge = '0x41adA56DD5702906549a71666541a39B0DbcEb12';
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
                usdt: BSC.usdt,
                the: the,
                pair: pair,
                router: router,
                gauge: gauge,
                wombatPool: wombatPool,
                wombatRouter: BSC.wombatRouter,
                oracleBusd: BSC.chainlinkBusd,
                oracleUsdt: BSC.chainlinkUsdt,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyThenaBusdUsdt'];
