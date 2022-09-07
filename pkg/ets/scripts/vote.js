const {getContract } = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

async function main() {

    let strategy = await getContract('StrategyUsdPlusWbnb', 'localhost');

    let pools = [
        '0x0Fe6CF7A2687c5BddF302C5CCea901BA0Bf71816',// BUSD/USD+
        '0xeC30Da6361905B8f3e4a93513D937dB992301276' // WBNB/USD+
    ];

    let weights = [
        20, // 20%
        80 // 80%
    ]


    let gaugeBusdUsdPlus = '0x3f4af6e9952b8cf65fa1e7a061d10fa01ee8b0d6';


    let bribes = [
        '0x126A54eC38e6cC4175f7587262d8129009339D56', // BUSD/USD+
        '0xd2b1d4ede6fe2f1e0a27bc70117ac08282294841', // WBNB/USD+
    ]

    let tokens = [
        [
            BSC.busd,
            BSC.usdPlus
        ],
        [
            BSC.wBnb,
            BSC.cone,
            BSC.usdPlus
        ]
    ]

    await (await strategy.claimBribes(bribes, tokens)).wait();
    await (await strategy.vote(pools, weights)).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
