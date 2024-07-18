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

    let ex = await getContract('Exchange', 'bsc');
    let usdPlus = await getContract('UsdPlusToken', 'bsc');

    let usdtEx = await getContract('Exchange', 'bsc_usdt');
    let usdtPlus = await getContract('UsdPlusToken', 'bsc_usdt');

    const exNew = '0x0E6273D9d54d29B4103e33078F90041D8DD7e2EB';
    const usdPlusNew = '0x6002054688d62275d80CC615f0F509d9b2FF520d';

    addProposalItem(ex, "upgradeTo", [exNew]);
    addProposalItem(usdPlus, "upgradeTo", [usdPlusNew]);

    addProposalItem(usdtEx, "upgradeTo", [exNew]);
    addProposalItem(usdtPlus, "upgradeTo", [usdPlusNew]);

    
    
    await testProposal(addresses, values, abis);
    console.log("CHECK: ", (await ex.getAvailabilityInfo()).toString());
    console.log("CHECK: ", (await usdtEx.getAvailabilityInfo()).toString());
    await testUsdPlus(filename, 'bsc');
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

