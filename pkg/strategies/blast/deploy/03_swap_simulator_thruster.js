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
let name = 'SwapSimulatorThruster';

// module.exports = async ({deployments}) => {
//     const {save} = deployments;
//     let wallet = await initWallet();

//     await transferETH(10, wallet.address);
//     await deployProxy(name, deployments, save);

//     

//     await (await simulator.setSimulationParams(await getParams())).wait();
// };

module.exports = async ({deployments}) => {
    const {save} = deployments;
    // let wallet = await initWallet();

    // await transferETH(10, wallet.address);

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    // let simulator = await getContract(name, 'blast');

    // console.log("address: ", simulator.address);

    // console.log("Setting...")

    // await settingSection(name, async (simulator) => {
        // await (await simulator.setSimulationParams(await getParams())).wait();
    // });

    
    // console.log(getParams())
    // await (await strategy.setParams(await getParams())).wait();
    // console.log("Set!")
};

async function getParams() {
    return {
        strategy: "0x147812C2282eC48512a6f6f11F7c98d78D1ad74B", // StrategyThrusterSwap address
        factory: '0xa08ae3d3f4da51c22d3c041e468bdf4c61405aab'
    };
}

module.exports.tags = [name];
// module.exports.swapSimulatorThruster = getParams;
// hh deploy --tags SwapSimulatorThruster --network blast --setting