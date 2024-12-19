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

let name = 'SwapSimulatorFenix';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await transferETH(10, '0x8df424e487De4218B347e1798efA11A078fecE90');

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
    
    let thisStrategy = await getContract('SwapSimulatorFenix', 'blast');

    console.log("@4")
    await (await thisStrategy.connect(timelockAccount).grantRole('0x0000000000000000000000000000000000000000000000000000000000000000', '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'));

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [timelock.address],
    });

    console.log("@5")
    await deployProxy(name, deployments, save);


    console.log("@6")
    let simulator = await getContract(name, 'blast');


    console.log("@7")
    // await (await simulator.setSimulationParams(await getParams())).wait();
};

async function getParams() {
    return {
        strategy: '0xa09A8e94FBaAC9261af8f34d810D96b923B559D2', 
        factory: '0x5accac55f692ae2f065ceddf5924c8f6b53cdaa8'
    };
}

module.exports.tags = [name];
module.exports.swapSimulatorThruster = getParams;