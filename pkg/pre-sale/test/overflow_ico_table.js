const { expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const BN = require("bn.js");
const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { toE18, fromE18, toE6, fromE6 } = require("@overnight-contracts/common/utils/decimals");
const { greatLess } = require("@overnight-contracts/common/utils/tests");


describe("OverflowICO", function () {

    let account;
    let overflowICO;
    let commitToken;
    let salesToken;
    let firstAccount;
    let secondAccount;
    let allSigners;
    let whitelist;

    let startDate;
    let endDate;
    let claimBonusTime;
    let claimSalesFirstPartTime;

    let vestingBeginTime;
    let vestingDuration;
    let vestingProportion;
    let totalSales;

    let hardCap;
    let softCap;
    let minCommit;
    let maxCommit;

    const State = {
        WAITING_FOR_PRESALE_START: "0",
        COMMIT: "1",
        CLAIM_REFUND: "2",
        WAITING_FOR_CLAIM_BONUS: "3",
        CLAIM_BONUS: "4",
        WAITING_FOR_CLAIM_SALES_FIRST_PART: "5",
        CLAIM_SALES_FIRST_PART: "6",
        WAITING_FOR_CLAIM_VESTING: "7",
        CLAIM_VESTING: "8",
        NOTHING_TO_DO: "9"
    }

    sharedBeforeEach('deploy and setup', async () => {

        await hre.run("compile");
        const signers = await ethers.getSigners();
        account = signers[0];
        firstAccount = signers[1];
        secondAccount = signers[2];
        allSigners = signers;
        console.log("account address:", account.address);
        console.log("firstAccount address:", firstAccount.address);
        console.log("secondAccount address:", secondAccount.address);

        await deployments.fixture(['CommitToken', 'SalesToken', 'MockWhitelist']);

        commitToken = await ethers.getContract("CommitToken");
        salesToken = await ethers.getContract("SalesToken");
        whitelist = await ethers.getContract("MockWhitelist");

        await commitToken.setExchanger(account.address);
        await commitToken.setLiquidityIndex("1000000000000000000000000000");

        startDate = Math.floor((new Date().getTime()) / 1000);
        console.log('startDate: ' + startDate);
        endDate = startDate + addDays(4);
        console.log('endDate: ' + endDate);
        claimBonusTime = endDate + addDays(2);
        claimSalesFirstPartTime = endDate + addDays(4);
        vestingBeginTime = endDate + addDays(6);
        vestingDuration = addDays(30);
        vestingProportion = toE18(0.75);
        totalSales = toE18(25000);
        hardCap = toE6(500000);
        softCap = toE6(350000);
        minCommit = toE6(1);
        maxCommit = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

        await spendTime(startDate);

        let params = {
            commitToken: commitToken.address,
            salesToken: salesToken.address,
            hardCap: hardCap,
            softCap: softCap,
            startTime: startDate,
            endTime: endDate,
            claimBonusTime: claimBonusTime,
            claimSalesFirstPartTime: claimSalesFirstPartTime,
            vestingBeginTime: vestingBeginTime,
            vestingDuration: vestingDuration,
            vestingProportion: vestingProportion,
            minCommit: minCommit,
            maxCommit: maxCommit,
            totalSales: totalSales,
            whitelist: whitelist.address,
        }

        overflowICO = await deployments.deploy("OverflowICO", {
            from: account.address,
            args: [
                params
            ],
            log: true,
            skipIfAlreadyDeployed: false
        });

        console.log("OverflowICO created at " + overflowICO.address);

        overflowICO = await ethers.getContract("OverflowICO");
    });




    describe('[two participants], [one time], [between soft and hard cap], [full vest]', () => {

        let commitAmount1 = toE6(150_000);
        let commitAmount2 = toE6(250_000);

        beforeEach(async () => {
            await startFinishTwoUsers(commitAmount1, commitAmount2);
        });

        it('all states', async () => {
            await allStatesTwoUsers();
        })

        it('all claims', async () => {
            await commitShould(firstAccount, 0);
            await commitShould(secondAccount, 0);
            await userInfo(firstAccount, {
                userCommitments: 150000000000,
                salesToReceive: "7500000000000000000000",
                commitToReceive: "56842105147",
                commitToRefund: 0,
                lockedSales: "7500000000000000000000",
                unlockedSales: 0,
            })
            await userInfo(secondAccount, {
                userCommitments: 250000000000,
                salesToReceive: "12500000000000000000000",
                commitToReceive: "63157894852",
                commitToRefund: 0,
                lockedSales: "12500000000000000000000",
                unlockedSales: 0,
            })

            await overflowICO.connect(firstAccount).claimRefund();
            await overflowICO.connect(secondAccount).claimRefund();
            await commitShould(firstAccount, 0);
            await commitShould(secondAccount, 0);
            await spendTime(claimBonusTime + 1000);

            await overflowICO.connect(firstAccount).claimBonus();
            await overflowICO.connect(secondAccount).claimBonus();
            await userInfo(firstAccount, {
                userCommitments: 150000000000,
                salesToReceive: "7500000000000000000000",
                commitToReceive: "0",
                commitToRefund: 0,
                lockedSales: "7500000000000000000000",
                unlockedSales: 0,
            })
            await userInfo(secondAccount, {
                userCommitments: 250000000000,
                salesToReceive: "12500000000000000000000",
                commitToReceive: "0",
                commitToRefund: 0,
                lockedSales: "12500000000000000000000",
                unlockedSales: 0,
            })
            await commitShould(firstAccount, "56842105147");
            await commitShould(secondAccount, "63157894852");
            await spendTime(claimSalesFirstPartTime + 1000);
            await saleShould(firstAccount, 0);
            await saleShould(secondAccount, 0);
            await userInfo(firstAccount, {
                userCommitments: 150000000000,
                salesToReceive: "7500000000000000000000",
                commitToReceive: "0",
                commitToRefund: 0,
                lockedSales: "7500000000000000000000",
                unlockedSales: "0",
            })
            await userInfo(secondAccount, {
                userCommitments: 250000000000,
                salesToReceive: "12500000000000000000000",
                commitToReceive: "0",
                commitToRefund: 0,
                lockedSales: "12500000000000000000000",
                unlockedSales: "0",
            })
            await overflowICO.connect(firstAccount).claimSalesFirstPart();
            await overflowICO.connect(secondAccount).claimSalesFirstPart();
            await userInfo(firstAccount, {
                userCommitments: 150000000000,
                salesToReceive: "5625000000000000000000",
                commitToReceive: "0",
                commitToRefund: 0,
                lockedSales: "5625000000000000000000",
                unlockedSales: "0",
            })
            await userInfo(secondAccount, {
                userCommitments: 250000000000,
                salesToReceive: "9375000000000000000000",
                commitToReceive: "0",
                commitToRefund: 0,
                lockedSales: "9375000000000000000000",
                unlockedSales: "0",
            })
            await saleShould(firstAccount, "1875000000000000000000");
            await saleShould(secondAccount, "3125000000000000000000");
            await spendTime(vestingBeginTime + addDays(1));
            await userInfo(firstAccount, {
                userCommitments: 150000000000,
                salesToReceive: "5625000000000000000000",
                commitToReceive: "0",
                commitToRefund: 0,
                lockedSales: "5625000000000000000000",
                unlockedSales: "0",
            })
            await userInfo(secondAccount, {
                userCommitments: 250000000000,
                salesToReceive: "9375000000000000000000",
                commitToReceive: "0",
                commitToRefund: 0,
                lockedSales: "9375000000000000000000",
                unlockedSales: "0",
            })
            await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
            await overflowICO.connect(secondAccount).claimVesting(secondAccount.address);


            await overflowICO.logCommonInfo();
            await spendTime(vestingBeginTime + addDays(15));
            await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
            await overflowICO.connect(secondAccount).claimVesting(secondAccount.address);
            await overflowICO.logCommonInfo();
            await spendTime(vestingBeginTime + vestingDuration + 1000);
            await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
            await overflowICO.connect(secondAccount).claimVesting(secondAccount.address);
            await userInfo(firstAccount, {
                userCommitments: 150000000000,
                salesToReceive: "0",
                commitToReceive: "0",
                commitToRefund: 0,
                lockedSales: "0",
                unlockedSales: "0",
            })
            await userInfo(secondAccount, {
                userCommitments: 250000000000,
                salesToReceive: "0",
                commitToReceive: "0",
                commitToRefund: 0,
                lockedSales: "0",
                unlockedSales: "0",
            })
            await overflowICO.logCommonInfo();
        })

    });


    async function stateTrue(user, state) {

        await hre.network.provider.send('hardhat_mine');
        let currentState = Number.parseInt(await overflowICO.connect(user).getUserState(user.address));


        let currentStateName;
        for (const [key, value] of Object.entries(State)) {
            if (currentState === Number.parseInt(value)) {
                currentStateName = key;
            }
        }
        expect(currentState === Number.parseInt(state), `Current state: ${currentStateName}`).to.eq(true);
    }

    async function startFinishOneUserTwoTime(commitAmount) {

        await salesToken.mint(account.address, totalSales);
        await salesToken.approve(overflowICO.address, totalSales);
        await overflowICO.start();
        await spendTime(startDate + addDays(1));

        await commitToken.mint(firstAccount.address, commitAmount);
        await commitToken.connect(firstAccount).approve(overflowICO.address, commitAmount);
        await overflowICO.connect(firstAccount).commit(commitAmount / 2, 0, 0);
        await spendTimeWithPayoyt(startDate + addDays(2));
        await overflowICO.connect(firstAccount).commit(commitAmount / 2, 0, 0);
        await spendTimeWithPayoyt2(endDate + 1000);
        await overflowICO.finish();
    }

    async function startFinishOneUser(commitAmount) {
        await stateTrue(firstAccount, State.WAITING_FOR_PRESALE_START);
        await userInfo(firstAccount, {
            userCommitments: 0,
            salesToReceive: 0,
            commitToReceive: 0,
            commitToRefund: 0,
            lockedSales: 0,
            unlockedSales: 0,
        })

        await salesToken.mint(account.address, totalSales);
        await salesToken.approve(overflowICO.address, totalSales);
        await overflowICO.start();

        await userInfo(firstAccount, {
            userCommitments: 0,
            salesToReceive: 0,
            commitToReceive: 0,
            commitToRefund: 0,
            lockedSales: 0,
            unlockedSales: 0,
        })

        await stateTrue(firstAccount, State.COMMIT);
        await spendTime(startDate + addDays(1));

        await commitToken.mint(firstAccount.address, commitAmount);
        await commitToken.connect(firstAccount).approve(overflowICO.address, commitAmount);
        await overflowICO.connect(firstAccount).commit(commitAmount, 0, 0);
        // await spendTime(startDate + addDays(1) + 3);
        if (commitAmount >= softCap) {

            //todo здесь проблема в том, что userInfo делается на том же блоке что и был сделан commit, посэтому elapsedЕшьу нулевой. 
            //Я пытаюсь скрутить немного, но опять не скручивается

            // await userInfo(firstAccount, {
            //     userCommitments: commitAmount,
            //     salesToReceive: 0,
            //     commitToReceive: 0,
            //     commitToRefund: 0,
            //     lockedSales: 0,
            //     unlockedSales: 0,
            // })
        } else {
            await userInfo(firstAccount, {
                userCommitments: commitAmount,
                salesToReceive: 0,
                commitToReceive: 0,
                commitToRefund: commitAmount,
                lockedSales: 0,
                unlockedSales: 0,
            })
        }

        await spendTimeWithPayoyt(endDate + 1000);

        await stateTrue(firstAccount, State.CLAIM_REFUND)

        await overflowICO.finish();
    }

    async function startFinishTwoUsers(commitAmount1, commitAmount2) {


        await stateTrue(firstAccount, State.WAITING_FOR_PRESALE_START);
        await stateTrue(secondAccount, State.WAITING_FOR_PRESALE_START);
        await salesToken.mint(account.address, totalSales);
        await salesToken.approve(overflowICO.address, totalSales);
        await overflowICO.start();
        await spendTime(startDate + addDays(1));

        await stateTrue(firstAccount, State.COMMIT);
        await stateTrue(secondAccount, State.COMMIT);

        await commitToken.mint(firstAccount.address, commitAmount1);
        await commitToken.connect(firstAccount).approve(overflowICO.address, commitAmount1);
        await overflowICO.connect(firstAccount).commit(commitAmount1, 0, 0);

        await spendTime(startDate + addDays(2));
        await commitToken.mint(secondAccount.address, commitAmount2);
        await commitToken.connect(secondAccount).approve(overflowICO.address, commitAmount2);
        await overflowICO.connect(secondAccount).commit(commitAmount2, 0, 0);

        await stateTrue(firstAccount, State.COMMIT);
        await stateTrue(secondAccount, State.COMMIT);

        await spendTimeWithPayoyt2(endDate + 1000);
        await overflowICO.finish();
    }

    async function allStatesTwoUsers() {

        await stateTrue(firstAccount, State.CLAIM_REFUND);
        await stateTrue(secondAccount, State.CLAIM_REFUND);

        await overflowICO.connect(firstAccount).claimRefund();
        await overflowICO.connect(secondAccount).claimRefund();

        await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_BONUS);
        await stateTrue(secondAccount, State.WAITING_FOR_CLAIM_BONUS);
        await spendTime(claimBonusTime + 1000);
        await stateTrue(firstAccount, State.CLAIM_BONUS);
        await stateTrue(secondAccount, State.CLAIM_BONUS);

        await overflowICO.connect(firstAccount).claimBonus();
        await overflowICO.connect(secondAccount).claimBonus();

        await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_SALES_FIRST_PART);
        await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_SALES_FIRST_PART);
        await spendTime(claimSalesFirstPartTime + 1000);
        await stateTrue(firstAccount, State.CLAIM_SALES_FIRST_PART);
        await stateTrue(firstAccount, State.CLAIM_SALES_FIRST_PART);

        await overflowICO.connect(firstAccount).claimSalesFirstPart();
        await overflowICO.connect(secondAccount).claimSalesFirstPart();

        await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_VESTING);
        await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_VESTING);
        await spendTime(vestingBeginTime + 1000);
        await stateTrue(firstAccount, State.CLAIM_VESTING);
        await stateTrue(firstAccount, State.CLAIM_VESTING);
        await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
        await overflowICO.connect(secondAccount).claimVesting(secondAccount.address);
        await stateTrue(firstAccount, State.CLAIM_VESTING);
        await stateTrue(firstAccount, State.CLAIM_VESTING);
        await overflowICO.logCommonInfo();
        await spendTime(vestingBeginTime + vestingDuration + 1000);
        await stateTrue(firstAccount, State.CLAIM_VESTING);
        await stateTrue(firstAccount, State.CLAIM_VESTING);
        await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
        await overflowICO.connect(secondAccount).claimVesting(secondAccount.address);
        await stateTrue(firstAccount, State.NOTHING_TO_DO);
        await stateTrue(firstAccount, State.NOTHING_TO_DO);
        await overflowICO.logCommonInfo();
    }

    function addDays(days) {
        return (days * 24 * 60 * 60 * 1000);
    }

    async function commitEmpty(user) {
        expect(await commitToken.balanceOf(user.address)).to.eq(0);
    }

    async function commitShould(user, amount) {
        if (typeof amount === 'number' || amount instanceof Number) {
            amount = toE6(amount);
        }
        expect(amount).to.eq(await commitToken.balanceOf(user.address));
    }


    async function userInfo(user, expectedInfo) {

        let currentInfo = await overflowICO.connect(user).getUserInfo(user.address);

        expect(currentInfo.userCommitments).to.eq(expectedInfo.userCommitments);
        expect(currentInfo.salesToReceive).to.eq(expectedInfo.salesToReceive);
        expect(currentInfo.commitToReceive).to.eq(expectedInfo.commitToReceive);
        expect(currentInfo.commitToRefund).to.eq(expectedInfo.commitToRefund);
        expect(currentInfo.lockedSales).to.eq(expectedInfo.lockedSales);
        expect(currentInfo.unlockedSales).to.eq(expectedInfo.unlockedSales);

    }

    async function saleShould(user, amount) {

        if (typeof amount === 'number' || amount instanceof Number) {
            amount = toE18(amount);
        }
        expect(amount).to.eq(await salesToken.balanceOf(user.address));
    }

    async function saleEmpty(user) {
        expect(await salesToken.balanceOf(user.address)).to.eq(0);
    }

    async function spendTimeWithPayoyt(value) {
        await ethers.provider.send("evm_setNextBlockTimestamp", [value]);
        await commitToken.setLiquidityIndex("1200000000000000000000000000");
    }

    async function spendTimeWithPayoyt2(value) {
        await ethers.provider.send("evm_setNextBlockTimestamp", [value]);
        await commitToken.setLiquidityIndex("1300000000000000000000000000");
    }

    async function spendTime(value) {
        await ethers.provider.send("evm_setNextBlockTimestamp", [value]);
    }


});
