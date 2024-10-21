const { deployProxy, deployProxyMulti } = require('@overnight-contracts/common/utils/deployProxy');
const { deploySection, settingSection } = require('@overnight-contracts/common/utils/script-utils');
const { BASE } = require('@overnight-contracts/common/utils/assets');

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async name => {
        await deployProxyMulti(name, 'StrategySiloUsdc', deployments, save);
    });

    await settingSection('', async strategy => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: BASE.usdc,
        weth: BASE.weth,
        silo: '0x839Aa8B0641b77db2C9eFFEC724DD2dF46290FA2', // cbETH, WETH, USDC market
        siloIncentivesController: BASE.siloIncentivesController,
        siloLens: BASE.siloLens,
        siloToken: BASE.siloToken,        
        aerodromeRouter: BASE.aerodromeRouter,
        siloWethPool: "0x57bd5C33c8002A634b389Ab4de5e09eC1C31Dce7",
        wethUsdcPool: "0xcDAC0d6c6C59727a65F871236188350531885C43" // vAMM-WETH/USDC Basic Volatile 0.3%
    };
}

module.exports.tags = ['StrategySiloUsdcCbETH'];
module.exports.strategySiloUsdcCbETHParams = getParams;
