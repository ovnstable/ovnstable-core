const { ethers } = require("hardhat");
const { getContract, getImplementation } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const path = require("path");
const IERC20 = require("@overnight-contracts/common/utils/abi/IERC20.json");

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

const ACTION = "unstakeAdmin";
// const ACTION = "stakeAdmin";

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

    const strategyAave = await getContract("StrategyAave", "base");
    const strategyInterface = new ethers.utils.Interface(STRATEGY_ADMIN_ABI);

    const newAaveImpl = requireAddress(
        "newAaveImpl",
        "0xC43f327Fb959b0833fe38219B843323c5acD401e"
    );

    const underlyingAddress = await strategyAave.usdcToken();
    const aTokenAddress = await strategyAave.aUsdcToken();
    const underlying = await ethers.getContractAt(IERC20, underlyingAddress);
    const aToken = await ethers.getContractAt(IERC20, aTokenAddress);

    printDivider("CONFIG");
    console.log("ACTION:", ACTION);
    console.log("StrategyAave proxy:", strategyAave.address);
    console.log("StrategyAave newImpl:", newAaveImpl);
    console.log("Underlying token:", underlyingAddress);
    console.log("Aave aToken:", aTokenAddress);

    // =================================================================
    // PROPOSAL ITEMS: UPGRADE -> ADMIN ACTION -> ROLLBACK
    // =================================================================
    addProposalItem(strategyAave.address, strategyInterface, "upgradeTo", [newAaveImpl]);
    addProposalItem(strategyAave.address, strategyInterface, ACTION, []);

    printDivider("BEFORE TEST PROPOSAL");
    await logStrategyState("BEFORE", strategyAave, underlying, aToken);

    printDivider("EXECUTE TEST PROPOSAL");
    await testProposal(addresses, values, abis);

    printDivider("AFTER TEST PROPOSAL");
    await logStrategyState("AFTER", strategyAave, underlying, aToken);

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
