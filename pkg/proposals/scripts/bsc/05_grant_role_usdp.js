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

    let wallet = '0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD';

    let exchange = await getContract('Exchange', 'bsc');
    let usdPlus = await getContract('UsdPlusToken', 'bsc');
    let wrapped = await getContract('WrappedUsdPlusToken', 'bsc');

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, wallet]));

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, wallet]));

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('grantRole', [Roles.UPGRADER_ROLE, wallet]));

    addresses.push(wrapped.address);
    values.push(0);
    abis.push(wrapped.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, wallet]));


    exchange = await getContract('Exchange', 'bsc_usdt');
    usdPlus = await getContract('UsdPlusToken', 'bsc_usdt');
    wrapped = await getContract('WrappedUsdPlusToken', 'bsc_usdt');

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, wallet]));

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, wallet]));

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('grantRole', [Roles.UPGRADER_ROLE, wallet]));

    addresses.push(wrapped.address);
    values.push(0);
    abis.push(wrapped.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, wallet]));


    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

