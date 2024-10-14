const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
        await deployProxy('SwapSimulatorAerodrome', deployments, save);
    });

    await settingSection('', async (strategy) => {
        let simulationParams = {
            strategy: strategy.address,
            factory: '0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A'
        };
        let simulationProxy = await ethers.getContract('SwapSimulatorAerodrome');

        let strategyParams = await getParams();
        strategyParams.swapSimulatorAddress = simulationProxy.address;

        await (await simulationProxy.setSimulationParams(simulationParams)).wait();
        await (await strategy.setParams(strategyParams)).wait();
    });
};

async function getParams() {
    return {
        pool: '0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147',
        rewardSwapPool: '0xBE00fF35AF70E8415D0eB605a286D8A45466A4c1',
        tickRange: [0, 2],
        binSearchIterations: 100,
        swapSimulatorAddress: '',
        npmAddress: BASE.aerodromeNpm,
        aeroTokenAddress: BASE.aero,
        rewardSwapSlippageBP: 50
    };
}

module.exports.tags = ['StrategyAerodromeUsdc'];
