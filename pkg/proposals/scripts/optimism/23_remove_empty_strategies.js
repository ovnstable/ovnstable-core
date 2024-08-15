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

    let pmUsd = await getContract('PortfolioManager', 'optimism');
    let pmDai = await getContract('PortfolioManager', 'optimism_dai');

    addProposalItem(pmUsd, 'removeStrategy', ['0xc86C13b7ec3a812f30214C759646CCeE5E368955']);
    addProposalItem(pmUsd, 'removeStrategy', ['0x0275Bf949922A3A06963C1556cB2e198D15647c5']);

    addProposalItem(pmDai, 'removeStrategy', ['0x307418340F5991CD895CA0Fc4Eba04995e9BE861']);
    addProposalItem(pmDai, 'removeStrategy', ['0x6fab7F539Ae1eceed91aEeBabd5DBb03B37D5dC2']);
    
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

