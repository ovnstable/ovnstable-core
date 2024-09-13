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
        // 'sourceBlacklist': ['Hashflow', 'Overnight Exchange', 'Aerodrome Slipstream'],
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
    let items = [];

    const inputTokensEvent = zapInResponse.events.find((event) => event.event === 'InputTokens').args;
    const outputTokensEvent = zapInResponse.events.find((event) => event.event === 'OutputTokens').args;
    const initialTokensEvent = zapInResponse.events.find((event) => event.event === 'InitialTokens').args;
    const putIntoPoolEvent = zapInResponse.events.find((event) => event.event === 'PutIntoPool').args;
    const swappedIntoPoolEvent = zapInResponse.events.find((event) => event.event === 'SwapedIntoPool').args;
    const returnedToUserEvent = zapInResponse.events.find((event) => event.event === 'ReturnedToUser').args;

    const poolPriceInitialEvent = zapInResponse.events.find((event) => event.event === 'PoolPriceInitial').args;
    const poolPriceAfterOdosSwapEvent = zapInResponse.events.find((event) => event.event === 'PoolPriceAfterOdosSwap').args;
    const poolPriceAfterSwapEvent = zapInResponse.events.find((event) => event.event === 'PoolPriceAfterSwap').args;

    console.log(`Price initial: ${poolPriceInitialEvent.price}`);
    console.log(`Price after odoswap, diff to initial: ${poolPriceAfterOdosSwapEvent.price}, ${poolPriceAfterOdosSwapEvent.price / poolPriceInitialEvent.price - 1}`);
    console.log(`Price after swap, diff to initial: ${poolPriceAfterSwapEvent.price}, ${poolPriceAfterSwapEvent.price / poolPriceInitialEvent.price - 1}`);

    console.log(`Input tokens: ${inputTokensEvent.amounts} ${inputTokensEvent.tokens}`);
    console.log(`Output tokens: ${outputTokensEvent.amounts} ${outputTokensEvent.tokens}`);

    // console.log(`Initial tokens: ${initialTokensEvent.amounts} ${initialTokensEvent.tokens}`);
    // console.log(`Put into pool: ${putIntoPoolEvent.amounts} ${putIntoPoolEvent.tokens}`);
    // console.log(`Swapped into pool: ${swappedIntoPoolEvent.amounts} ${swappedIntoPoolEvent.tokens}`);
    // console.log(`Returned to user: ${returnedToUserEvent.amounts} ${returnedToUserEvent.tokens}`);

    items.push({
        name: 'Initial tokens',
        token0: `${initialTokensEvent.amounts[0]}`,
        token1: `${initialTokensEvent.amounts[1]}`,
        diff0: 0,
        diff1: 0
    });
    items.push({
        name: 'Put into pool',
        token0: `${putIntoPoolEvent.amounts[0]}`,
        token1: `${putIntoPoolEvent.amounts[1]}`,
        diff0: putIntoPoolEvent.amounts[0] / initialTokensEvent.amounts[0],
        diff1: putIntoPoolEvent.amounts[1] / initialTokensEvent.amounts[1]
    });
    items.push({
        name: 'Swaped into pool',
        token0: `${swappedIntoPoolEvent.amounts[0]}`,
        token1: `${swappedIntoPoolEvent.amounts[1]}`,
        diff0: swappedIntoPoolEvent.amounts[0] / initialTokensEvent.amounts[0],
        diff1: swappedIntoPoolEvent.amounts[1] / initialTokensEvent.amounts[1]
    });
    items.push({
        name: 'Returned to user',
        token0: `${returnedToUserEvent.amounts[0]}`,
        token1: `${returnedToUserEvent.amounts[1]}`,
        diff0: returnedToUserEvent.amounts[0] / initialTokensEvent.amounts[0],
        diff1: returnedToUserEvent.amounts[1] / initialTokensEvent.amounts[1]
    });
    
    console.table(items);
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
    showZapEvents: showZapEvents,
    amountFromUsdPrice: amountFromUsdPrice,
    toDecimals: toDecimals,
    fromDecimals: fromDecimals,
    handleProportionResponse: handleProportionResponse
};