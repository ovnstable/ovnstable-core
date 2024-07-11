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
    let zap = await ethers.getContract("AerodromeCLZap");

    let account = await initWallet();
    // await transferETH(0.000001, "0x0000000000000000000000000000000000000000");

    let positions = await zap.getPositions("0x66BC0120b3287f08408BCC76ee791f0bad17Eeef");
    console.log("length: ", positions.length);
    for (let i = 0; i < positions.length; i++) {
        console.log("platform:", positions[i].platform);
        console.log("tokenId:", positions[i].tokenId.toString());
        console.log("poolId:", positions[i].poolId.toString());
        console.log("token0:", positions[i].token0.toString());
        console.log("token1:", positions[i].token1.toString());
        console.log("amount0:", positions[i].amount0.toString());
        console.log("amount1:", positions[i].amount1.toString());
        console.log("rewardAmount0:", positions[i].rewardAmount0.toString());
        console.log("rewardAmount1:", positions[i].rewardAmount1.toString());
        console.log("tickLower:", positions[i].tickLower.toString());
        console.log("tickUpper:", positions[i].tickUpper.toString());
        console.log("currentTick:", positions[i].currentTick.toString());
        console.log("apr:", positions[i].apr.toString());
        console.log("----------------------------------");
    }

    let tokenId = 62329;
    let poolId = "0x4D69971CCd4A636c403a3C1B00c85e99bB9B5606";
    let tickRange = await zap.closestTicksForCurrentTick(poolId);
    tickRange = [tickRange.left, tickRange.right];
    console.log("tickRange", tickRange);
    let inputTokens = [
        {
            tokenAddress: "0x4200000000000000000000000000000000000006",
            price: "3094280172653492400000"
        },
        {
            tokenAddress: "0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376",
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
    let nftContract = (await getERC721("aerodromeNpm")).connect(account);
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
