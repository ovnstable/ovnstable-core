const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const { strategyEtsEtaParams } = require("@overnight-contracts/strategies-base/deploy/11_ets_eta");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let pmUsd = await getContract('PortfolioManager', 'base');
    let pmDai = await getContract('PortfolioManager', 'base_dai');

    addProposalItem(pmUsd, 'removeStrategy', ['0x48d49a208BA0239198083E274836Ba1B9Bef8722']);
    addProposalItem(pmUsd, 'removeStrategy', ['0xAF88194C50fDFcD08e86Ddc4a55eD4f18BD22e73']);
    addProposalItem(pmUsd, 'removeStrategy', ['0xB2a87999FB17e98D9aee8ADe63da9cb4A4204Ab2']);
    addProposalItem(pmUsd, 'removeStrategy', ['0x12b279c2Bb52FFcbE7D1b3c119e1Ab897FCf52B1']);
    addProposalItem(pmUsd, 'removeStrategy', ['0x79aD6f42E59dEF89C94dFb32EdC99B5b722fe7F6']);
    addProposalItem(pmUsd, 'removeStrategy', ['0xF3181905230CA95024915042B644F63Cd1A1d02D']);
    addProposalItem(pmUsd, 'removeStrategy', ['0x20B2bEa324408e57CC3B7df0354F64BC31EBffdD']);
    addProposalItem(pmUsd, 'removeStrategy', ['0x1BC01034346CAb394f64449c8B1574b4800D5453']);

    addProposalItem(pmDai, 'removeStrategy', ['0x23a61444490D3b2648d4464944bb47B5cA28106F']);
    addProposalItem(pmDai, 'removeStrategy', ['0x0a9FBae6264986d2Fb7b170bfA73C0D86f05f1C5']);
    addProposalItem(pmDai, 'removeStrategy', ['0xEC63c2E3D4a1eD280796B6E56F9019c072649227']);

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

