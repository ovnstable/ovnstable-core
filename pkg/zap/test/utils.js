const { ethers } = require('hardhat');
const {
    transferAsset,
    getERC20,
    execTimelock,
    getContract,
    getChainId,
    getERC20ByAddress,
} = require('@overnight-contracts/common/utils/script-utils');
require('@overnight-contracts/common/utils/sharedBeforeEach');
const { toE6, fromE6, fromE18, toE18 } = require('@overnight-contracts/common/utils/decimals');
const axios = require('axios');

async function setUp(inputTokens) {
    const signers = await ethers.getSigners();
    const account = signers[0];

    let usdPlus = await getContract('UsdPlusToken', process.env.STAND);
    let usdc;
    if (process.env.STAND === 'base') {
        usdc = await getERC20('usdbc');
    } else {
        usdc = await getERC20('usdc');
    }
    await transferAsset(usdc.address, account.address);
    for (let i = 0; i < inputTokens.length; i++) {
        try {
            let tokenERC20 = await getERC20ByAddress(inputTokens[i].tokenAddress);
            await transferAsset(tokenERC20.address, account.address);
        } catch (e) {
            console.log(`[zap] transferAsset: ${e}`);
        }
    }

    await execTimelock(async (timelock) => {
        let exchangeUsdPlus = await usdPlus.exchange();
        await usdPlus.connect(timelock).setExchanger(timelock.address);
        await usdPlus.connect(timelock).mint(account.address, toE6(100_000));
        await usdPlus.connect(timelock).setExchanger(exchangeUsdPlus);
    });

    return {
        account: account,
        inputTokensERC20: await Promise.all(inputTokens.map(async (token) => (await getERC20ByAddress(token.tokenAddress)).connect(account))),
    };
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
    let outAmounts;

    let quotaResponse = (await axios.post(urlQuote, swapParams, { headers: { 'Accept-Encoding': 'br' } }));
    outAmounts = quotaResponse.data.outAmounts;
    let assembleData = {
        'userAddr': request.userAddr,
        'pathId': quotaResponse.data.pathId,
        'simulate': true,
    };
    transaction = (await axios.post(urlAssemble, assembleData, { headers: { 'Accept-Encoding': 'br' } }));

    if (transaction.statusCode === 400) {
        throw new Error(`[zap] ${transaction.description}`);
    }

    if (transaction.data.transaction === undefined) {
        throw new Error('[zap] transaction.tx is undefined');
    }

    console.log('Success get data from Odos!');
    return {
        "request": transaction.data.transaction,
        "outAmounts": outAmounts
    };
}

let prices;

async function updatePrices(tokens) {
    const urlPrices = 'https://ovnstable-pools-aggregator.onrender.com/tokens';
    const responseData = (await axios.get(urlPrices)).data;
    let chainId = await getChainId();
    let oraclePrices = responseData.chainTokenMap[chainId].tokenMap;
    prices = {};
    for (let tokenSymbol of Object.keys(tokens)) {
        let address = tokens[tokenSymbol].toLowerCase();
        prices[address] = oraclePrices[address].price;
    }
}

function getPrice(tokenAddress) {
    return prices[tokenAddress.toLowerCase()];
}

function amountFromUsdPrice(tokenAddress, amountUsd) {
    let price = getPrice(tokenAddress);
    return amountUsd / price;
}

async function fromDecimals(token, amount) {
    let decimals = await token.decimals();
    switch (decimals) {
        case 18:
            return fromE18(amount);
        case 6:
            return fromE6(amount);
        default:
            throw new Error('Unknown decimals');
    }
}

async function toDecimals(token, amount) {
    let decimals = await token.decimals();
    switch (decimals) {
        case 18:
            return toE18(amount);
        case 6:
            return toE6(amount);
        default:
            throw new Error('Unknown decimals');
    }
}

