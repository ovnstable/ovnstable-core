const { deployProxy, deployProxyMulti } = require('@overnight-contracts/common/utils/deployProxy');
const { deploySection, settingSection } = require('@overnight-contracts/common/utils/script-utils');
const { BASE } = require('@overnight-contracts/common/utils/assets');

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async name => {
        await deployProxyMulti(name, 'StrategySiloUsdc', deployments, save);
    });

    await settingSection('Silo USDC', async strategy => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: BASE.usdc,
        weth: BASE.weth,
        //silo: '0xb82a644a112AD609B89C684Ce2B73757f00D9C3D', // wUSD+, WETH, USDC market
        //silo: '0xDa79416990e7FA79E310Ab938B01ED75CBB64a90', // cbBTC, WETH, USDC market
        //silo: '0xEB42de7d17dfAFfD03AF48c2A51c3FB7274d3396', // wstETH, WETH, USDC market
        silo: '0x839Aa8B0641b77db2C9eFFEC724DD2dF46290FA2', // cbETH, WETH, USDC market
        siloIncentivesController: "0x626e6A8D4EB33D77A8b631ABfE2E98dA69E3100e",
        siloLens: BASE.siloLens,
        siloToken: BASE.siloToken,        
        aerodromeRouter: BASE.aerodromeRouter,
        siloWethPool: "0x57bd5C33c8002A634b389Ab4de5e09eC1C31Dce7",
        wethUsdcPool: "0x3548029694fbB241D45FB24Ba0cd9c9d4E745f16", // sAMM-WETH/USDC 0.05%
    };
}

module.exports.tags = ['StrategySiloUsdc'];
module.exports.strategySiloUsdc = getParams;
