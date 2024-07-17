const hre = require("hardhat");
const {getContract, showM2M, execTimelock, initWallet, transferETH} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {ethers} = require("hardhat");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let mainAddress = (await initWallet()).address;
    await transferETH(100, mainAddress);   

    let addresses = [];
    let values = [];
    let abis = [];

    let ex = await getContract('Exchange', 'base');
    let usdPlus = await getContract('UsdPlusToken', 'base');

    let daiEx = await getContract('Exchange', 'base_dai');
    let daiPlus = await getContract('UsdPlusToken', 'base_dai');


    const timelockAddress = '0x8ab9012D1BfF1b62c2ad82AE0106593371e6b247';

    const exNew = '0xeC11E7F17C767CF54DB59C77C1902Ce75FBe25AE';
    const usdPlusNew = '0x1F7e713B77dcE6b2Df41Bb2Bb0D44cA35D795ed8';

    addProposalItem(ex, "grantRole", [Roles.UPGRADER_ROLE, timelockAddress]);
    addProposalItem(usdPlus, "grantRole", [Roles.UPGRADER_ROLE, timelockAddress]);
    addProposalItem(ex, "upgradeTo", [exNew]);
    addProposalItem(usdPlus, "upgradeTo", [usdPlusNew]);

    addProposalItem(daiEx, "grantRole", [Roles.UPGRADER_ROLE, timelockAddress]);
    addProposalItem(daiPlus, "grantRole", [Roles.UPGRADER_ROLE, timelockAddress]);
    addProposalItem(daiEx, "upgradeTo", [exNew]);
    addProposalItem(daiPlus, "upgradeTo", [usdPlusNew]);

    
    
    await testProposal(addresses, values, abis);
    console.log("CHECK: ", (await ex.getAvailableSupply()).toString());
    await testUsdPlus(filename, 'base');
    // await testUsdPlus(filename, 'base_dai');
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

