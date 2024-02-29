const hre = require("hardhat");
const {getContract, showM2M, execTimelock, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {ethers} = require("hardhat");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const {fromAsset, fromUsdPlus} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let usdPlus = await getContract('UsdPlusToken', 'linea');
    let usdtPlus = await getContract('UsdPlusToken', 'linea_usdt');
    let usdPlusEx = await getContract('Exchange', 'linea');
    let usdtPlusEx = await getContract('Exchange', 'linea_usdt');

    let upgradeToTokenMig = '0x3970d99c0fDBE2998494Cb7DE963dCB607057aC9';
    let upgradeToToken = '0xb4Bce04AcdE0E4e3dD95f37a04C46375288a4FAE';
    let upgradeToExchange = '0x756D97C96aE80796C4c7A0ba4BfE607119366789';

    addProposalItem(usdPlus, 'upgradeTo', [upgradeToTokenMig]);
    addProposalItem(usdPlus, 'migrationLineaInit', []);
    addProposalItem(usdPlus, 'upgradeTo', [upgradeToToken]);
    addProposalItem(usdtPlus, 'upgradeTo', [upgradeToTokenMig]);
    addProposalItem(usdtPlus, 'migrationLineaInit', []);
    addProposalItem(usdtPlus, 'upgradeTo', [upgradeToToken]);
    addProposalItem(usdPlusEx, 'upgradeTo', [upgradeToExchange]);
    addProposalItem(usdtPlusEx, 'upgradeTo', [upgradeToExchange]);

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'linea');
    // await testUsdPlus(filename, 'linea_usdt');
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

