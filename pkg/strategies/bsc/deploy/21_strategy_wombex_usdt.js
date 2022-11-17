const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let wom = '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1';
let wmx = '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD';
let lpUsdt = '0x4F95fE57BEA74b7F642cF9c097311959B9b988F7';
let wmxLpUsdt = '0x1964ffe993d1da4ca0c717c9ea16a7846b4f13ab';
let poolDepositor = '0xBc502Eb6c9bAD77929dabeF3155967E0ABfA9209';
let pool = '0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0';
let wombatRouter = '0x19609B03C976CCA288fbDae5c21d4290e9a4aDD7';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {+
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                busd: BSC.busd,
                usdt: BSC.usdt,
                wom: wom,
                wmx: wmx,
                lpUsdt: lpUsdt,
                wmxLpUsdt: wmxLpUsdt,
                poolDepositor: poolDepositor,
                pool: pool,
                pancakeRouter: BSC.pancakeRouter,
                wombatRouter: wombatRouter,
                oracleBusd: BSC.chainlinkBusd,
                oracleUsdt: BSC.chainlinkUsdt,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyWombexUsdt'];
