const {logGas, skipGasLog} = require("./gas");
const {toE6} = require("./decimals");

async function logStrategyGasUsage(contractName, strategy, usdc, account) {

    if (skipGasLog())
        return;

    await usdc.transfer(strategy.address, toE6(100));

    await logGas(
        strategy.connect(account).stake(usdc.address, toE6(100)),
        contractName,
        "stake"
    );

    await logGas(
        strategy.connect(account).unstake(usdc.address, toE6(50), account.address, false),
        contractName,
        "unstake"
    );

    await logGas(
        strategy.connect(account).unstake(usdc.address, 0, account.address, true),
        contractName,
        "unstakeFull"
    );
}

module.exports = {
    logStrategyGasUsage: logStrategyGasUsage,
}


