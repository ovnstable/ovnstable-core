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
        //silo: '0xb82a644a112AD609B89C684Ce2B73757f00D9C3D', // wUSD+, WETH, USDC market
        //silo: '0xDa79416990e7FA79E310Ab938B01ED75CBB64a90', // cbBTC, WETH, USDC market
        //silo: '0xEB42de7d17dfAFfD03AF48c2A51c3FB7274d3396', // wstETH, WETH, USDC market
        silo: '0x839Aa8B0641b77db2C9eFFEC724DD2dF46290FA2', // cbETH, WETH, USDC market
        siloLens: BASE.siloLens,
    };
}

module.exports.tags = ['StrategySiloUsdc'];
module.exports.strategySiloUsdc = getParams;
