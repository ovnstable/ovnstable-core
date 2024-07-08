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

    let wallet = await initWallet();
    await transferETH(1, wallet.address);

    let addresses = [];
    let values = [];
    let abis = [];

    let usdPlus = await getContract('UsdPlusToken', 'linea');

    const timelockAddress = '0x8ab9012D1BfF1b62c2ad82AE0106593371e6b247';
    const usdPlusTemporaryAddress = '0x40E21D9E3e6338c6dD0fb3D33340664219C0DE4C';
    const usdPlusPureAddress = '0xB0992A4108Bd1cf0f8e429Fc0A1D7073C7dD9Fd2';

    console.log("from: ", (await usdPlus.balanceOf("0x8dAbf94c7Bdd771E448a4ae4794cd71F9F3d7a0d")).toString());
    console.log("to: ", (await usdPlus.balanceOf("0xb187C5108120967C5b3f608FEF1C12671248f791")).toString());

    addProposalItem(usdPlus, "grantRole", [Roles.UPGRADER_ROLE, timelockAddress]);
    addProposalItem(usdPlus, "upgradeTo", [usdPlusTemporaryAddress]);
    addProposalItem(usdPlus, "_hotFix", []);
    addProposalItem(usdPlus, "upgradeTo", [usdPlusPureAddress]);

    await testProposal(addresses, values, abis);

    console.log("from: ", (await usdPlus.balanceOf("0x8dAbf94c7Bdd771E448a4ae4794cd71F9F3d7a0d")).toString());
    console.log("to: ", (await usdPlus.balanceOf("0xb187C5108120967C5b3f608FEF1C12671248f791")).toString());

    await testUsdPlus(filename, 'linea');
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

