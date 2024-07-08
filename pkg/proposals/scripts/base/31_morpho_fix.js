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

    let wallet = await initWallet();
    await transferETH(1, wallet.address);

    let addresses = [];
    let values = [];
    let abis = [];

    let morpho = await getContract('StrategyMorphoDirect', 'base');
    let morphoUsdc = await getContract('StrategyMorphoDirectUsdc', 'base_usdc');
    let rm = await getContract('RoleManager', 'base');

    let timelock = "0x8ab9012d1bff1b62c2ad82ae0106593371e6b247";
    let newMorphoImpl = "0x2F78BA841c611459Be4f321fA72d7963D66BED7c";
    
    let morphoParams = {
        usdc: BASE.usdc,
        morpho: BASE.morpho,
        marketId: "0x104ff0b7c0d67301cb24e3a10b928b0fb0026ee26338e28553b7064fa8b659a9",
        marketParams: {
            loanToken: BASE.usdc,
            collateralToken: BASE.wUsdPlus,
            oracle: "0x510A4C82f7eBf030aE2bcBDaC2504E59dF03b3E8",
            irm: "0x46415998764C29aB2a25CbeA6254146D50D22687",
            lltv: "770000000000000000"
        },
        treasury: COMMON.rewardWallet,
        fee: 2000,
    }
    

    addProposalItem(rm, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock]);

    addProposalItem(morphoUsdc, 'upgradeTo', [newMorphoImpl]);
    addProposalItem(morphoUsdc, 'setParams', [morphoParams]);

    addProposalItem(morpho, 'upgradeTo', [newMorphoImpl]);
    addProposalItem(morpho, 'setParams', [morphoParams]);


    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'base');
    // await testUsdPlus(filename, 'base_usdc');
    // await testStrategy(filename, morpho, 'base');
    // await testStrategy(filename, morphoUsdc, 'base_usdc');
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

