const hre = require("hardhat");
const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {ethers} = require("hardhat");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let usdPlus = await getContract('UsdPlusToken', 'optimism_dai');
    let exchange = await getContract('Exchange', 'optimism_dai');
    let wrapped = await getContract('WrappedUsdPlusToken', 'optimism_dai');
    let decimals = await usdPlus.decimals();

    const timelockAddress = '0xBf3FCee0E856c2aa89dc022f00D6D8159A80F011';
    const usdPlusMigrationAddress = '0xd8BD1Af9955A77A40Cfa58099622Bc176b5A862A';
    const usdPlusPureAddress = '0xb55838c7Ce38bbF899cb9BCcC0C1B706e18e0294';
    const wrappedPureAddress = '0x46B0Bc31238195fBdc7258f91fE848FFFDe5d123';
    const exchangeAddress = '0xff750f3870D6D98082FC60Fb5273Aee1477dFA39';
    const roleManagerAddress = (await getContract('RoleManager')).address;
    const payoutManagerAddress = (await getContract('OptimismPayoutManager')).address;

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

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'optimism_dai');
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

