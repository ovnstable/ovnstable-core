const { ethers } = require('hardhat');
const {
    getERC20ByAddress,
    initWallet
} = require('@overnight-contracts/common/utils/script-utils');
const BN = require('bn.js');
const { toE6, fromE6, fromE18, toAsset, toE18 } = require('@overnight-contracts/common/utils/decimals');
const { default: BigNumber } = require('bignumber.js');
const { 
    updatePrices, 
    getOdosRequest, 
    showBalances, 
    getPrice, 
    amountFromUsdPrice,
    toDecimals,
    handleProportionResponse,
    showZapEvents,
    showSimulationResult
} = require('../test/utils.js');
const { tokens } = require('../test/test_cases.js');

let testCase;
let zap;
let account;
let inputTokensERC20;

async function main() {
    testCase = {
        name: 'PancakeCLZapBase',
        pool: '0xBE700f5c75dFCbEf3Cae37873aEEB1724daED3f6', // tvl $25k
        inputTokens: [
            {
                tokenAddress: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
                amountInUsd: 0.1
            }
        ]
    };

    await updatePrices(tokens[process.env.ETH_NETWORK]);

    zap = await ethers.getContract("PancakeCLZapBase");


    let positions = await zap.getPositions("0xa30b8deFcC9eDdf9E960ef810D89E194C1f65771");
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

    account = await initWallet();
    inputTokensERC20 = await Promise.all(testCase.inputTokens.map(async (token) => (await getERC20ByAddress(token.tokenAddress)).connect(account)));

    await cookTestCase();
    await showBalances(account, inputTokensERC20);

    let proportionResponse = await zap.getProportionForZap(testCase.pool, testCase.tickRange, testCase.inputTokens);
    let proportion = handleProportionResponse(proportionResponse);

    let odosRequestData = {
        'inputTokens': proportion.inputTokenAddresses.map((e, i) => ({
            'tokenAddress': e,
            'amount': proportion.inputTokenAmounts[i]
        })).filter((x) => x.tokenAddress !== ethers.constants.AddressZero),
        'outputTokens': proportion.outputTokenAddresses.map((e, i) => ({
            'tokenAddress': e,
            'proportion': fromE6(proportion.outputTokenProportions[i]),
        })).filter((x) => x.tokenAddress !== ethers.constants.AddressZero),
        'userAddr': zap.address
    }
    console.log("odosRequestData:", odosRequestData);
    let {request, outAmounts} = await getOdosRequest(odosRequestData);

    let swapData = {
        inputs: odosRequestData.inputTokens.map((e) => ({
            'tokenAddress': e.tokenAddress,
            'amountIn': e.amount
        })),
        outputs: odosRequestData.outputTokens.map((e, i) => ({
            'tokenAddress': e.tokenAddress,
            'receiver': zap.address,
            'amountMin': new BN(outAmounts[i]).muln(0.90).toString()
        })),
        data: request.data,
        needToAdjust: true,
        adjustSwapSide: false,
        adjustSwapAmount: 0
    };

    let paramsData = {
        pair: testCase.pool,
        amountsOut: [proportion.outputTokenAmounts[0], proportion.outputTokenAmounts[1]],
        tickRange: testCase.tickRange,
        isSimulation: true
    }
    
    console.log('swapData:', swapData);
    console.log('paramsData:', paramsData);
    try {
        await zap.connect(account).callStatic.zapIn(swapData, paramsData);
    } catch (e) {
        console.log('e:', e);
        const simulationResult = zap.interface.parseError(e.data);
        swapData.adjustSwapAmount = simulationResult.args[4];
        swapData.adjustSwapSide = simulationResult.args[5];
        paramsData.isSimulation = false;
        showSimulationResult(simulationResult);
    }
    let zapInResponse = await (await zap.connect(account).zapIn(swapData, paramsData)).wait();
    await showBalances(account, inputTokensERC20);
    await showZapEvents(zapInResponse);
}

async function cookTestCase() {
    if (testCase.tickRange === undefined) {
        testCase.tickRange = (await zap.closestTicksForCurrentTick(testCase.pool)).slice(0, 2);
    }

    for (let i = 0; i < testCase.inputTokens.length; i++) {
        let amount = amountFromUsdPrice(testCase.inputTokens[i].tokenAddress, testCase.inputTokens[i].amountInUsd);
        testCase.inputTokens[i].amount = await toDecimals(inputTokensERC20[i], amount);
        await (await inputTokensERC20[i].approve(zap.address, testCase.inputTokens[i].amount)).wait();

        if (testCase.inputTokens[i].price === undefined) {  
            testCase.inputTokens[i].price = toE18(getPrice(testCase.inputTokens[i].tokenAddress));
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
