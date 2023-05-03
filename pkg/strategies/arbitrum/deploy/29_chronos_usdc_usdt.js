const {deployProxyMulti, deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM, OPTIMISM} = require("@overnight-contracts/common/utils/assets");


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
        chr: ARBITRUM.chr,
        router: ARBITRUM.chronosRouter,
        gauge: '0x026acd3425132870986561b7e3f2f15f5920e119',
        pair: '0xC9445A9AFe8E48c71459aEdf956eD950e983eC5A', // USDC/DAI
        nft: '0x9774ae804e6662385f5ab9b01417bc2c6e548468', // MaNFTs
        oracleUsdc: ARBITRUM.oracleUsdc,
        oracleUsdt: ARBITRUM.oracleUsdt,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        gmxVault: ARBITRUM.gmxVault,
        gmxReader: ARBITRUM.gmxReader,
        gmxRouter: ARBITRUM.gmxRouter,
    }
}

module.exports.tags = ['StrategyChronosUsdcUsdt'];
module.exports.getParams = getParams
module.exports.strategyChronosUsdcUsdtParams = getParams
