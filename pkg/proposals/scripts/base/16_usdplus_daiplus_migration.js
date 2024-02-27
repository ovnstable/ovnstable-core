const hre = require("hardhat");
const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {ethers} = require("hardhat");
const {fromAsset, fromUsdPlus} = require("@overnight-contracts/common/utils/decimals");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let startBlock = await ethers.provider.getBlockNumber();

    let usdPlus = await getContract('UsdPlusToken', 'base');
    let exchange = await getContract('Exchange', 'base');
    let wrapped = await getContract('WrappedUsdPlusToken', 'base');
    let decimals = await usdPlus.decimals();

    let daiPlus = await getContract('UsdPlusToken', 'base_dai');
    let daiExchange = await getContract('Exchange', 'base_dai');
    let daiDecimals = await daiPlus.decimals();

    const timelockAddress = '0x8ab9012D1BfF1b62c2ad82AE0106593371e6b247';
    const usdPlusMigrationAddress = '0x74CE64f962B3a2Cb0AdADb28d717EC29E1d5FdC0';
    const usdPlusPureAddress = '0x8De5410692C0bc722695F17CA4DD55C9506052c6';
    const wrappedPureAddress = '0xd2225215c98956C0f05a0B191706F50D5b2D6F87';
    const exchangeAddress = '0x6e1Bf9Ac635CdE72484A1F51359140F936d0b283';
    const roleManagerAddress = (await getContract('RoleManager')).address;
    const payoutManagerAddress = (await getContract('BasePayoutManager')).address;

    addProposalItem(usdPlus, "grantRole", [Roles.UPGRADER_ROLE, timelockAddress]);
    addProposalItem(wrapped, "grantRole", [Roles.UPGRADER_ROLE, timelockAddress]);
    addProposalItem(exchange, "upgradeTo", [exchangeAddress]);
    addProposalItem(exchange, "setPayoutManager", [payoutManagerAddress]);
    addProposalItem(usdPlus, "upgradeTo", [usdPlusMigrationAddress]);
    addProposalItem(usdPlus, "migrationInit", [exchange.address, decimals, payoutManagerAddress]);
    addProposalItem(usdPlus, "upgradeTo", [usdPlusPureAddress]);
    addProposalItem(usdPlus, "setRoleManager", [roleManagerAddress]);
    addProposalItem(wrapped, "upgradeTo", [wrappedPureAddress]);
    addProposalItem(wrapped, "setRoleManager", [roleManagerAddress]);

    addProposalItem(daiPlus, "grantRole", [Roles.UPGRADER_ROLE, timelockAddress]);
    addProposalItem(daiExchange, "upgradeTo", [exchangeAddress]);
    addProposalItem(daiExchange, "setPayoutManager", [payoutManagerAddress]);
    addProposalItem(daiPlus, "upgradeTo", [usdPlusMigrationAddress]);
    addProposalItem(daiPlus, "migrationInit", [daiExchange.address, daiDecimals, payoutManagerAddress]);
    addProposalItem(daiPlus, "upgradeTo", [usdPlusPureAddress]);
    addProposalItem(daiPlus, "setRoleManager", [roleManagerAddress]);

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'base');
    // await testUsdPlus(filename, 'base_dai');
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

