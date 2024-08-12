const { expect } = require('chai');
const { deployments, ethers, getNamedAccounts, artifacts } = require('hardhat');
const {
    transferAsset,
    getERC20,
    transferETH,
    initWallet,
    execTimelock,
    getContract,
    getChainId, getERC721,
} = require('@overnight-contracts/common/utils/script-utils');
const { resetHardhat, greatLess, resetHardhatToLastBlock } = require('@overnight-contracts/common/utils/tests');
const BN = require('bn.js');
const hre = require('hardhat');
const { sharedBeforeEach } = require('@overnight-contracts/common/utils/sharedBeforeEach');
const { toE6, fromE6, fromE18, toAsset, toE18 } = require('@overnight-contracts/common/utils/decimals');
const axios = require('axios');
const { default: BigNumber } = require('bignumber.js');
const { getOdosAmountOut, getOdosSwapData } = require('@overnight-contracts/common/utils/odos-helper');
const { getOdosAmountOutOnly } = require('@overnight-contracts/common/utils/odos-helper.js');

async function main() {
    // let zap = await ethers.getContract("PancakeCLZap");
    let zap = await ethers.getContract("AerodromeCLZap");

    let account = await initWallet();
    // await transferETH(0.000001, "0x0000000000000000000000000000000000000000");

    let aggregator = await ethers.getContract("PoolAggregator");
    for (let it = 1; it <= 20; it++) {
        let start = new Date().getTime();
        let pools = await aggregator.aggregatePools(100, 0, it);
        let end = new Date().getTime();
        let time = end - start;
        console.log("it:", it, "size:", pools.length, "time:", time);
    }
    return;

    let positions = await zap.getPositions("0xa30b8deFcC9eDdf9E960ef810D89E194C1f65771");
    console.log("length: ", positions.length);
    for (let i = 0; i < positions.length; i++) {
        console.log("platform:", positions[i].platform);
        console.log("tokenId:", positions[i].tokenId.toString());
        console.log("poolId:", positions[i].poolId.toString());
        console.log("token0:", positions[i].token0.toString());
        console.log("token1:", positions[i].token1.toString());
        console.log("amount0:", positions[i].amount0.toString());
        console.log("amount1:", positions[i].amount1.toString());
        console.log("fee0:", positions[i].fee0.toString());
        console.log("fee1:", positions[i].fee1.toString());
        console.log("emissions:", positions[i].emissions.toString());
        console.log("tickLower:", positions[i].tickLower.toString());
        console.log("tickUpper:", positions[i].tickUpper.toString());
        console.log("currentTick:", positions[i].currentTick.toString());
        console.log("isStaked:", positions[i].isStaked.toString());
        console.log("----------------------------------");
    }
    return;

    let tokenId = 57417;
    let poolId = "0xe37304F7489ed253b2A46A1d9DabDcA3d311D22E";
    let tickRange = await zap.closestTicksForCurrentTick(poolId);
    tickRange = [tickRange.left, tickRange.right];
    console.log("tickRange", tickRange);
    let inputTokens = [
        {
            tokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            price: "3094280172653492400000"
        },
        {
            tokenAddress: "0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65",
            price: "1001339157528039300"
        }
    ];
    let result = await zap.getProportionForRebalance(tokenId, poolId, tickRange, inputTokens);
    console.log("inputTokenAddresses:", result.inputTokenAddresses);
    console.log("inputTokenAmounts:", result.inputTokenAmounts.map((x) => x.toString()));
    console.log("outputTokenAddresses:", result.outputTokenAddresses);
    console.log("outputTokenProportions:", result.outputTokenProportions.map((x) => x.toString()));
    console.log("outputTokenAmounts:", result.outputTokenAmounts.map((x) => x.toString()));

    let proportions = {
        "inputTokens": result.inputTokenAddresses.map((e, i) => ({
            "tokenAddress": e,
            "amount": result.inputTokenAmounts[i].toString()
        })),
        "outputTokens": result.outputTokenAddresses.map((e, i) => ({
            "tokenAddress": e,
            "proportion": fromE6(result.outputTokenProportions[i].toString()),
        })),
        "amountToken0Out": result.outputTokenAmounts[0].toString(),
        "amountToken1Out": result.outputTokenAmounts[1].toString(),
    };

    console.log("proportions", proportions);
    let request;
    if (proportions.inputTokens.length === 0 && proportions.outputTokens.length === 0) {
        request = {
            "data": "0x"
        }
    } else {
        request = await getOdosRequest({
            'inputTokens': proportions.inputTokens,
            'outputTokens': proportions.outputTokens,
            'userAddr': zap.address,
        });
    }

    const inputTokensSwap = proportions.inputTokens.map(({ tokenAddress, amount }) => {
        return { "tokenAddress": tokenAddress, "amountIn": amount };
    });
    const outputTokensSwap = proportions.outputTokens.map(({ tokenAddress }) => {
        return { "tokenAddress": tokenAddress, "receiver": zap.address };
    });

    let swapData = {
        inputs: inputTokensSwap,
        outputs: outputTokensSwap,
        data: request.data,
    };
    let aerodromeData = {
        pair: poolId,
        amountsOut: [proportions.amountToken0Out, proportions.amountToken1Out],
        tickRange: tickRange,
    }
    console.log('swapData:', swapData);
    console.log('aerodromeData:', aerodromeData);
    let nftContract = (await getERC721("pancakeNpm")).connect(account);
    await (await nftContract.approve(zap.address, tokenId)).wait();
    console.log("approved!");
    let price = await (await zap.connect(account).rebalance(swapData, aerodromeData, tokenId)).wait();

    const inputTokensEvent = price.events.find((event) => event.event === 'InputTokens');
    const outputTokensEvent = price.events.find((event) => event.event === 'OutputTokens');
    const putIntoPoolEvent = price.events.find((event) => event.event === 'PutIntoPool');
    const returnedToUserEvent = price.events.find((event) => event.event === 'ReturnedToUser');

    console.log(`Input tokens: ${inputTokensEvent.args.amountsIn} ${inputTokensEvent.args.tokensIn}`);
    console.log(`Output tokens: ${outputTokensEvent.args.amountsOut} ${outputTokensEvent.args.tokensOut}`);
    console.log(`Tokens put into pool: ${putIntoPoolEvent.args.amountsPut} ${putIntoPoolEvent.args.tokensPut}`);
    console.log(`Tokens returned to user: ${returnedToUserEvent.args.amountsReturned} ${returnedToUserEvent.args.tokensReturned}`);
}

