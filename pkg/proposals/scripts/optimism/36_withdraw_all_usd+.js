const { getContract, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const { ethers } = require("hardhat");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    console.log("=".repeat(20));

    let UsdPlusToken = await getContract('UsdPlusToken', 'optimism');

    console.log("UsdPlusToken address:", UsdPlusToken.address);

    const blockNumber = await ethers.provider.getBlockNumber();

    console.log("Block number:", blockNumber);
    
    console.log("=".repeat(20));

    // // ============= Withdraw all USD+ =============
    // // New implementation address with nukeSupply function
    // let newImpl = "0x115E77813E95E504358b3dB3D1A9bd9d63Fd1D6E"; // dev5
        
    // addProposalItem(UsdPlusToken, 'upgradeTo', [newImpl]);
    // addProposalItem(UsdPlusToken, 'nukeSupply', []);

    // // =============================================


    // =============================================

    console.log("=".repeat(20));
    let myAddress = "0xcD03360E2275c76296c948b89CE37cB99564903c";

    let balance = await UsdPlusToken.balanceOf(myAddress);
    console.log("Balance:", balance);
    console.log("=".repeat(20));

    // =============================================

    // // addProposalItem(roleManager, 'revokeRole', [Roles.PORTFOLIO_AGENT_ROLE, devOld]);
    // // addProposalItem(roleManager, 'revokeRole', [Roles.UNIT_ROLE, devOld]);
    
    // await testProposal(addresses, values, abis);
    // // await createProposal(filename, addresses, values, abis);

    // function addProposalItem(contract, methodName, params) {
    //     addresses.push(contract.address);
    //     values.push(0);
    //     abis.push(contract.interface.encodeFunctionData(methodName, params));
    // }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

