const {deployProxyMulti, deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection, getContract} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");


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
        usdc: ARBITRUM.usdc,
        usdt: ARBITRUM.usdt,
        usdp: ARBITRUM.usdPlus,
        wom: ARBITRUM.wom,
        wmx: ARBITRUM.wmx,
        assetWombat: '0xBd7568d25338940ba212e3F299D2cCC138fA35F0', // USD+
        poolWombat: ARBITRUM.wombatOvnPool,
        wombatRouter: ARBITRUM.wombatRouter,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee0: 3000, //0.3% WOM->USDT
        poolFee1: 100,   //0.01% USDT->USDC
        wombexBooster: "0x0A251FA652B59592E60f4bfBce3cD9Cb3d3bd5E9",
        wombexBoosterPid: 9,
        wombexVault: '0xEE8e44Ac5cD5D22704e09c1cFB11A601a5d020d6',
        camelotRouter: ARBITRUM.camelotRouter
    }
}

module.exports.tags = ['StrategyWombatOvnUsdp'];
module.exports.getParams = getParams
module.exports.strategyWombatOvnUsdpParams = getParams
