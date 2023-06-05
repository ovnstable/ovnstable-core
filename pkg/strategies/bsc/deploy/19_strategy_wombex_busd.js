const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let wom = '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1';
let wmx = '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD';
let lpBusd = '0xF319947eCe3823b790dd87b0A509396fE325745a';
let wmxLpBusd = '0x6e85a35fffe1326e230411f4f3c31c493b05263c';
let poolDepositor = '0x0842c4431E4704a8740637cdc48Ab44D16C7Fe82';
let pool = '0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        +
            await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        busd: BSC.busd,
        usdc: BSC.usdc,
        wom: wom,
        wmx: wmx,
        lpBusd: lpBusd,
        wmxLpBusd: wmxLpBusd,
        poolDepositor: poolDepositor,
        pool: pool,
        pancakeRouter: BSC.pancakeRouter,
        wombatRouter: BSC.wombatRouter,
        oracleBusd: BSC.chainlinkBusd,
        oracleUsdc: BSC.chainlinkUsdc,
    };
}

module.exports.tags = ['StrategyWombexBusd'];
module.exports.getParams = getParams;
module.exports.strategyWombexBusdParams = getParams;
