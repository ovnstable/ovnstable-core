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

    let timelock = await getContract('AgentTimelock');
    await transferETH(1, '0x8df424e487De4218B347e1798efA11A078fecE90');
    await transferETH(1, timelock.address); //0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    await transferETH(1, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');

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
        swapSimulatorAddress: '0xD34063601f4f512bAB89c0c0bF8aa947cAa55885', // SwapSimulatorFenix address 
        npmAddress: '0x8881b3fb762d1d50e6172f621f107e24299aa1cd', 
        lowerTick: -1,
        upperTick: 0,
        fnxTokenAddress: '0x52f847356b38720b55ee18cb3e094ca11c85a192',
        poolFnxUsdb: '0xb3B4484bdFb6885f96421c3399B666a1c9D27Fca',
        rewardSwapSlippageBP: 50,
        liquidityDecreaseDeviationBP: 500
    };
}

module.exports.tags = [strategyName];
module.exports.getParams = getParams;