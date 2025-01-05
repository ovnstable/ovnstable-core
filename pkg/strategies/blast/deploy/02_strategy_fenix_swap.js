const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BLAST} = require('@overnight-contracts/common/utils/assets');
const {
    deploySection, 
    settingSection, 
    getContract, 
    initWallet, 
    transferETH, 
    execTimelock
} = require("@overnight-contracts/common/utils/script-utils");
const { Roles } = require('@overnight-contracts/common/utils/roles');

// hh deploy --tags StrategyFenixSwap --impl --verify --network blast 


let strategyName = 'StrategyFenixSwap';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(strategyName, async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });

};

async function getParams() {
    return {
        pool: '0x6a1de1841c5c3712e3bc7c75ce3d57dedec6915f',
        binSearchIterations: 20,
        swapSimulatorAddress: '0xD34063601f4f512bAB89c0c0bF8aa947cAa55885',
        npmAddress: '0x8881b3fb762d1d50e6172f621f107e24299aa1cd', 
        lowerTick: -1,
        upperTick: 0,
        fnxTokenAddress: '0x52f847356b38720b55ee18cb3e094ca11c85a192',
        poolFnxUsdb: '0xb3B4484bdFb6885f96421c3399B666a1c9D27Fca',
        rewardSwapSlippageBP: 500,
        liquidityDecreaseDeviationBP: 500
    };
}

module.exports.tags = [strategyName];
module.exports.getStrategyFenixSwapParams = getParams;