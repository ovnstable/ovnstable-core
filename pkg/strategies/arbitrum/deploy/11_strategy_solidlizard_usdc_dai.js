const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection, getContract} = require("@overnight-contracts/common/utils/script-utils");


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setParams(
            {

                usdc: ARBITRUM.usdc,
                dai: ARBITRUM.dai,
                sliz: ARBITRUM.sliz,
                pair: '0x07d7F291e731A41D3F0EA4F1AE5b6d920ffb3Fe0', // DAI/USDC
                router: ARBITRUM.solidLizardRouter,
                gauge: '0x884c28296b6ec728ac27bfe7579419709514d154',
                oracleDai: ARBITRUM.oracleDai,
                oracleUsdc: ARBITRUM.oracleUsdc,
                gmxRouter: ARBITRUM.gmxRouter,
                gmxVault: ARBITRUM.gmxVault,
                gmxReader: ARBITRUM.gmxReader,
                uniswapV3Router: ARBITRUM.uniswapV3Router,
                poolFee: 500, //0.05%
            }
        )).wait();
    });
};

module.exports.tags = ['StrategySolidlizardUsdcDai'];
