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

    let ex = await getContract('Exchange', 'arbitrum');
    let usdPlus = await getContract('UsdPlusToken', 'arbitrum');

    let daiEx = await getContract('Exchange', 'arbitrum_dai');
    let daiPlus = await getContract('UsdPlusToken', 'arbitrum_dai');

    let ethEx = await getContract('Exchange', 'arbitrum_eth');
    let ethPlus = await getContract('UsdPlusToken', 'arbitrum_eth');

    let usdtEx = await getContract('Exchange', 'arbitrum_usdt');
    let usdtPlus = await getContract('UsdPlusToken', 'arbitrum_usdt');

    const exNew = '0x1F7e713B77dcE6b2Df41Bb2Bb0D44cA35D795ed8';
    const usdPlusNew = '0x56a435dFA7d0C13F97C99303056797Cd46E97a2F';

    addProposalItem(ex, "upgradeTo", [exNew]);
    addProposalItem(usdPlus, "upgradeTo", [usdPlusNew]);

    addProposalItem(daiEx, "upgradeTo", [exNew]);
    addProposalItem(daiPlus, "upgradeTo", [usdPlusNew]);

    addProposalItem(usdtEx, "upgradeTo", [exNew]);
    addProposalItem(usdtPlus, "upgradeTo", [usdPlusNew]);

    addProposalItem(ethEx, "upgradeTo", [exNew]);
    addProposalItem(ethPlus, "upgradeTo", [usdPlusNew]);
    
    
    await testProposal(addresses, values, abis);
    console.log("CHECK: ", (await ex.getAvailableSupply()).toString());
    console.log("CHECK: ", (await daiEx.getAvailableSupply()).toString());
    console.log("CHECK: ", (await usdtEx.getAvailableSupply()).toString());
    console.log("CHECK: ", (await ethEx.getAvailableSupply()).toString());
    await testUsdPlus(filename, 'arbitrum');
    // await testUsdPlus(filename, 'arbitrum_dai');
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

