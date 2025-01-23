const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
const {
    deploySection, 
    settingSection, 
    getContract, 
    initWallet, 
    transferETH, 
    execTimelock
} = require("@overnight-contracts/common/utils/script-utils");
const { Roles } = require('@overnight-contracts/common/utils/roles');

let strategyName = 'StrategyAerodromeSwapUsdc';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    console.log("@1");

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    console.log("@2");
};
    
async function getParams() {
    return {
        pool: '0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147',
        rewardSwapPool: '0x6cDcb1C4A4D1C3C6d054b27AC5B77e89eAFb971d', // v2 pool
        binSearchIterations: 20,
        swapSimulatorAddress: "0x8F573ABeb41c232faA1661E222c8E4F658b83B06",
        npmAddress: BASE.aerodromeNpm,
        aeroTokenAddress: BASE.aero,
        rewardSwapSlippageBP: 50,
        swapRouter: BASE.aerodromeRouter,
        treasury: COMMON.rewardWallet,
        treasuryShare: 8000,
        lowerTick: -1,
        upperTick: 0,
        liquidityDecreaseDeviationBP: 500
    };
}

module.exports.tags = [strategyName];
module.exports.strategyAerodromeUsdcParams = getParams;
