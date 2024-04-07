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

    let pmUsd = await getContract('PortfolioManager', 'arbitrum');
    let pmDai = await getContract('PortfolioManager', 'arbitrum_dai');
    let pmUsdt = await getContract('PortfolioManager', 'arbitrum_usdt');
    let pmEth = await getContract('PortfolioManager', 'arbitrum_eth');
    let strategy = await getContract('StrategyWombatOvnUsdp', 'arbitrum');
    let timelock = "0xa44dF8A8581C2cb536234E6640112fFf932ED2c4";
    let dev = "0x05129E3CE8C566dE564203B0fd85111bBD84C424";

    addProposalItem(strategy, 'grantRole', [Roles.DEFAULT_ADMIN_ROLE, dev]);
    addProposalItem(strategy, 'grantRole', [Roles.UPGRADER_ROLE, dev]);
    addProposalItem(strategy, 'revokeRole', [Roles.UPGRADER_ROLE, timelock]);
    addProposalItem(strategy, 'revokeRole', [Roles.DEFAULT_ADMIN_ROLE, timelock]);

    addProposalItem(pmUsd, 'removeStrategy', ['0xe105d6313ABa69E88255dEf71EAf2E53939D567e']);

    addProposalItem(pmDai, 'removeStrategy', ['0xd05c15AA8D3E8AEb9833826AbC6C5C591C762D9d']);
    addProposalItem(pmDai, 'removeStrategy', ['0x71081021ff37D38Dec956386EA5E467e58714951']);
    addProposalItem(pmDai, 'removeStrategy', ['0x695f18CeD23887607286464f26907C28D400516c']);
    addProposalItem(pmDai, 'removeStrategy', ['0x88D2b6C910e9450071786F49feA0490cBa197F3D']);

    addProposalItem(pmUsdt, 'removeStrategy', ['0x4f96B7D5b67da265861e3e6956f475182EB279c4']);
    addProposalItem(pmUsdt, 'removeStrategy', ['0xdBaB307F2f19A678F90Ad309C8b34DaD3da8d334']);

    addProposalItem(pmEth, 'removeStrategy', ['0xd3Cc82085F34D9C500fcbcDb176Edde17a82335C']);
    addProposalItem(pmEth, 'removeStrategy', ['0xBf49142B268d505D32464358Fe85f888E95709b8']);
    addProposalItem(pmEth, 'removeStrategy', ['0x4973d06A64640fe8a288D1E28aa17881FF333A48']);

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

