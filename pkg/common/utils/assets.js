

let FANTOM = {
    usdc: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
    amUsdc: "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
    crv2Pool: "0x27E611FD27b276ACbd5Ffd632E5eAEBEC9761E40",
    crv2PoolToken: "0x27E611FD27b276ACbd5Ffd632E5eAEBEC9761E40",
    crv2PoolGauge: "0x8866414733F22295b7563f9C5299715D2D76CAf4",
    crvGeist: "0x0fa949783947Bf6c1b171DB13AEACBB488845B3f",
    crvGeistToken: "0xD02a30d33153877BC20e5721ee53DeDEE0422B2F",
    crvGeistGauge: "0xd4F94D0aaa640BBb72b5EEc2D85F6D114D81a88E",
    geist: "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
    crv: "0x1E4F97b9f9F913c46F1632781732927B9019C68b",
    wFtm: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"
}

let POLYGON = {
    idleUsdc: "0x1ee6470cd75d5686d0b2b90c0305fa46fb0c89a1",
    usdc: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    usdt: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    amUsdc: "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
    am3CRV: "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171",
    am3CRVgauge: "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c",
    wMatic: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    crv: "0x172370d5Cd63279eFa6d502DAB29171933a610AF",
    mUsd: "0xE840B73E5287865EEc17d250bFb1536704B43B21",
    imUsd: "0x5290Ad3d83476CA6A2b178Cd9727eE1EF72432af",
    vimUsd: "0x32aBa856Dc5fFd5A56Bcd182b13380e5C855aa29",
    mta: "0xf501dd45a1198c2e1b5aef5314a68b9006d842e0",
    bpspTUsd: "0x0d34e5dD4D8f043557145598E4e2dC286B35FD4f",
    tUsd: "0x2e1ad108ff1d8c782fcbbb89aad783ac49586756",
    bal: "0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3",
    izi: "0x60d01ec2d5e98ac51c8b4cf84dfcce98d527c747",
    yin: "0x794Baab6b878467F93EF17e2f2851ce04E3E34C8",
    weth: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    dodo: "0xe4Bf2864ebeC7B7fDf6Eeca9BaCAe7cDfDAffe78"
}


let DEFAULT = POLYGON;

setDefault(process.env.ETH_NETWORK);


function setDefault(network){


    console.log(`Assets: [${network}]`)

    switch (network){
        case 'FANTOM':
            DEFAULT = FANTOM;
            break
        case 'POLYGON':
            DEFAULT = POLYGON;
            break
        default:
            throw new Error('Unknown network')
    }

}

module.exports = {
    POLYGON: POLYGON,
    FANTOM: FANTOM,
    DEFAULT: DEFAULT,
    setDefault: setDefault
}
