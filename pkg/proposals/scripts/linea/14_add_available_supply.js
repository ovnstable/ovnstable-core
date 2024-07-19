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

    // let mainAddress = (await initWallet()).address;
    // await transferETH(100, mainAddress);   

    let addresses = [];
    let values = [];
    let abis = [];

    let ex = await getContract('Exchange', 'linea');
    let usdPlus = await getContract('UsdPlusToken', 'linea');

    let usdtEx = await getContract('Exchange', 'linea_usdt');
    let usdtPlus = await getContract('UsdPlusToken', 'linea_usdt');

    const exNew = '0x80212Fc2baa3782eC0B5384fFe6E1ED8306340b0';
    const usdPlusNew = '0xe49579d531e657Fe3a9EA36Fb11764F81909047E';

    addProposalItem(ex, "upgradeTo", [exNew]);
    addProposalItem(usdPlus, "upgradeTo", [usdPlusNew]);

    addProposalItem(usdtEx, "upgradeTo", [exNew]);
    addProposalItem(usdtPlus, "upgradeTo", [usdPlusNew]);

    
    
    // await testProposal(addresses, values, abis);
    // console.log("CHECK: ", (await ex.getAvailabilityInfo()).toString());
    // console.log("CHECK: ", (await usdtEx.getAvailabilityInfo()).toString());
    // await testUsdPlus(filename, 'linea');
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

