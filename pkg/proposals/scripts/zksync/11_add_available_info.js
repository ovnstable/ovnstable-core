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

    let ex = await getContract('Exchange', 'zksync');
    let usdPlus = await getContract('UsdPlusToken', 'zksync');

    let usdtEx = await getContract('Exchange', 'zksync_usdt');
    let usdtPlus = await getContract('UsdPlusToken', 'zksync_usdt');

    const exNew = '0x79Ce881eDEfea1f5352057F6Eae35eC21b6cB3a8';

    const usdtExNew = '0x1fd0dEFBb46caEE91Ede1e7DeC7B783E6f4BAe7f';
    const usdPlusNew = '0x5f5De9763a452890e1BD46F54d764099Cc79581E';

    addProposalItem(ex, "upgradeTo", [exNew]);
    addProposalItem(usdPlus, "upgradeTo", [usdPlusNew]);

    addProposalItem(usdtEx, "upgradeTo", [usdtExNew]);
    addProposalItem(usdtPlus, "upgradeTo", [usdPlusNew]);

    
    
    await testProposal(addresses, values, abis);
    console.log("CHECK: ", (await ex.getAvailabilityInfo()).toString());
    console.log("CHECK: ", (await usdtEx.getAvailabilityInfo()).toString());
    await testUsdPlus(filename, 'zksync');
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

