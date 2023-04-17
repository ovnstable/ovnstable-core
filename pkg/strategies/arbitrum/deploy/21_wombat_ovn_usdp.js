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
        poolWombat: '0xCF20fDA54e37f3fB456930f02fb07FccF49e4849', // Overnight pool
        masterWombat: '0x62a83c6791a3d7950d823bb71a38e47252b6b6f4',
        wombatRouter: ARBITRUM.wombatRouter,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee0: 3000, //0.3% WOM->USDT
        poolFee1: 100,   //0.01% USDT->USDC
        wombexBooster: '0x4181E561b42fDaD14c68b0794c215DeB9Bc80c8F',
        wombexBoosterPid: 9,
        wombexVault: '0xEE8e44Ac5cD5D22704e09c1cFB11A601a5d020d6',
        camelorRouter: ARBITRUM.camelorRouter
    }
}

module.exports.tags = ['StrategyWombatOvnUsdp'];
module.exports.getParams = getParams
module.exports.strategyWombatOvnUsdpParams = getParams
