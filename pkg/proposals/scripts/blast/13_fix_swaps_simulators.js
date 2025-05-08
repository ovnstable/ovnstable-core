const hre = require("hardhat");
const { getContract, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus } = require("@overnight-contracts/common/utils/governance");
const { COMMON } = require('@overnight-contracts/common/utils/assets');

const path = require('path');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

const OPERATIONS = {
    REINVEST : 0,
    SEND : 1,
    CUSTOM: 2
}

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    const SwapSimulatorFenix = await getContract('SwapSimulatorFenix', 'blast');
    const newSwapSimulatorFenixImpl = "0x0AC961aFE60346194cbd787020c9BC31cb3f2E5E";

    const SwapSimulatorThruster = await getContract('SwapSimulatorThruster', 'blast');
    const newSwapSimulatorThrusterImpl = "0xd8e72437444A5D636dEfA885Deee6E0252a06Bd9";

    addProposalItem(SwapSimulatorFenix, 'upgradeTo', [newSwapSimulatorFenixImpl]);
    addProposalItem(SwapSimulatorThruster, "upgradeTo", [newSwapSimulatorThrusterImpl]);


    // await testProposal(addresses, values, abis);

    // await testUsdPlus(filename, 'blast');
    // await testUsdPlus(filename, 'blast_usdc');

    await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

async function getConfig() {
    return {
        operation: OPERATIONS.REINVEST,
        beneficiary: COMMON.rewardWallet,
        distributor: "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae",
        __gap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
