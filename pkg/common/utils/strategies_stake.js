const {toAsset} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");

// Stakes 1 USDC for each strategy for testing purposes.
async function main() {
    const strategies = ['StrategySiloUsdcUsdPlus', 'StrategySiloUsdcCbBTC', 'StrategySiloUsdcWstETH', 'StrategySiloUsdcCbETH'];

    //await transferETH(1, "0xab918d486c61ADd7c577F1af938117bBD422f088");

    for (let i = 0;i < strategies.length;i++) { 
        const strategyName = strategies[i];
        console.log("");
        console.log(`staking to ${strategyName}`);

        let strategy = await getContract(strategyName);

        const portfolioManagerAddress = await strategy.portfolioManager();
        const roleManagerAddress = await strategy.roleManager();

        try {
            await (await strategy.setStrategyParams("0xab918d486c61ADd7c577F1af938117bBD422f088", roleManagerAddress)).wait();

            let asset = await getCoreAsset();
            const amount = 1000000;
            await (await asset.transfer(strategy.address, amount)).wait();    // transfer 1 USDC to strategy
            await (await strategy.stake(asset.address, amount)).wait();

            console.log(`strategy ${strategyName} NAV: ${(await strategy.netAssetValue()).toString()}`);
        }
        finally {
            await (await strategy.setStrategyParams(portfolioManagerAddress, roleManagerAddress)).wait();
        }
    }

    console.log("Staking done");
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

