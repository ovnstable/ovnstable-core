const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20 } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const {OPTIMISM, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let aave = await getContract('StrategyAave', 'optimism');
    
    let pm = await getContract('PortfolioManager', 'optimism');
    let rm = await getContract('RoleManager', 'optimism');
    let ex = await getContract('Exchange', 'optimism');

    let newAaveImpl = "0x9272EA66be5369ae3DeaC43a4508d8D38FC43721";
    let oldAaveImpl = "0xc9b3fEc466f406b1Bb234D6b4c472bB7567A2E26";
    let timelock = "0xBf3FCee0E856c2aa89dc022f00D6D8159A80F011"; 
    
    // await transferETH(10, timelock);
    // await transferETH(10, "0x66BC0120b3287f08408BCC76ee791f0bad17Eeef");

    addProposalItem(rm, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock]);
    addProposalItem(ex, 'setTokens', [OPTIMISM.usdPlus, OPTIMISM.usdc]);
    addProposalItem(pm, 'setAsset', [OPTIMISM.usdc]);
    
    addProposalItem(aave, 'upgradeTo', [newAaveImpl]);
    addProposalItem(aave, 'usdcRepeg', []);
    addProposalItem(aave, 'upgradeTo', [oldAaveImpl]);

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'optimism');
    // await testStrategy(filename, aave, 'optimism');
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

