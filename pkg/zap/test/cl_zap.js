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
    showZapEvents,
    showSimulationResult
} = require('./utils.js');
const { fromE6, fromE18, toE18 } = require('@overnight-contracts/common/utils/decimals');

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
            });

            // it('zapIn to the pool', async function() {
            //     console.log("cooked testCase:", testCase);
            //     await check();
            // });

            it('getPositions', async function() {
                let positions = await zap.getPositions("0xab918d486c61ADd7c577F1af938117bBD422f088");
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
            });

            async function check() {
                await showBalances(account, inputTokensERC20);
                let tokenId = await zapIn();
                await increase(tokenId);
            }
    
            async function zapIn() {
                console.log("zapIn");
                await cookTestInput('zapin');
                let {swapData, paramsData} = await buildInputData();
                console.log('swapData:', swapData);
                console.log('paramsData:', paramsData);

                try {
                    await zap.connect(account).callStatic.zapIn(swapData, paramsData);
                } catch (e) {
                    console.log("e", e);
                    const simulationResult = zap.interface.parseError(e.data);
                    console.log("simulationResult:", simulationResult);
                    paramsData.adjustSwapAmount = simulationResult.args[4];
                    paramsData.adjustSwapSide = simulationResult.args[5];
                    paramsData.isSimulation = false;
                    await showBalances(account, inputTokensERC20);
                }
                console.log("simulation done");
                let zapInResponse = await (await zap.connect(account).zapIn(swapData, paramsData)).wait();
                await showBalances(account, inputTokensERC20);
                await showZapEvents(zapInResponse);
    
                const tokenId = zapInResponse.events.find((event) => event.event === 'TokenId').args.toString();
                console.log("zapIn done");
                return tokenId;
            }
    
            async function increase(tokenId) {
                console.log("increase");
                await cookTestInput('increase', tokenId);
                let currentTick = await zap.getCurrentPoolTick(testCase.pool);
                console.log("currentTick:", currentTick);
                console.log("tickRange:", testCase.tickRange);
                let {swapData, paramsData} = await buildInputData();
                console.log('swapData:', swapData);
                console.log('paramsData:', paramsData);
                
                try {
                    await zap.connect(account).callStatic.increase(swapData, paramsData, tokenId);
                } catch (e) {
                    const simulationResult = zap.interface.parseError(e.data);
                    console.log("simulationResult:", simulationResult);
                    paramsData.adjustSwapAmount = simulationResult.args[4];
                    paramsData.adjustSwapSide = simulationResult.args[5];
                    paramsData.isSimulation = false;
                    await showBalances(account, inputTokensERC20);
                }
                console.log("simulation done");
                let zapInResponse = await (await zap.connect(account).increase(swapData, paramsData, tokenId)).wait();
                await showBalances(account, inputTokensERC20);
                await showZapEvents(zapInResponse);
                console.log("increase done");
            }

            async function cookTestInput(op, tokenId) {
                if (testCase.tickRange === undefined) {
                    testCase.tickRange = (await zap.closestTicksForCurrentTick(testCase.pool)).slice(0, 2);
                }
                if (op === 'increase') {
                    testCase.tickRange = (await zap.getPositionTicks(tokenId)).slice(0, 2);
                }

                for (let i = 0; i < testCase.inputTokens.length; i++) {
                    let amount = amountFromUsdPrice(testCase.inputTokens[i].tokenAddress, testCase.inputTokens[i].amountInUsd);
                    // if (op === 'increase') {
                    //     amount /= 10;
                    // }
                    testCase.inputTokens[i].amount = await toDecimals(inputTokensERC20[i], amount);
                    await (await inputTokensERC20[i].approve(zap.address, testCase.inputTokens[i].amount)).wait();

                    if (testCase.inputTokens[i].price === undefined) {  
                        testCase.inputTokens[i].price = toE18(getPrice(testCase.inputTokens[i].tokenAddress));
                    }
                }
            }

            async function buildInputData() {
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
                        'amountMin': new BN(outAmounts[i]).muln(0.99).toString()
                    })),
                    data: request.data
                };
    
                let paramsData = {
                    pool: testCase.pool,
                    amountsOut: [proportion.outputTokenAmounts[0], proportion.outputTokenAmounts[1]],
                    tickRange: testCase.tickRange,
                    isSimulation: true,
                    adjustSwapSide: false,
                    adjustSwapAmount: 0
                }
                return {
                    "swapData": swapData,
                    "paramsData": paramsData
                };
            }
        });
    });
});
