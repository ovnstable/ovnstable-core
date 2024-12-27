const { BASE } = require("@overnight-contracts/common/utils/assets");
const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");

let name = 'SwapSimulatorAerodrome';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy(name, deployments, save);

    let simulator = await getContract(name, 'base_usdc');

    await (await simulator.setSimulationParams(await getParams())).wait();
};

async function getParams() {
    return {
        strategy: "0x0A6109153da4406294133396C6E74E4F5F0aF052", //0xcc9c1edae4D3b8d151Ebc56e749aD08b09f50248
        factory: BASE.aerodromeFactory
    };
}

module.exports.tags = [name];
module.exports.swapSimulatorAerodrome = getParams;
