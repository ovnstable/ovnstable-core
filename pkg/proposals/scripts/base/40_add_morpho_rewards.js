const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const { strategyEtsEtaParams } = require("@overnight-contracts/strategies-base/deploy/11_ets_eta");
const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    // let wallet = await initWallet();
    // await transferETH(1, wallet.address);
    // TODO: test it again

    let addresses = [];
    let values = [];
    let abis = [];

    let morphoAlpha = await getContract('StrategyMorphoAlpha', 'base');
    let morphoBeta = await getContract('StrategyMorphoBeta', 'base');
    
    let newMorphoAlphaImpl = "0xB92Dd67684714958bc1F22191c2Ea9eA07F9774F";
    let newMorphoBetaImpl = "0xEF1Bea3869ae14456682E90e190520877d7baC41";

    addProposalItem(morphoAlpha, 'upgradeTo', [newMorphoAlphaImpl]);
    addProposalItem(morphoBeta, 'upgradeTo', [newMorphoBetaImpl]);

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'base');
    // await testStrategy(filename, morpho, 'base');
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

