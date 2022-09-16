const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let velo = '0x3c8B650257cFb5f272f799F5e2b4e65093a11a05';
let router = '0x9c12939390052919af3155f41bf4160fd3666a6f';
let gauge = '0xe2cec8ab811b648ba7b1691ce08d5e800dd0a60a';
let pair = '0x79c912fef520be002c2b6e57ec4324e260f38e50'; //vAMM-WETH/USDC
let poolFee0 = 3000; // 0.3%
let poolFee1 = 500; // 0.05%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setParams(
            {
                usdcToken: OPTIMISM.usdc,
                wethToken: OPTIMISM.weth,
                veloToken: velo,
                router: router,
                gauge: gauge,
                pair: pair,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleWeth: OPTIMISM.oracleWeth,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolFee0: poolFee0,
                poolFee1: poolFee1
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyVelodromeUsdcWeth'];
