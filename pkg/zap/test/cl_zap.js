const { expect } = require('chai');
const { deployments, ethers } = require('hardhat');
const { resetHardhatToLastBlock } = require('@overnight-contracts/common/utils/tests');
const BN = require('bn.js');
const hre = require('hardhat');
const { sharedBeforeEach } = require('@overnight-contracts/common/utils/sharedBeforeEach');
const { getTestCases, tokens } = require('./test_cases.js');
const { 
    updatePrices, 
    getOdosRequest, 
    setUp, 
    showBalances, 
    getPrice, 
    amountFromUsdPrice,
    toDecimals,
    handleProportionResponse,
    showZapEvents
} = require('./utils.js');
const { fromE6, fromE18, toE18 } = require('@overnight-contracts/common/utils/decimals');

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe('Testing all zaps', function() {
    sharedBeforeEach('update prices', async () => {
        await updatePrices(tokens[process.env.ETH_NETWORK]);
    });
    let testCases = getTestCases();
    testCases.forEach((testCase) => {
        describe(`Test ${testCase?.name}`, function() {
            let zap;
            let account;
            let inputTokensERC20;

            sharedBeforeEach('deploy and setup', async () => {
                await hre.run('compile');
                await resetHardhatToLastBlock();
                await deployments.fixture([testCase.name]);
                zap = await ethers.getContract(testCase.name);
                ({ account, inputTokensERC20 } = await setUp(testCase.inputTokens));
                console.log('setUp done successfully');
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
                console.log('before done successfully');
            });

            it('zapIn to the pool', async function() {
                console.log("cooked testCase:", testCase);
                await check();
            });

            async function check() {
                await showBalances(account, inputTokensERC20);
                let proportionResponse = await zap.getProportionForZap(testCase.pool, testCase.tickRange, testCase.inputTokens);
                let proportion = handleProportionResponse(proportionResponse);

                let odosRequestData = {
                    'inputTokens': proportion.inputTokenAddresses.map((e, i) => ({
                        'tokenAddress': e,
                        'amount': proportion.inputTokenAmounts[i]
                    })).filter((x) => x.tokenAddress !== ZERO_ADDRESS),
                    'outputTokens': proportion.outputTokenAddresses.map((e, i) => ({
                        'tokenAddress': e,
                        'proportion': fromE6(proportion.outputTokenProportions[i]),
                    })).filter((x) => x.tokenAddress !== ZERO_ADDRESS),
                    'userAddr': zap.address
                }
                console.log("odosRequestData:", odosRequestData);
                let {request, outAmounts} = await getOdosRequest(odosRequestData);

                let swapData = {
                    inputs: odosRequestData.inputTokens.map((e) => ({
                        'tokenAddress': e.tokenAddress,
                        'amountIn': e.amount
                    })),
                    outputs: odosRequestData.outputTokens.map((e) => ({
                        'tokenAddress': e.tokenAddress,
                        'receiver': zap.address,
                        'amountMin': "0"
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
                }
                
                console.log('swapData:', swapData);
                console.log('paramsData:', paramsData);
                let zapInResponse = await (await zap.connect(account).zapIn(swapData, paramsData)).wait();
                await showBalances(account, inputTokensERC20);
                await showZapEvents(zapInResponse);
                return;
                const inputTokensEvent = zapInResponse.events.find((event) => event.event === 'InputTokens');
                const outputTokensEvent = zapInResponse.events.find((event) => event.event === 'OutputTokens');
                const putIntoPoolEvent = price.events.find((event) => event.event === 'PutIntoPool');
                const returnedToUserEvent = price.events.find((event) => event.event === 'ReturnedToUser');

                console.log(`Input tokens: ${inputTokensEvent.args.amountsIn} ${inputTokensEvent.args.tokensIn}`);
                console.log(`Output tokens: ${outputTokensEvent.args.amountsOut} ${outputTokensEvent.args.tokensOut}`);
                console.log(`Tokens put into pool: ${putIntoPoolEvent.args.amountsPut} ${putIntoPoolEvent.args.tokensPut}`);
                console.log(`Tokens returned to user: ${returnedToUserEvent.args.amountsReturned} ${returnedToUserEvent.args.tokensReturned}`);

                expect(token0In.address).to.equals(inputTokensEvent.args.tokensIn[0]);
                expect(token1In.address).to.equals(inputTokensEvent.args.tokensIn[1]);

                expect(amountToken0In).to.equals(inputTokensEvent.args.amountsIn[0]);
                expect(amountToken1In).to.equals(inputTokensEvent.args.amountsIn[1]);

                expect(token0Out.address).to.equals(putIntoPoolEvent.args.tokensPut[0]);
                expect(token1Out.address).to.equals(putIntoPoolEvent.args.tokensPut[1]);

                expect(token0Out.address).to.equals(returnedToUserEvent.args.tokensReturned[0]);
                expect(token1Out.address).to.equals(returnedToUserEvent.args.tokensReturned[1]);

                // 1) tokensPut в пределах границы согласно пропорциям внутри пула:
                const proportion0 = reserves[0] / reserves[0].add(reserves[1]);
                const proportion1 = reserves[1] / reserves[0].add(reserves[1]);
                const putTokenAmount0 = fromToken0Out(putIntoPoolEvent.args.amountsPut[0]);
                const putTokenAmount1 = fromToken1Out(putIntoPoolEvent.args.amountsPut[1]);

                console.log(proportion0, proportion1, putTokenAmount0, putTokenAmount1);

                console.log('prop0: ', proportion0);
                console.log('prop1: ', putTokenAmount0 / (putTokenAmount0 + putTokenAmount1));
                expect(Math.abs(proportion0 - putTokenAmount0 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.05);
                expect(Math.abs(proportion1 - putTokenAmount1 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.05);

                // 2) Общая сумма вложенного = (общей сумме обмененного - допустимый slippage)
                const inTokenAmount0 = fromToken0In(inputTokensEvent.args.amountsIn[0]);
                const inTokenAmount1 = fromToken1In(inputTokensEvent.args.amountsIn[1]);
                const outTokenAmount0 = fromToken0Out(outputTokensEvent.args.amountsOut[0]);
                const outTokenAmount1 = fromToken1Out(outputTokensEvent.args.amountsOut[1]);

                console.log(inTokenAmount0, inTokenAmount1, putTokenAmount0, putTokenAmount1);

                expect(fromToken0In(await token0In.balanceOf(zap.address))).to.lessThan(1);
                expect(fromToken1In(await token1In.balanceOf(zap.address))).to.lessThan(1);
                expect(fromToken0Out(await token0Out.balanceOf(zap.address))).to.lessThan(1);
                expect(fromToken1Out(await token1Out.balanceOf(zap.address))).to.lessThan(1);
            }
        });
    });
});
