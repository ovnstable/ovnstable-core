const {toAsset} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");


async function main() {
    const strategies = ['StrategySiloUsdcUsdPlus', 'StrategySiloUsdcCbBTC', 'StrategySiloUsdcWstETH', 'StrategySiloUsdcCbETH'];

    for (let i = 0;i < strategies.length;i++) { 
        const strategyName = strategies[i];
        console.log(`staking to ${strategyName}`);

        let strategy = await getContract(strategyName);
        await strategy.setStrategyParams("0xab918d486c61ADd7c577F1af938117bBD422f088", "0xab918d486c61ADd7c577F1af938117bBD422f088");

        let asset = await getCoreAsset();
        const amount = 1000000;
        await asset.transfer(strategy.address, amount);    // transfer 1 USDC to strategy
        await strategy.stake(asset.address, amount);
    }

    console.log("Staking done");
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

