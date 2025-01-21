const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {transferETH, getContract } = require("@overnight-contracts/common/utils/script-utils");


let name = 'ThrusterSwap';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    console.log("Деплоим ThrusterSwap")

    // await transferETH(10, '0x8df424e487De4218B347e1798efA11A078fecE90');

    await deployProxy(name, deployments, save);

    let strategy = await getContract(name, 'blast');
    await (await strategy.setSimulationParams('0xa08ae3d3f4da51c22d3c041e468bdf4c61405aab')).wait();
};

async function getParams() {
    return {
        factory: '0xa08ae3d3f4da51c22d3c041e468bdf4c61405aab'
    };
}

module.exports.tags = [name];
module.exports.swapSimulatorThruster = getParams;