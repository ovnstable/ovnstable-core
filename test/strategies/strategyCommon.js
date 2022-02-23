const {logGas, skipGasLog} = require("../../utils/gas");
const {toUSDC} = require("../../utils/decimals");

async function logStrategyGasUsage(contractName, strategy, usdc, account) {

    if (skipGasLog())
        return;

    await usdc.transfer(strategy.address, toUSDC(100));

    await logGas(
        strategy.stake(usdc.address, toUSDC(100)),
        contractName,
        "stake"
    );

    await logGas(
        strategy.unstake(usdc.address, toUSDC(50), account, false),
        contractName,
        "unstake"
    );

    await logGas(
        strategy.unstake(usdc.address, 0, account, true),
        contractName,
        "unstakeFull"
    );
}

module.exports = {
    logStrategyGasUsage: logStrategyGasUsage,
}


