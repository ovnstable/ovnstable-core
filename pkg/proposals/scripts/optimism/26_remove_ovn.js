const { getContract, showM2M, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const path = require('path');
const {ethers} = require("hardhat");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    // let wallet = await initWallet();
    // await transferETH(1, wallet.address);
    // return;

    let addresses = [];
    let values = [];
    let abis = [];

    let ins = await getContract('InsuranceExchange', 'optimism');
    
    let impl = "0xc017885fed58F60377e01eB2A07c198F80F06232";
    let oldImpl = "0x21dC33cDc6E68484aAd323DAD1B65BA88e2dee1f";

    addProposalItem(ins, 'upgradeTo', [impl]);
    addProposalItem(ins, 'removeMoney', []);
    addProposalItem(ins, 'upgradeTo', [oldImpl]);
    
    // await testProposal(addresses, values, abis);
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

