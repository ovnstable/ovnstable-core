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

    let pm = await getContract('PortfolioManager', 'base');
    let pmDai = await getContract('PortfolioManager', 'base_dai');
    let pmUsdc = await getContract('PortfolioManager', 'base_usdc');

    let strategyMorphoAlpha = await getContract('StrategyMorphoAlpha', 'base');
    addProposalItem(strategyMorphoAlpha, 'upgradeTo', ['0x1A20B08c330D6126Bf06a47e757081f1B198d1CC']);

    addProposalItem(pm, 'removeStrategy', ['0x51cd516a7EEc17AEB6a5b5e61916895e5b135D87']);
    addProposalItem(pm, 'removeStrategy', ['0x2CF88ac6bF5682f7ad7A50E6476684286C03dDD7']);
    addProposalItem(pm, 'removeStrategy', ['0x3a9127faD83Ee5e9a78C1776ACe3bB8FcAb4Abd1']);
    addProposalItem(pm, 'removeStrategy', ['0xaD855f5b20976a341ddE3f5E5ac7CD3cF384965d']);
    addProposalItem(pm, 'removeStrategy', ['0xA747B73B80efd86f2437024ee533E4fBC09472B7']);
    addProposalItem(pm, 'removeStrategy', ['0xe1d2E5d59f8802B0249eA12D9AC94249d6BfF17C']);
    addProposalItem(pm, 'removeStrategy', ['0x2E99704871c726893c94bBE7E5BA4C2BEd976A86']);
    addProposalItem(pm, 'removeStrategy', ['0x0516F889E4F53D474B0F2EF0D8698AC03d51BdE5']);

    addProposalItem(pmDai, 'removeStrategy', ['0x3Dd7947eff438cF2870C3cb9345b675e5E924051']);
    addProposalItem(pmDai, 'removeStrategy', ['0x3E018a972ed429B01d11BdA4d19E6902680104c8']);

    addProposalItem(pmUsdc, 'removeStrategy', ['0x26C604e786601d838f0450910C7001646aCBf99E']);
    addProposalItem(pmUsdc, 'removeStrategy', ['0xB12F994F0F78f4b183a36c3EDCa7fbA617C62028']);
    addProposalItem(pmUsdc, 'removeStrategy', ['0xe849ab3A24Ff0c4A87108DE699594336a5363301']);

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

