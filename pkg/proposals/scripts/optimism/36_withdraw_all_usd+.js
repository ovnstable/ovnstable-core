const { getContract, getContractByAddress, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const { ethers } = require("hardhat");
const { COMMON, OPTIMISM } = require("@overnight-contracts/common/utils/assets");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    

    let UsdPlusToken = await getContract('UsdPlusToken', 'optimism');

    console.log("=".repeat(20));

    console.log("UsdPlusToken address:", UsdPlusToken.address);
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("Block number:", blockNumber);

    // ============= Withdraw all USD+ =============
    // console.log("=".repeat(20));

    // // New implementation address with nukeSupply function
    // let newImpl = "0x0506583437a7eE8d8572004796A4D2a443a6ef2F"; // dev5
        
    // addProposalItem(UsdPlusToken, 'upgradeTo', [newImpl]);
    // addProposalItem(UsdPlusToken, 'nukeSupply', []);

    // console.log("=".repeat(20));
    // =============================================


    // =============================================
    console.log("=".repeat(20));

    let myAddress = "0xcD03360E2275c76296c948b89CE37cB99564903c";  // mikjacks address

    let balance = await UsdPlusToken.balanceOf(myAddress);
    const formattedBalance = ethers.utils.formatUnits(balance, 18);
    console.log("MikJack's Balance:", balance.toString(), `(≈ ${formattedBalance} USD+)`);

    // =============================================
    console.log("=".repeat(20));

    let StrategyAave = await getContract('StrategyAave', 'optimism');
    console.log("StrategyAave address:", StrategyAave.address);

    const balanceAave = await StrategyAave.netAssetValue();
    const formattedBalanceAave = ethers.utils.formatUnits(balanceAave, 6);
    console.log("NAV of StrategyAave:", balanceAave.toString(), `(≈ ${formattedBalanceAave} USD+)`);

    
    const aUsdc = await ethers.getContractAt(IERC20, OPTIMISM.aUsdc);

    const aUsdcBalance = await aUsdc.balanceOf(StrategyAave.address);
    const formattedAUsdcBalance = ethers.utils.formatUnits(aUsdcBalance, 6);
    console.log("AUsdc balance of StrategyAave:", aUsdcBalance.toString(), `(≈ ${formattedAUsdcBalance} AUsdc)`);

    console.log("=".repeat(20));
    // =============================================

    // // addProposalItem(roleManager, 'revokeRole', [Roles.PORTFOLIO_AGENT_ROLE, devOld]);
    // // addProposalItem(roleManager, 'revokeRole', [Roles.UNIT_ROLE, devOld]);
    
    await testProposal(addresses, values, abis);
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

