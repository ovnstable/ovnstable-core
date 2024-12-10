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

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let wallet = await initWallet();

    // await transferETH(10, wallet.address);

    await deploySection(async (name) => {
        // await deployProxy("SwapSimulatorAerodrome", deployments, save);
        await deployProxy(name, deployments, save, {
            factoryOptions: {
                signer: wallet
            },
            // gasPrice: 4221834
        });
    });

    await settingSection('', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    }, wallet);
};
    
async function getParams() {
    return {
        pool: '0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147',
        rewardSwapPool: '0x6cDcb1C4A4D1C3C6d054b27AC5B77e89eAFb971d', // v2 pool
        // rewardSwapPool: '0xBE00fF35AF70E8415D0eB605a286D8A45466A4c1', // cl pool
        tickRange: [-1, 0],
        binSearchIterations: 20,
        swapSimulatorAddress: "0x8F573ABeb41c232faA1661E222c8E4F658b83B06",
        npmAddress: BASE.aerodromeNpm,
        aeroTokenAddress: BASE.aero,
        rewardSwapSlippageBP: 50,
        swapRouter: BASE.aerodromeRouter,
        treasury: COMMON.rewardWallet,
        treasuryShare: 8000,
        // bribeVotingReward: '0xf8a309b830873eeb39d07b33071f93493594b5f3',
        // exchange: "0x868D69875BF274E7Bd3d8b97b1Acd89dbdeb67af"
    };
}

module.exports.tags = ['StrategyAerodromeSwapUsdc'];
module.exports.strategyAerodromeUsdcParams = getParams;
