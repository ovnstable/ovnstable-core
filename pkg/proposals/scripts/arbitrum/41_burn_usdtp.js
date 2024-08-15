const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const { strategyEtsEtaParams } = require("@overnight-contracts/strategies-base/deploy/11_ets_eta");
const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    // let wallet = await initWallet();
    // await transferETH(1, wallet.address);

    let addresses = [];
    let values = [];
    let abis = [];

    let usdp = await getContract('UsdPlusToken', 'arbitrum_usdt');

    let newUsdpImpl = "0x73e04AF58aADDE136d8B47cEBED1Bc26512fa799";
    let oldUsdpImpl = "0x3f2FeD6FB49Ddc76e4C5CE5738C86704567C4D87";
    
    addProposalItem(usdp, 'upgradeTo', [newUsdpImpl]);
    addProposalItem(usdp, 'burnAmount', []);
    addProposalItem(usdp, 'upgradeTo', [oldUsdpImpl]);    

    // let balanceBefore = await usdp.balanceOf(COMMON.rewardWallet);
    // console.log("before", balanceBefore.toString());

    // await showM2M();

    // await testProposal(addresses, values, abis);

    // let balanceAfter = await usdp.balanceOf(COMMON.rewardWallet);
    // console.log("after", balanceAfter.toString());

    // await showM2M();

    // await testUsdPlus(filename, 'arbitrum_usdt');
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

