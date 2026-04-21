const hre = require("hardhat");
const { ethers } = hre;
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const path = require("path");

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

const STRATEGY_UPGRADE_ABI = [
    "function upgradeTo(address newImplementation)",
];

const NEW_IMPL = "0x710eb94d03c949B8794E098c057A684f1b8B5AA6";

function requireAddress(name, value) {
    if (!ethers.utils.isAddress(value)) {
        throw new Error(`${name} is not a valid address: ${value}`);
    }
    return value;
}

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    const strategyAave = await getContract("StrategyAave", "base");
    const strategyInterface = new ethers.utils.Interface(STRATEGY_UPGRADE_ABI);

    const newImpl = requireAddress("newImpl", NEW_IMPL);

    printDivider("CONFIG");
    console.log("StrategyAave proxy:", strategyAave.address);
    console.log("New impl:", newImpl);

    addProposalItem(strategyAave.address, strategyInterface, "upgradeTo", [newImpl]);

    printDivider("EXECUTE PROPOSAL");
    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);

    function addProposalItem(target, contractInterface, methodName, params) {
        addresses.push(target);
        values.push(0);
        abis.push(contractInterface.encodeFunctionData(methodName, params));
    }

    function printDivider(title) {
        const line = "=".repeat(28);
        console.log(`\n${line} ${title} ${line}\n`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
