const hre = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus } = require("@overnight-contracts/common/utils/governance");
const { COMMON } = require('@overnight-contracts/common/utils/assets');
const { getStrategyFenixSwapParams } = require('@overnight-contracts/strategies-blast/deploy/02_strategy_fenix_swap');
const { getStrategyThrusterSwapParams } = require('@overnight-contracts/strategies-blast/deploy/04_strategy_thruster_swap');

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
    const newSwapSimulatorFenixImpl = "0x3d4eE55c0b6E2644e634A99A8be16d26D95dc6f8";

    const StrategyFenixSwap = await getContract('StrategyFenixSwap', 'blast');
    const newFenixSwapImpl = "0xD61e6AB3D1dF3a3433CE27fC6c1CD0816220FA07";

    const SwapSimulatorThruster = await getContract('SwapSimulatorThruster', 'blast');
    const newSwapSimulatorThrusterImpl = "0x6F5900b4Ce219d148730Ba7C5Ce1F4636353CCC3";

    const StrategyThrusterSwap = await getContract('StrategyThrusterSwap', 'blast');
    const newThrusterSwapImpl = "0xE62ECe12576Af7be4E525e7c0884c657Cd68C89F";

    addProposalItem(SwapSimulatorFenix, 'upgradeTo', [newSwapSimulatorFenixImpl]);
    addProposalItem(StrategyFenixSwap, 'upgradeTo', [newFenixSwapImpl]);
    addProposalItem(StrategyFenixSwap, 'setParams', [await getStrategyFenixSwapParams()]);
    addProposalItem(StrategyFenixSwap, 'setClaimConfig', [await getConfig()]);

    addProposalItem(SwapSimulatorThruster, "upgradeTo", [newSwapSimulatorThrusterImpl]);
    addProposalItem(StrategyThrusterSwap, "upgradeTo", [newThrusterSwapImpl]);
    addProposalItem(StrategyThrusterSwap, 'setParams', [await getStrategyThrusterSwapParams()]);
    addProposalItem(StrategyThrusterSwap, 'setClaimConfig', [await getConfig()]);


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
