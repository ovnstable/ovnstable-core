const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {transferETH } = require("@overnight-contracts/common/utils/script-utils");


let name = 'FenixSwap';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await transferETH(10, '0x8df424e487De4218B347e1798efA11A078fecE90');

    await deployProxy(name, deployments, save);
};

async function getParams() {
    return {
        factory: '0x5accac55f692ae2f065ceddf5924c8f6b53cdaa8'
    };
}

module.exports.tags = [name];
module.exports.swapSimulatorThruster = getParams;