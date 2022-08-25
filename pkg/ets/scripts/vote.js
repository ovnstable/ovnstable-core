const {getContract } = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let strategy = await getContract('StrategyUsdPlusWbnb');

    let pools = [
        '0x0Fe6CF7A2687c5BddF302C5CCea901BA0Bf71816',// BUSD/USD+
        '0xeC30Da6361905B8f3e4a93513D937dB992301276' // WBNB/USD+
    ];

    let weights = [
        20, // 20%
        80 // 80%
    ]

    await (await strategy.vote(pools, weights)).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
