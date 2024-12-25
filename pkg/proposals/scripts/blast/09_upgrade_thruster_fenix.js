const { getContract, showM2M, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const { getStrategyThrusterSwapParams } = require("../../../strategies/blast/deploy/05_thruster_swap");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let thrusterSwap = await getContract('StrategyThrusterSwap', 'blast');
    let thrusterSwapImp = "0x3533D800e2edBcE4D7A5fbd00E40Ba221263E643"

    let swapSimulator = await getContract('SwapSimulatorThruster', 'blast');
    let swapSimulatorImp = "0x480EFF8bCDA11fC4b4C54Ae0b8D76359E166818e"

    addProposalItem(thrusterSwap, 'upgradeTo', [thrusterSwapImp])

    addProposalItem(thrusterSwap, 'setParams', [await getStrategyThrusterSwapParams()]);

    addProposalItem(swapSimulator, 'upgradeTo', [swapSimulatorImp])

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });