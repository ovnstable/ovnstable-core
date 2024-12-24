const { getContract, showM2M, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const { getStrategyFenixSwapParams } = require("../../../strategies/blast/deploy/03_fenix_swap");

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let fenixSwap = await getContract('StrategyFenixSwap', 'blast');
    let fenixSwapImp = "0xDeF7E2F57a54BE20563d464790410d1ce8C01d9e"

    let swapSimulator = await getContract('SwapSimulatorFenix', 'blast');
    let swapSimulatorImp = "0xE8b9F540D3fDD9B60CBFfE73d27Cc67d77054146"

    addProposalItem(fenixSwap, 'upgradeTo', [fenixSwapImp])
    addProposalItem(fenixSwap, 'setParams', [await getStrategyFenixSwapParams()]);

    addProposalItem(swapSimulator, 'upgradeTo', [swapSimulatorImp])

    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);

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