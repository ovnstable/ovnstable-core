const { ethers } = require("hardhat");
const { getContract, getImplementation } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const path = require("path");
const IERC20 = require("@overnight-contracts/common/utils/abi/IERC20.json");

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

// const ACTION = "unstakeAdmin";
const ACTION = "stakeAdmin";

const STRATEGY_ADMIN_ABI = [
    "function upgradeTo(address newImplementation)",
    "function stakeAdmin()",
    "function unstakeAdmin()",
];

function requireAddress(name, value) {
    if (!ethers.utils.isAddress(value)) {
        throw new Error(`${name} is not a valid address: ${value}`);
    }
    return value;
}

async function main() {
    if (!["stakeAdmin", "unstakeAdmin"].includes(ACTION)) {
        throw new Error(`Unsupported ACTION: ${ACTION}`);
    }

    let addresses = [];
    let values = [];
    let abis = [];

    const strategyAaveUsdc = await getContract("StrategyAaveUsdc", "arbitrum");
    const strategyAaveUsdt = await getContract("StrategyAaveUsdt", "arbitrum_usdt");

    const strategyInterface = new ethers.utils.Interface(STRATEGY_ADMIN_ABI);

    const oldAaveUsdcImpl = await getImplementation("StrategyAaveUsdc", "arbitrum");
    const oldAaveUsdtImpl = await getImplementation("StrategyAaveUsdt", "arbitrum_usdt");

    const newAaveUsdcImpl = requireAddress(
        "newAaveUsdcImpl",
        "0x78dc38a5678725694C734b14F0b5f191e11127AC"
    );
    const newAaveUsdtImpl = requireAddress(
        "newAaveUsdtImpl",
        "0x5BE4071aC4Af98F632b968C58d9CceF704965459"
    );

    const usdcAddress = await strategyAaveUsdc.usdcToken();
    const aUsdcAddress = await strategyAaveUsdc.aUsdcToken();
    const usdtAddress = await strategyAaveUsdt.usdt();
    const aUsdtAddress = await strategyAaveUsdt.aUsdt();

    const usdc = await ethers.getContractAt(IERC20, usdcAddress);
    const aUsdc = await ethers.getContractAt(IERC20, aUsdcAddress);
    const usdt = await ethers.getContractAt(IERC20, usdtAddress);
    const aUsdt = await ethers.getContractAt(IERC20, aUsdtAddress);

    printDivider("CONFIG");
    console.log("ACTION:", ACTION);
    console.log("StrategyAaveUsdc proxy:", strategyAaveUsdc.address);
    console.log("StrategyAaveUsdc oldImpl:", oldAaveUsdcImpl);
    console.log("StrategyAaveUsdc newImpl:", newAaveUsdcImpl);
    console.log("StrategyAaveUsdc underlying:", usdcAddress);
    console.log("StrategyAaveUsdc aToken:", aUsdcAddress);
    console.log("");
    console.log("StrategyAaveUsdt proxy:", strategyAaveUsdt.address);
    console.log("StrategyAaveUsdt oldImpl:", oldAaveUsdtImpl);
    console.log("StrategyAaveUsdt newImpl:", newAaveUsdtImpl);
    console.log("StrategyAaveUsdt underlying:", usdtAddress);
    console.log("StrategyAaveUsdt aToken:", aUsdtAddress);

    // =================================================================
    // PROPOSAL ITEMS: UPGRADE -> ADMIN ACTION -> ROLLBACK
    // =================================================================
    addProposalItem(strategyAaveUsdc.address, strategyInterface, "upgradeTo", [newAaveUsdcImpl]);
    addProposalItem(strategyAaveUsdc.address, strategyInterface, ACTION, []);
    addProposalItem(strategyAaveUsdc.address, strategyInterface, "upgradeTo", [oldAaveUsdcImpl]);

    addProposalItem(strategyAaveUsdt.address, strategyInterface, "upgradeTo", [newAaveUsdtImpl]);
    addProposalItem(strategyAaveUsdt.address, strategyInterface, ACTION, []);
    addProposalItem(strategyAaveUsdt.address, strategyInterface, "upgradeTo", [oldAaveUsdtImpl]);

    printDivider("BEFORE TEST PROPOSAL");
    await logStrategyBlock("BEFORE", "ARBITRUM AAVE USDC", strategyAaveUsdc, usdc, aUsdc);
    await logStrategyBlock("BEFORE", "ARBITRUM AAVE USDT", strategyAaveUsdt, usdt, aUsdt);

    printDivider("EXECUTE TEST PROPOSAL");
    await testProposal(addresses, values, abis);

    printDivider("AFTER TEST PROPOSAL");
    await logStrategyBlock("AFTER", "ARBITRUM AAVE USDC", strategyAaveUsdc, usdc, aUsdc);
    await logStrategyBlock("AFTER", "ARBITRUM AAVE USDT", strategyAaveUsdt, usdt, aUsdt);

    // =================================================================
    // CREATE BATCH FILE
    // Uncomment this after local testing if you want the batch json.
    // =================================================================
    // await createProposal(filename, addresses, values, abis);

    function addProposalItem(target, contractInterface, methodName, params) {
        addresses.push(target);
        values.push(0);
        abis.push(contractInterface.encodeFunctionData(methodName, params));
    }

    async function logStrategyBlock(label, title, strategy, underlyingToken, aaveToken) {
        console.log("-".repeat(30) + ` ${title} ` + "-".repeat(30));
        await logStrategyState(label, strategy, underlyingToken, aaveToken);
        console.log("");
    }

    async function logStrategyState(label, strategy, underlyingToken, aaveToken) {
        const [
            underlyingSymbol,
            underlyingDecimals,
            underlyingBalance,
            aTokenSymbol,
            aTokenDecimals,
            aTokenBalance,
            nav,
            liquidationValue,
        ] = await Promise.all([
            underlyingToken.symbol(),
            underlyingToken.decimals(),
            underlyingToken.balanceOf(strategy.address),
            aaveToken.symbol(),
            aaveToken.decimals(),
            aaveToken.balanceOf(strategy.address),
            strategy.netAssetValue(),
            strategy.liquidationValue(),
        ]);

        console.log(`[${label}] Strategy: ${strategy.address}`);
        console.log(
            `[${label}] ${underlyingSymbol} balance: ${ethers.utils.formatUnits(underlyingBalance, underlyingDecimals)}`
        );
        console.log(
            `[${label}] ${aTokenSymbol} balance: ${ethers.utils.formatUnits(aTokenBalance, aTokenDecimals)}`
        );
        console.log(
            `[${label}] NAV (${underlyingSymbol} units): ${ethers.utils.formatUnits(nav, underlyingDecimals)}`
        );
        console.log(
            `[${label}] Liquidation value (${underlyingSymbol} units): ${ethers.utils.formatUnits(liquidationValue, underlyingDecimals)}`
        );
    }

    function printDivider(title) {
        const line = "=".repeat(28);
        console.log(`\n${line} ${title} ${line}\n`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
