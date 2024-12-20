const hre = require("hardhat");
const {getContract, showM2M, execTimelock, transferAsset, getERC20ByAddress, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

const {BLAST} = require("@overnight-contracts/common/utils/assets");
const { toAsset } = require("@overnight-contracts/common/utils/decimals");

async function main() {

    usdb = await getERC20ByAddress('0x4300000000000000000000000000000000000003', '0xBa6b468e6672514f3c59D5D8B8731B1956BA5D22')
    let strategy = await getContract('StrategyFenixSwap', 'blast');
    // console.log("testFenixSwap #2 - unstake")

    // usdb = await getERC20ByAddress('0x4300000000000000000000000000000000000003', '0xBa6b468e6672514f3c59D5D8B8731B1956BA5D22')

    // usdbBefore = await usdb.balanceOf(strategy.address);
    // console.log("usdbBefore ", usdbBefore)

    // // await transferETH(1, strategy.address);
    // await transferETH(10, '0x8df424e487De4218B347e1798efA11A078fecE90');

    

    
    // DEPOSIT

    // await transferAsset(BLAST.usdb, strategy.address, toAsset(100));
    // await (await strategy.testDeposit()).wait();



    // UNSTAKE

    //// if amount > USDB balance
    // usdbBefore = await usdb.balanceOf(strategy.address);
    // console.log("usdbBefore ", usdbBefore);
    // await (await strategy.testUnstake("0x4300000000000000000000000000000000000003", 308564556325646872n, "0x8df424e487De4218B347e1798efA11A078fecE90")).wait();
    // usdbAfter = await usdb.balanceOf(strategy.address);
    // console.log("usdbAfter ", usdbAfter);

    //// if amount < USDB balance - работает не факт, что корректно
    // usdbBefore = await usdb.balanceOf(strategy.address);
    // console.log("usdbBefore ", usdbBefore);
    // await (await strategy.testUnstake("0x4300000000000000000000000000000000000003", 275776159414, "0x8df424e487De4218B347e1798efA11A078fecE90")).wait();
    // usdbAfter = await usdb.balanceOf(strategy.address);
    // console.log("usdbAfter ", usdbAfter);

    // 675776159414 - было
    // 275776159414 - хотел вывести
    // 1350989581416 - стало после "вывода"

    // UNSTAKE_FULL



    // CLAIM FEES - пока есть проблемы с тестированием, так как с учетом наших тиков мы ни разу не были в range => физов быть не могло
    // await (await strategy.testCliamFees()).wait();


    // await strategy.grantRole(Roles.DEFAULT_ADMIN_ROLE, '0xE12E06D810F08b7703D5266081f8023ACD21ce9d');
    // await strategy.grantRole(Roles.PORTFOLIO_AGENT_ROLE, '0xE12E06D810F08b7703D5266081f8023ACD21ce9d');


    // // GENERAL TEST
    // await testStrategy(filename, strategy, 'blast');


    // AMOUNT OF USDB THAT NEED TO BE SWAPED TO REACH TICK

    // console.log("   We are in testFenixSwap.js")

    // let strategy = await getContract('StrategyFenixSwap', 'blast');

    // console.log("   Переводим USDB на баланс страткгии")
    // console.log("   Адрес: ", strategy.address)

    // await transferAsset(BLAST.usdb, strategy.address, toAsset(350000));

    // console.log("   Дергаем swapAmountToReachTick")

    // await (await strategy.swapAmountToReachTick()).wait();

    // console.log("   Всё работает")

    

    // _TOTAL_VALUE
    // await (await strategy.testPositionTVL()).wait();
    // // 1701974.095295156905617462
    

    // CLAIM_FEES // .048631500534465923
    // console.log("#1");
    // usdbBefore = await usdb.balanceOf(strategy.address);
    // console.log("usdbBefore ", usdbBefore)

    // await (await strategy.testClaimFees()).wait();

    // usdbAfter = await usdb.balanceOf(strategy.address);
    // console.log("usdbAfter ", usdbAfter)
    // console.log("Difference: ", usdbAfter - usdbBefore)


    // TEST FNX SWAP
    // console.log("Transfering...")
    // await transferAsset(BLAST.fnx, strategy.address, toAsset(56));

    // console.log("Testing")
    // await (await strategy.testFnxSwap()).wait();

    // console.log("All right!")


    // TEST REINVEST
    // console.log("Transfering FNX to simulate rewards clam...");
    // await transferAsset(BLAST.fnx, strategy.address, toAsset(560)); // примерно 39$

    // console.log("Testing reinvest...");
    // await (await strategy.testReinvest()).wait();

    // // TVL difference:  39.512746419812816364 $

    // console.log("All right!")




    //  TEST WITHDRAW PART

    // 34042014965045101609321656874

    // usdbBefore = await usdb.balanceOf(strategy.address);
    // console.log("usdbBefore ", usdbBefore)

    // await (await strategy.testWithdraw(239000000000000000000n)).wait();

    // usdbAfter = await usdb.balanceOf(strategy.address);
    // console.log("usdbAfter ", usdbAfter)
    // console.log("Difference: ", usdbAfter - usdbBefore)

    // console.log("All right!")

    // testWithdraw






    //  TEST WITHDRAW FULL

    // usdbBefore = await usdb.balanceOf(strategy.address);
    // console.log("usdbBefore ", usdbBefore)

    // await (await strategy.testWithdraw()).wait();

    // usdbAfter = await usdb.balanceOf(strategy.address);
    // console.log("usdbAfter ", usdbAfter)
    // console.log("Difference: ", usdbAfter - usdbBefore)

    // console.log("All right!")



    // TEST testPartLiquidityCalculation - ЧУТЬ-ЧУТЬ

    // console.log("START!")
    // await (await strategy.testWithdrawPart(3400000000000000000000n)).wait();
    // // 3429091280845307043052
    // // 3399986302965693137216
    // console.log("All right!")


    // TEST testPartLiquidityCalculation - СИЛЬНО

    // console.log("START!")
    // await (await strategy.testWithdrawPart(1400000000000000000000000n)).wait();
    // // 3429091280845307043052
    // console.log("All right!")


    // 29283941664838604765403
    // 1400000000000000000000000
    // 1457611167498866446291531





    // TEST достать всю ликвидность

    console.log("START!")
    await (await strategy.testWithdrawFull()).wait();
    console.log("All right!")

    // testWithdrawFull

    // 12388.956662969029644480
    // 


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

    // 350000000000000000000000
    // 154282278162823436000000

    // 13837119302442502
    
    
    // 69295651157794274968659454035
    // 69498586290896228577819235694
    // 6800509971600657896242374981
    // 68005099716006578962423749



    // 68005099716006578962423749
    // 68345125214586611857235867