const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

let dquickToken = '0x958d208Cdf087843e9AD98d23823d32E17d723A1';
let quickToken = '0xB5C064F955D8e7F38fE0460C556a72987494eE17';
let nonfungiblePositionManager = '0x8eF88E4c7CfbbaC1C163f7eddd4B578792201de6';
let farmingCenter = '0x7F281A8cdF66eF5e9db8434Ec6D97acc1bc01E78';
let pool = '0x7B925e617aefd7FB3a93Abe3a701135D7a1Ba710';
let tickLower = -180;
let tickUpper = 120;


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdcToken: POLYGON.usdc,
                usdtToken: POLYGON.usdt,
                wmaticToken: POLYGON.wMatic,
                dquickToken: dquickToken,
                quickToken: quickToken,
                nonfungiblePositionManager: nonfungiblePositionManager,
                farmingCenter: farmingCenter,
                pool: pool,
                synapseSwapRouter: POLYGON.synapseSwapRouter,
                quickSwapRouter: POLYGON.quickSwapRouter,
                oracleUsdc: POLYGON.oracleChainlinkUsdc,
                oracleUsdt: POLYGON.oracleChainlinkUsdt,
                tickLower: tickLower,
                tickUpper: tickUpper
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyQuickSwapV3UsdcUsdt'];
