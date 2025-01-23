const {getContract, getPrice, showM2M, initWallet, getERC20ByAddress} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE6, fromE18} = require("@overnight-contracts/common/utils/decimals");


async function main() {

    let wallet = await initWallet();
    let timelock = await getContract('AgentTimelock');
    console.log("timelock.address: ", timelock.address)

    let pm = await getContract('PortfolioManager', 'base');
    let rm = await getContract('RoleManager', 'base');
    console.log("PM: ", pm.address);
    console.log("RM: ", rm.address);

    let usdcPlus = await getERC20ByAddress("0x85483696Cc9970Ad9EdD786b2C5ef735F38D156f", wallet.address);
    let strategy = await getContract('StrategyAerodromeSwapUsdc', 'base_usdc');
    console.log("strategy.address: ", strategy.address)

    const provider = new ethers.providers.JsonRpcProvider(
        "http://localhost:8545"
    );
    await provider.send("hardhat_impersonateAccount", [timelock.address]);

    const timelockSigner = provider.getSigner(timelock.address);
    // const dev5Address = "0x086dFe298907DFf27BD593BD85208D57e0155c94";

    await strategy.connect(timelockSigner).setStrategyParams(timelock.address, rm.address);


    let PORTFOLIO_MANAGER = "0x90c2aa7471c04182221f68e80c07ab1e5946e4c63f8693e14ca40385d529f051";

    let result0 = await strategy.hasRole(PORTFOLIO_MANAGER, wallet.address);
    console.log("RESULT: ", result0);

    await (await strategy.connect(timelockSigner).grantRole(PORTFOLIO_MANAGER, wallet.address)).wait();
    console.log("WALLET.address: ", wallet.address);

    let result = await strategy.hasRole(PORTFOLIO_MANAGER, wallet.address);
    console.log("RESULT: ", result);

    // let usdcPlusBalance = await usdcPlus.balanceOf(wallet.address);
    // console.log("usdcPlusBalance: ", usdcPlusBalance);

    let usdcPlusTVL = await usdcPlus.totalSupply();
    console.log("usdcPlusTVL: ", usdcPlusTVL);

    let usdcPlusBefore = await usdcPlus.balanceOf(strategy.address);
    console.log("USDC+ on strategy before: ", usdcPlusBefore);

    await strategy.connect(timelockSigner).unstake("0xAb305cb7D4E148161b09b410Ab66C23971788369", 123456789, "0xAb305cb7D4E148161b09b410Ab66C23971788369", true);

    let usdcPlusAfter = await usdcPlus.balanceOf(strategy.address);
    console.log("USDC+ on strategy after:  ", usdcPlusAfter);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });