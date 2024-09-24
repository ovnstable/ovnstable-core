const { amountFromUsdPrice } = require('./utils');

const tokens = {
    "ARBITRUM": [],
    "BASE": {
        "weth": "0x4200000000000000000000000000000000000006",
        "usd+": "0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376",
        "usdbc": "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA"
    }
};

function getTokenAddress(symbol) {
    return tokens[process.env.ETH_NETWORK][symbol];
}

function getTestCases() {
    switch (process.env.ETH_NETWORK) {
        case 'ARBITRUM':
            return [];
        case 'BASE':
            return [
                // {
                //     name: 'AerodromeCLZap',
                //     pool: '0xfD7aBC461df4e496A25898CaB0c6EA88cDd94Cf9',
                //     inputTokens: [
                //         {
                //             tokenAddress: getTokenAddress('weth'),
                //             amountInUsd: 1000
                //         }
                //     ]
                // },
                // {
                //     name: 'AerodromeCLZap',
                //     pool: '0xfD7aBC461df4e496A25898CaB0c6EA88cDd94Cf9', // tvl $150k
                //     inputTokens: [
                //         {
                //             tokenAddress: getTokenAddress('weth'),
                //             amountInUsd: 10000
                //         }
                //     ]
                // },
                // {
                //     name: 'AerodromeCLZap',
                //     pool: '0xfD7aBC461df4e496A25898CaB0c6EA88cDd94Cf9', // tvl $150k
                //     inputTokens: [
                //         {
                //             tokenAddress: getTokenAddress('weth'),
                //             amountInUsd: 100000
                //         }
                //     ]
                // },
                {
                    name: 'AerodromeCLZap',
                    pool: '0xBE700f5c75dFCbEf3Cae37873aEEB1724daED3f6', // tvl $25k
                    inputTokens: [
                        {
                            tokenAddress: getTokenAddress('weth'),
                            amountInUsd: 15000
                        }
                    ]
                },
                // {
                //     name: 'PancakeCLZapBase',
                //     pool: '0xbee435c7Ff6Cb814124281C4C2532476A094Ac87', // tvl $40k
                //     inputTokens: [
                //         {
                //             tokenAddress: getTokenAddress('weth'),
                //             amountInUsd: 1000
                //         }
                //     ]
                // },
                // {
                //     name: 'AerodromeCLZap',
                //     pool: '0xeBeC4772aBA30d82bC64BBB99187B4Ca29928e2E', // tvl $25k
                //     inputTokens: [
                //         {
                //             tokenAddress: getTokenAddress('usd+'),
                //             amountInUsd: 10000
                //         }
                //     ]
                // },

                // {
                //     name: 'AerodromeCLZap',
                //     pool: '0x75D18ee68bB93BE5cB2dcCFa0d8151E25CBC8Eb8',
                //     inputTokens: [
                //         {
                //             tokenAddress: getTokenAddress('weth'),
                //             amountInUsd: 20000
                //         }
                //     ]
                // },
                // {
                //     name: 'AerodromeCLZap',
                //     pool: '0xd07B4d7CeA966B6E8087C8be3347E4B790679785',
                //     inputTokens: [
                //         {
                //             tokenAddress: getTokenAddress('weth'),
                //             amountInUsd: 10000
                //         }
                //     ]
                // }
            ];
        default:
            throw new Error('Unknown network');
    }
}

module.exports = {
    tokens: tokens,
    getTestCases: getTestCases
};