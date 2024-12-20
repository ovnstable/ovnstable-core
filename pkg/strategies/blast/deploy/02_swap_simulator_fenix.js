const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");

// hh deploy --tags SwapSimulatorFenix --impl --verify --network blast 

let name = 'SwapSimulatorFenix';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy(name, deployments, save);

    // let simulator = await getContract(name, 'blast');
    // await (await simulator.setStrategy('0xa09A8e94FBaAC9261af8f34d810D96b923B559D2')).wait();
};

module.exports.tags = [name];