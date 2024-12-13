const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");

let name = 'SwapSimulatorFenix';

// 0xdeead6cb14f4496381d469fa2e0ee8ea473741d6

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy(name, deployments, save);

    let simulator = await getContract(name, 'blast');

    await (await simulator.setSimulationParams(await getParams())).wait();
};

async function getParams() {
    return {
        strategy: '0xa09A8e94FBaAC9261af8f34d810D96b923B559D2', 
        factory: '0x5accac55f692ae2f065ceddf5924c8f6b53cdaa8'
    };
}

module.exports.tags = [name];
module.exports.swapSimulatorThruster = getParams;