const hre = require("hardhat");
const { getContract, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const { BigNumber } = require("ethers");
const { POLYGON, COMMON } = require("@overnight-contracts/common/utils/assets");

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let wallet = (await initWallet()).address;

    await transferETH(1, COMMON.rewardWallet);
    
    let addresses = [];
    let values = [];
    let abis = [];

    const StrategyAave = await getContract('StrategyAave', 'polygon_ins'); 
    const newMintImpl = "0x0E6273D9d54d29B4103e33078F90041D8DD7e2EB";  

    let usdc = await getERC20ByAddress(POLYGON.usdc, wallet.address);

    console.log("   DEBUG: COMMON.rewardWallet: ", COMMON.rewardWallet)
    console.log("   DEBUG: StrategyAave.address: ", StrategyAave.address)

    console.log("treasury before", (await usdc.balanceOf(COMMON.rewardWallet)).toString());
    console.log("strategy before", (await usdc.balanceOf(StrategyAave.address)).toString());

    console.log("DEBUG: #6")

    addProposalItem(StrategyAave, "upgradeTo", [newMintImpl]);
    addProposalItem(StrategyAave, "hotFix", [COMMON.rewardWallet]);
    

    await testProposal(addresses, values, abis);
    
    console.log("treasury after", (await usdc.balanceOf(COMMON.rewardWallet)).toString());
    console.log("strategy after", (await usdc.balanceOf(StrategyAave.address)).toString());

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
