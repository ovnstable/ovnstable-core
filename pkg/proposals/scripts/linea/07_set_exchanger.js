const hre = require("hardhat");
const { getContract, showM2M, execTimelock, initWallet } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require("path");
const { ethers } = require("hardhat");
const { LINEA } = require("@overnight-contracts/common/utils/assets");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let strategyAlpha = await getContract("StrategyEtsAlpha", "linea");
    let strategyBeta = await getContract("StrategyEtsBetaUsdt", "linea_usdt");

    let strategyAlphaParams = {
        asset: LINEA.usdc,
        rebaseToken: "0xC98C43CADfC611eABC08940a86B910C6433FA12A",
        hedgeExchanger: "0xa2dbE1D92d9C66DbB3e4C9358d91988907bC9Ad4"
    };

    let strategyBetaParams = {
        asset: LINEA.usdt,
        rebaseToken: "0x2253BdD62eA63F7CBbf92785EEdcCAc7521FB6A1",
        hedgeExchanger: "0xea50c697278920B143223334ffa3856d0644F7C6"
    };

    addresses.push(strategyAlpha.address);
    values.push(0);
    abis.push(strategyAlpha.interface.encodeFunctionData("setParams", [strategyAlphaParams]));

    addresses.push(strategyBeta.address);
    values.push(0);
    abis.push(strategyBeta.interface.encodeFunctionData("setParams", [strategyBetaParams]));

    //
    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    //
    // await testStrategy(filename, strategyA, "linea");
    // await testStrategy(filename, strategyB, "linea");
    // await testUsdPlus(filename, "linea");
    // await testUsdPlus(filename, "linea_usdt");
    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
