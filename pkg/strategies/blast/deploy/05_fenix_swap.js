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

let strategyName = 'StrategyFenixSwap';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let timelock = await getContract('AgentTimelock');
    let pm = await getContract('PortfolioManager', 'blast');
    console.log("timelockAccount is", timelock.address)

    let wallet = await initWallet();

    await transferETH(10, timelock.address);
    await transferETH(10, wallet.address);

    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545');

    console.log("@2")
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [timelock.address],
    });

    console.log("@3")
    const timelockAccount = await hre.ethers.getSigner(timelock.address);
    
    let thisStrategy = await getContract('StrategyFenixSwap', 'blast');

    console.log("@4")
    await (await thisStrategy.connect(timelockAccount).grantRole('0x0000000000000000000000000000000000000000000000000000000000000000', '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'));

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [timelock.address],
    });

    
    console.log("@5")
    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    console.log("@6")
    await settingSection(strategyName, async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });







    // const timelockAccount = await hre.ethers.getSigner(timelock.address);
    
    // console.log("hardhat_impersonateAccount DONE")

    // await (await pm.connect(timelockAccount).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), timelockAccount.address));

    // console.log("PORTFOLIO_AGENT_ROLE granted")

    // await (await pm.connect(timelockAccount).balance(gas)).wait();

    // await hre.network.provider.request({
    //     method: "hardhat_stopImpersonatingAccount",
    //     params: [timelock.address],
    // });
};

async function getParams() {
    return {
        pool: '0x6a1de1841c5c3712e3bc7c75ce3d57dedec6915f',
        tickRange: [-1, 0],
        binSearchIterations: 20,
        swapSimulatorAddress: '0xD34063601f4f512bAB89c0c0bF8aa947cAa55885', // SwapSimulatorFenix address 
        npmAddress: '0x8881b3fb762d1d50e6172f621f107e24299aa1cd', 

        fnxTokenAddress: '0x52f847356b38720b55ee18cb3e094ca11c85a192',

        // Fenix's pools for reward swaping
        poolFnxUsdb: '0xb3B4484bdFb6885f96421c3399B666a1c9D27Fca',
        poolUsdbUsdPlus: '0x52f847356b38720b55ee18cb3e094ca11c85a192',

        rewardSwapSlippageBP: 50
    };
}

module.exports.tags = [strategyName];
module.exports.getParams = getParams;