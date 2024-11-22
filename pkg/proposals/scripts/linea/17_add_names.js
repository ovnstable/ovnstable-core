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

    let pm = await getContract('PortfolioManager', 'linea');
    let rm = await getContract('RoleManager', 'linea');

    const StrategyMendiUsdc = await getContract('StrategyMendiUsdc', 'linea');
    const newMendiUsdcImpl = "0x39D7306c04A4a6f163733510f0910AfA765349bd";

    const StrategyEtsAlpha = await getContract("StrategyEtsAlpha", "linea");
    const newEtsAlphaImpl = "0x0A0Ff17E92A50FE4517715A1104c4D545bdd78Cc";

    addProposalItem(StrategyMendiUsdc, "upgradeTo", [newMendiUsdcImpl]);
    addProposalItem(StrategyEtsAlpha, "upgradeTo", [newEtsAlphaImpl]);

    addProposalItem(StrategyMendiUsdc, 'setStrategyParams', [pm.address, rm.address, "Mendi USDC"]);
    addProposalItem(StrategyEtsAlpha, 'setStrategyParams', [pm.address, rm.address, "AlphaLinea"]);

    addProposalItem(pm, 'upgradeTo', ['0x1c592E055Ec06A68f89499fe0aCDd262b30Da361']);


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
