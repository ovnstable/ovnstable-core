const hre = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'blast');

    addProposalItem(pm, 'addStrategy', ["0x147812C2282eC48512a6f6f11F7c98d78D1ad74B"]);
    addProposalItem(pm, 'addStrategy', ["0xa09A8e94FBaAC9261af8f34d810D96b923B559D2"]);

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'blast');
    // await testStrategy(filename, StrategyThrusterSwap, 'blast');

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
