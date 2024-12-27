const { BASE } = require("@overnight-contracts/common/utils/assets");
const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const { getContract, deploySection } = require("@overnight-contracts/common/utils/script-utils");

let strategyName = 'SwapSimulatorAerodrome';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });
    // await deployProxy(strategyName, deployments, save);

    // console.log("Try to set params...")
    // let simulator = await getContract(strategyName, 'base_usdc');
    // await (await simulator.setSimulationParams(await getParams())).wait();
};

async function getParams() {
    return {
        strategy: "0xcc9c1edae4D3b8d151Ebc56e749aD08b09f50248", 
        factory: BASE.aerodromeFactory
    };
}

module.exports.tags = [strategyName];
module.exports.swapSimulatorAerodrome = getParams;
