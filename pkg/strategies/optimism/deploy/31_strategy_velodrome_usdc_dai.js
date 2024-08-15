const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let gauge = '0xc4ff55a961bc04b880e60219ccbbdd139c6451a4';
let pair = '0x4F7ebc19844259386DBdDB7b2eB759eeFc6F8353';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdc: OPTIMISM.usdc,
                dai: OPTIMISM.dai,
                velo: OPTIMISM.velo,
                router: OPTIMISM.velodromeRouter,
                gauge: gauge,
                pair: pair,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleDai: OPTIMISM.oracleDai,
                curvePool: OPTIMISM.curve3Pool
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyVelodromeUsdcDai'];
