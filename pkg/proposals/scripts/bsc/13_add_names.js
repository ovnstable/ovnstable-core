const hre = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

const path = require('path');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'bsc');
    let rm = await getContract('RoleManager', 'bsc');

    const StrategyVenusUsdc = await getContract('StrategyVenusUsdc', 'bsc');
    const newVenusUsdcImpl = "0x996D44BF6A5f965BD2A93FBCFEf80Da2C7214cfD";

    addProposalItem(StrategyVenusUsdc, "upgradeTo", [newVenusUsdcImpl]);

    addProposalItem(StrategyVenusUsdc, 'setStrategyParams', [pm.address, rm.address, "Venus USDC"]);

    addProposalItem(pm, 'upgradeTo', ['0x84210dB73775fF1DeFe5037A3E1B4C24048c336c']);


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