async function showBalances(account, inputTokens) {
    const items = [];
    for (let i = 0; i < inputTokens.length; i++) {
        items.push({
            name: await inputTokens[i].symbol(),
            balance: await fromDecimals(inputTokens[i], await inputTokens[i].balanceOf(account.address)),
        });
    }
    console.table(items);
}

async function showZapEvents(zapInResponse) {
    let items1 = [];
    let items2 = [];

    const inputTokensEvent = zapInResponse.events.find((event) => event.event === 'InputTokens');
    const outputTokensEvent = zapInResponse.events.find((event) => event.event === 'OutputTokens');
    const putIntoPoolEvent = zapInResponse.events.find((event) => event.event === 'PutIntoPool');
    const swappedIntoPoolEvent = zapInResponse.events.find((event) => event.event === 'SwappedIntoPool');
    const returnedToUserEvent = zapInResponse.events.find((event) => event.event === 'ReturnedToUser');

    const poolPriceInitialEvent = zapInResponse.events.find((event) => event.event === 'PoolPriceInitial');
    const poolPriceAfterOdosSwapEvent = zapInResponse.events.find((event) => event.event === 'PoolPriceAfterOdosSwap');
    const poolPriceAfterSwapEvent = zapInResponse.events.find((event) => event.event === 'PoolPriceAfterSwap');

    for (let i = 0; i < 2; i++) {
        items1.push({
            name: await getERC20ByAddress(inputTokensEvent.args.tokens[i]).symbol(),
            "InputTokens": inputTokensEvent.args.amounts[i],
        });
    }
    for (let i = 0; i < 2; i++) {
        items1.push({
            name: await getERC20ByAddress(outputTokensEvent.args.tokens[i]).symbol(),
            "OutputTokens": outputTokensEvent.args.amounts[i],
        });
    }
    for (let i = 0; i < 2; i++) {
            items1.push({
            name: await getERC20ByAddress(putIntoPoolEvent.args.tokens[i]).symbol(),
            "PutIntoPool": putIntoPoolEvent.args.amounts[i],
        });
    }
    for (let i = 0; i < 2; i++) {
        items1.push({
            name: await getERC20ByAddress(swappedIntoPoolEvent.args.tokens[i]).symbol(),
            "SwappedIntoPool": swappedIntoPoolEvent.args.amounts[i],
        });
    }
    for (let i = 0; i < 2; i++) {
        items1.push({
            name: await getERC20ByAddress(returnedToUserEvent.args.tokens[i]).symbol(),
            "ReturnedToUser": returnedToUserEvent.args.amounts[i],
        });
    }

    items2.push({
        name: 'PoolPriceInitial',
        price: poolPriceInitialEvent.args.price,
    });
    items2.push({
        name: 'PoolPriceAfterOdosSwap',
        "PoolPriceAfterOdosSwap": poolPriceAfterOdosSwapEvent.args.price,
    });
    items2.push({
        name: 'PoolPriceAfterSwap',
        "PoolPriceAfterSwap": poolPriceAfterSwapEvent.args.price,
    });
    console.table(items1);
    console.table(items2);


}


function handleProportionResponse(response) {
    let handledResponse = {
        inputTokenAddresses: response.inputTokenAddresses,
        inputTokenAmounts: response.inputTokenAmounts.map((x) => x.toString()),
        outputTokenAddresses: response.outputTokenAddresses,
        outputTokenProportions: response.outputTokenProportions.map((x) => x.toString()),
        outputTokenAmounts: response.outputTokenAmounts.map((x) => x.toString()),
        poolProportionsUsd: response.poolProportionsUsd.map((x) => x.toString()),
    };
    console.log("getProportion response:", handledResponse);
    return handledResponse;
}

module.exports = {
    updatePrices: updatePrices,
    getOdosRequest: getOdosRequest,
    setUp: setUp,
    getPrice: getPrice,
    showBalances: showBalances,
    amountFromUsdPrice: amountFromUsdPrice,
    toDecimals: toDecimals,
    fromDecimals: fromDecimals,
    handleProportionResponse: handleProportionResponse
};