async function getOdosRequest(request) {
    let swapParams = {
        'chainId': await getChainId(),
        'gasPrice': 1,
        'inputTokens': request.inputTokens,
        'outputTokens': request.outputTokens,
        'userAddr': request.userAddr,
        'slippageLimitPercent': 1,
        'sourceBlacklist': ['Hashflow', 'Overnight Exchange'],
        'sourceWhitelist': [],
        'simulate': false,
        'pathViz': false,
        'disableRFQs': false,
    };

    // @ts-ignore
    const urlQuote = 'https://api.overnight.fi/root/odos/sor/quote/v2';
    const urlAssemble = 'https://api.overnight.fi/root/odos/sor/assemble';
    let transaction;
    try {
        let quotaResponse = (await axios.post(urlQuote, swapParams, { headers: { 'Accept-Encoding': 'br' } }));

        let assembleData = {
            'userAddr': request.userAddr,
            'pathId': quotaResponse.data.pathId,
            'simulate': true,
        };

        // console.log("assembleData: ", assembleData)
        transaction = (await axios.post(urlAssemble, assembleData, { headers: { 'Accept-Encoding': 'br' } }));
        // console.log('trans: ', transaction, quotaResponse);
        // console.log("odos transaction simulation: ", transaction.data.simulation)
    } catch (e) {
        console.log('[zap] getSwapTransaction: ', e);
        return 0;
    }
    if (transaction.statusCode === 400) {
        console.log(`[zap] ${transaction.description}`);
        return 0;
    }
    if (transaction.data.transaction === undefined) {
        console.log('[zap] transaction.tx is undefined');
        return 0;
    }

    console.log('Success get data from Odos!');
    return transaction.data.transaction;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
