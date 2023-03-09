const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection, getContract} = require("@overnight-contracts/common/utils/script-utils");


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {


        let usdPlus = await getContract("UsdPlusToken", "arbitrum");
        let exchange = await getContract("Exchange", "arbitrum");

        await (await strategy.setParams(
            {

                usdc: ARBITRUM.usdc,
                dai: ARBITRUM.dai,
                usdPlus: usdPlus.address,
                exchange: exchange.address,
                oracleDai: ARBITRUM.oracleDai,
                oracleUsdc: ARBITRUM.oracleUsdc,
                gmxRouter: ARBITRUM.gmxRouter,
                zyberPool: ARBITRUM.zyber3Pool,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyUsdPlusDai'];
