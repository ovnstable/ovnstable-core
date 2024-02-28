const hre = require("hardhat");
const { getContract, showM2M, execTimelock, initWallet } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require("path");
const { ethers } = require("hardhat");
const { ZKSYNC } = require("@overnight-contracts/common/utils/assets");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let strategy = await getContract("StrategyEtsAlpha", "zksync"); 

    let strategyParams = {
        asset: ZKSYNC.usdc,
        rebaseToken: "0x41c9d632c79aD3B7765D5b6BCff1525A8400e89c",
        hedgeExchanger: "0x44A0C5dD9BbC32714b1B24E39BDd02739361e643"
    };
 

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData("setParams", [strategyParams]));
 

    //
    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    //
    await testStrategy(filename, strategy, "zksync"); 
    await testUsdPlus(filename, "zksync"); 
    // await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
