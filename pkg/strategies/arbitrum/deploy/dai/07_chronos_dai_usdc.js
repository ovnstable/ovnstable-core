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
        dai: ARBITRUM.dai,
        chr: ARBITRUM.chr,
        router: ARBITRUM.chronosRouter,
        gauge: '0xd3b8de04b90b4bae249e5f0b30ae98d7f02b6dab',
        pair: '0xfd1e3458C7a1D3506f5cC6180A53F1e60f9D6BEa', // USDC/DAI
        nft: '0x9774ae804e6662385f5ab9b01417bc2c6e548468', // MaNFTs
        oracleUsdc: ARBITRUM.oracleUsdc,
        oracleDai: ARBITRUM.oracleDai,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        gmxVault: ARBITRUM.gmxVault,
        gmxReader: ARBITRUM.gmxReader,
        gmxRouter: ARBITRUM.gmxRouter,
    }
}

module.exports.tags = ['StrategyChronosDaiUsdc'];
module.exports.getParams = getParams
module.exports.strategyChronosDaiUsdcParams = getParams
