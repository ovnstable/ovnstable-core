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
        console.log("account address:", account.address);
        console.log("firstAccount address:", firstAccount.address);
        console.log("secondAccount address:", secondAccount.address);

        await deployments.fixture(['CommitToken', 'SalesToken', 'MockWhitelist']);

        commitToken = await ethers.getContract("CommitToken");
        salesToken = await ethers.getContract("SalesToken");
        whitelist = await ethers.getContract("MockWhitelist");

        await commitToken.setExchanger(account.address);

        startDate = Math.floor((new Date().getTime()) / 1000);
        console.log('startDate: ' + startDate);
        endDate = startDate + addDays(4);
        console.log('endDate: ' + endDate);
        claimBonusTime = endDate + addDays(2);
        claimSalesFirstPartTime = endDate + addDays(4);
        vestingBeginTime = endDate + addDays(6);
        vestingDuration = addDays(30);
        vestingProportion = toE18(0.75);
        totalSales = toE18(10000);
        hardCap = toE6(300000);
        softCap = toE6(225000);
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


    describe("start", () => {

        beforeEach(async () => {
            await salesToken.mint(account.address, totalSales);
            await salesToken.approve(overflowICO.address, totalSales);
            await overflowICO.start();
        });

        it("onlyOwner", async () => {
            await expectRevert(overflowICO.connect(secondAccount).start(), "Ownable: caller is not the owner");
        });

        it("started = true", async () => {
            expect(await overflowICO.started()).to.eq(true);
        });

        it("Error: Already started", async () => {
            await expectRevert(overflowICO.start(), "Already started");
        });

        it("transfer correct", async () => {
            await saleShould(overflowICO, totalSales);
        });

    })


    describe('finish', () => {

        let amount = toE6(1000);

        beforeEach(async () => {
            await salesToken.mint(account.address, totalSales);
            await salesToken.approve(overflowICO.address, totalSales);
            await overflowICO.start();
            await spendTime(startDate + addDays(1));

            await commitToken.mint(firstAccount.address, amount);
            await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
        });

        it('Revert: Can only finish after the sale has ended', async () => {
            await expectRevert(overflowICO.finish(), "Can only finish after the sale has ended");
        })

        it("onlyOwner", async () => {
            await expectRevert(overflowICO.connect(secondAccount).finish(), "Ownable: caller is not the owner");
        });

        it('Revert: Already finished', async () => {
            await spendTime(endDate + 1000);
            await overflowICO.finish();
            await expectRevert(overflowICO.finish(), "Already finished");
        });

        it('Participant return USD+ after fail presale', async () => {

            await overflowICO.connect(firstAccount).commit(amount, 0, 0);
            await spendTimeWithPayoyt(endDate + 1000);
            await overflowICO.finish();
            await overflowICO.connect(firstAccount).claimRefund();

            await commitShould(firstAccount, 1000);
        });

    });


    describe('[one participant], [less soft cap]', () => {

        let commitAmount = toE6(200000) + "";

        beforeEach(async () => {
            await startFinishOneUser(commitAmount);

            await userInfo(firstAccount, {
                userCommitments: commitAmount,
                salesToReceive: 0,
                commitToReceive: 0,
                commitToRefund: commitAmount,
                lockedSales: 0,
                unlockedSales: 0,
            })
        });

        it('All USD+ should return to user', async () => {
            await overflowICO.connect(firstAccount).claimRefund();
            await stateTrue(firstAccount, State.NOTHING_TO_DO);

            await userInfo(firstAccount, {
                userCommitments: commitAmount,
                salesToReceive: 0,
                commitToReceive: 0,
                commitToRefund: 0,
                lockedSales: 0,
                unlockedSales: 0,
            })


            await commitShould(firstAccount, commitAmount);

            await commitEmpty(overflowICO);
            await saleEmpty(overflowICO);
        })

        it('All OVN should return to owner', async () => {
            await saleShould(account, totalSales);
        })

        it('USD+ rebase should return to owner', async () => {
            let balance = fromE6(await commitToken.balanceOf(account.address));
            expect(balance > 0).to.eq(true);
        })

        it('Further getUserState is correct', async () => {
            await overflowICO.connect(firstAccount).claimRefund();
            await spendTime(claimBonusTime + 100);
            await stateTrue(firstAccount, State.NOTHING_TO_DO);
            await spendTime(claimSalesFirstPartTime + 100);
            await stateTrue(firstAccount, State.NOTHING_TO_DO);
            await spendTime(vestingBeginTime + 100);
            await stateTrue(firstAccount, State.NOTHING_TO_DO);
            await spendTime(vestingBeginTime + vestingDuration + 100);
            await stateTrue(firstAccount, State.NOTHING_TO_DO);
        })

    })


    describe('[one participant], [between soft and hard cap]', () => {

        let commitAmount = toE6(250000);

        beforeEach(async () => {
            await startFinishOneUser(commitAmount);

            await userInfo(firstAccount, {
                userCommitments: commitAmount,
                salesToReceive: '8333333333333333250000',
                commitToReceive: '50000000000',
                commitToRefund: 0,
                lockedSales: '8333333333333333250000',
                unlockedSales: 0,
            })
        });


        describe('[full vest]', () => {

            it('all claims', async () => {

                await overflowICO.connect(firstAccount).claimRefund();
                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_BONUS);
                await commitEmpty(firstAccount);
                await saleEmpty(firstAccount);

                await spendTime(claimBonusTime + 100);
                await stateTrue(firstAccount, State.CLAIM_BONUS);
                await overflowICO.connect(firstAccount).claimBonus();

                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_SALES_FIRST_PART);
                await spendTime(claimSalesFirstPartTime + 100);

                await stateTrue(firstAccount, State.CLAIM_SALES_FIRST_PART);
                await overflowICO.connect(firstAccount).claimSalesFirstPart();

                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_VESTING);
                await commitShould(firstAccount, 50_000);
                await saleShould(firstAccount, "2083333333333333312500");

                await spendTime(vestingBeginTime + 100);

                await stateTrue(firstAccount, State.CLAIM_VESTING);
                await spendTime(vestingBeginTime + vestingDuration + 100);

                await stateTrue(firstAccount, State.CLAIM_VESTING);
                await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);

                await stateTrue(firstAccount, State.NOTHING_TO_DO);

                await commitEmpty(overflowICO);
                await saleEmpty(overflowICO);

                await commitShould(firstAccount, 50_000);
                await saleShould(firstAccount, "8333333333333333250000");
            })
        })

        describe('[partial vest]', () => {

            it('all claims', async () => {
                await overflowICO.connect(firstAccount).claimRefund();

                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_BONUS);
                await commitEmpty(firstAccount);
                await saleEmpty(firstAccount);

                await spendTime(claimBonusTime + 100);
                await stateTrue(firstAccount, State.CLAIM_BONUS);
                await overflowICO.connect(firstAccount).claimBonus();


                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_SALES_FIRST_PART);
                await spendTime(claimSalesFirstPartTime + 100);

                await stateTrue(firstAccount, State.CLAIM_SALES_FIRST_PART);
                await overflowICO.connect(firstAccount).claimSalesFirstPart();

                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_VESTING);
                await commitShould(firstAccount, 50_000);
                await saleShould(firstAccount, "2083333333333333312500");

                await spendTime(vestingBeginTime + vestingDuration / 2);
                await stateTrue(firstAccount, State.CLAIM_VESTING);
                await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);

                await commitShould(firstAccount, 50_000);
                await saleShould(firstAccount, "5208333335744598713348");

            })
        })

        describe('[zero vest]', () => {

            it('all claims', async () => {
                await overflowICO.connect(firstAccount).claimRefund();

                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_BONUS);
                await commitEmpty(firstAccount);
                await saleEmpty(firstAccount);

                await spendTime(claimBonusTime + 100);
                await stateTrue(firstAccount, State.CLAIM_BONUS);
                await overflowICO.connect(firstAccount).claimBonus();

                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_SALES_FIRST_PART);
                await spendTime(claimSalesFirstPartTime + 100);

                await stateTrue(firstAccount, State.CLAIM_SALES_FIRST_PART);
                await overflowICO.connect(firstAccount).claimSalesFirstPart();

                await commitShould(firstAccount, 50_000);
                await saleShould(firstAccount, "2083333333333333312500");

                await spendTime(vestingBeginTime - 1000);
                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_VESTING);
                await expectRevert(overflowICO.connect(firstAccount).claimVesting(firstAccount.address), "not claimVesting yet");
            })
        })

    })


    describe('[one participant], [more hard cap]', () => {

        let commitAmount = toE6(350000);
        beforeEach(async () => {
            await startFinishOneUser(commitAmount);
        });


        describe('[full vest]', () => {

            it('all claims', async () => {

                await commitEmpty(firstAccount);
                await saleEmpty(firstAccount);

                await overflowICO.connect(firstAccount).claimRefund();
                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_BONUS);

                await commitShould(firstAccount, 50_000);
                await saleEmpty(firstAccount);

                await spendTime(claimBonusTime + 100);
                await stateTrue(firstAccount, State.CLAIM_BONUS);
                await overflowICO.connect(firstAccount).claimBonus();
                await commitShould(firstAccount, 120_000);

                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_SALES_FIRST_PART);
                await spendTime(claimSalesFirstPartTime + 100);

                await stateTrue(firstAccount, State.CLAIM_SALES_FIRST_PART);
                await overflowICO.connect(firstAccount).claimSalesFirstPart();

                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_VESTING);
                await saleShould(firstAccount, "2499999999999999975000");

                await spendTime(vestingBeginTime + 100);

                await stateTrue(firstAccount, State.CLAIM_VESTING);
                await spendTime(vestingBeginTime + vestingDuration + 100);

                await stateTrue(firstAccount, State.CLAIM_VESTING);
                await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);

                await stateTrue(firstAccount, State.NOTHING_TO_DO);

                await commitEmpty(overflowICO);
                await saleEmpty(overflowICO);

                await commitShould(firstAccount, 120_000);
                await saleShould(firstAccount, "9999999999999999900000");
            })

        })

        describe('[partial vest]', () => {

            it('all claims', async () => {
                await overflowICO.connect(firstAccount).claimRefund();

                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_BONUS);
                await commitShould(firstAccount, 50_000);
                await saleEmpty(firstAccount);

                await spendTime(claimBonusTime + 100);
                await stateTrue(firstAccount, State.CLAIM_BONUS);
                await overflowICO.connect(firstAccount).claimBonus();


                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_SALES_FIRST_PART);
                await spendTime(claimSalesFirstPartTime + 100);

                await stateTrue(firstAccount, State.CLAIM_SALES_FIRST_PART);
                await overflowICO.connect(firstAccount).claimSalesFirstPart();

                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_VESTING);
                await commitShould(firstAccount, 120_000);
                await saleShould(firstAccount, "2499999999999999975000");

                await spendTime(vestingBeginTime + vestingDuration / 2);
                await stateTrue(firstAccount, State.CLAIM_VESTING);
                await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);

                await commitShould(firstAccount, 120_000);
                await saleShould(firstAccount, "6250000002893518456018");
            })

        })

        describe('[zero vest]', () => {

            it('all claims', async () => {
                await overflowICO.connect(firstAccount).claimRefund();

                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_BONUS);
                await commitShould(firstAccount, 50_000);
                await saleEmpty(firstAccount);

                await spendTime(claimBonusTime + 100);
                await stateTrue(firstAccount, State.CLAIM_BONUS);
                await overflowICO.connect(firstAccount).claimBonus();

                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_SALES_FIRST_PART);
                await spendTime(claimSalesFirstPartTime + 100);

                await stateTrue(firstAccount, State.CLAIM_SALES_FIRST_PART);
                await overflowICO.connect(firstAccount).claimSalesFirstPart();

                await commitShould(firstAccount, 120_000);
                await saleShould(firstAccount, "2499999999999999975000");

                await spendTime(vestingBeginTime - 1000);
                await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_VESTING);
                await expectRevert(overflowICO.connect(firstAccount).claimVesting(firstAccount.address), "not claimVesting yet");
            })

        })


    })


    describe('[one participant], [two times], [less soft cap]', () => {

        let commitAmount = toE6(20_000);

        beforeEach(async () => {
            await startFinishOneUserTwoTime(commitAmount);
        });

        it('All USD+ should return to user', async () => {

            await overflowICO.connect(firstAccount).claimRefund();
            await stateTrue(firstAccount, State.NOTHING_TO_DO);

            // 20 000 + rebase USD+
            await commitShould(firstAccount, "22166666667");

            await commitEmpty(overflowICO);
            await saleEmpty(overflowICO);
        })

        it('All OVN should return to owner', async () => {
            await saleShould(account, totalSales);
        })

        it('USD+ rebase should return to owner', async () => {
            await commitShould(account, "3833333333")
        })

        it('Further getUserState is correct', async () => {
            await overflowICO.connect(firstAccount).claimRefund();
            await spendTime(claimBonusTime + 100);
            await stateTrue(firstAccount, State.NOTHING_TO_DO);
            await spendTime(claimSalesFirstPartTime + 100);
            await stateTrue(firstAccount, State.NOTHING_TO_DO);
            await spendTime(vestingBeginTime + 100);
            await stateTrue(firstAccount, State.NOTHING_TO_DO);
            await spendTime(vestingBeginTime + vestingDuration + 100);
            await stateTrue(firstAccount, State.NOTHING_TO_DO);
        })

    })


    describe('[one participant], [two times], [between soft and hard cap], [full vest]', () => {

        let commitAmount = toE6(250_000);

        beforeEach(async () => {
            await startFinishOneUserTwoTime(commitAmount);
        });

        it('[full vest]', async () => {
            await commitShould(firstAccount, '27083333333');
            await saleEmpty(firstAccount);

            await overflowICO.connect(firstAccount).claimRefund();
            await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_BONUS);

            await commitShould(firstAccount, '27083333333');
            await saleEmpty(firstAccount);

            await spendTime(claimBonusTime + 100);
            await stateTrue(firstAccount, State.CLAIM_BONUS);
            await overflowICO.connect(firstAccount).claimBonus();
            await commitShould(firstAccount, 75_000);

            await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_SALES_FIRST_PART);
            await spendTime(claimSalesFirstPartTime + 100);

            await stateTrue(firstAccount, State.CLAIM_SALES_FIRST_PART);
            await overflowICO.connect(firstAccount).claimSalesFirstPart();

            await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_VESTING);
            await saleShould(firstAccount, "2083333333333333312500");

            await spendTime(vestingBeginTime + 100);

            await stateTrue(firstAccount, State.CLAIM_VESTING);
            await spendTime(vestingBeginTime + vestingDuration + 100);

            await stateTrue(firstAccount, State.CLAIM_VESTING);
            await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);

            await stateTrue(firstAccount, State.NOTHING_TO_DO);

            await commitEmpty(overflowICO);
            await saleEmpty(overflowICO);

            await commitShould(firstAccount, 75_000);
            await saleShould(firstAccount, "8333333333333333250000");
        })

    })


    describe('[one participant], [two times], [more hard cap], [full vest]', () => {

        let commitAmount = toE6(350_000);


        beforeEach(async () => {
            await startFinishOneUserTwoTime(commitAmount);
        });

        it('all claims', async () => {
            await commitShould(firstAccount, '37916666667');
            await saleEmpty(firstAccount);

            await overflowICO.connect(firstAccount).claimRefund();
            await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_BONUS);

            await commitShould(firstAccount, '87916666667');
            await saleEmpty(firstAccount);

            await spendTime(claimBonusTime + 100);
            await stateTrue(firstAccount, State.CLAIM_BONUS);
            await overflowICO.connect(firstAccount).claimBonus();
            await commitShould(firstAccount, 155_000);

            await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_SALES_FIRST_PART);
            await spendTime(claimSalesFirstPartTime + 100);

            await stateTrue(firstAccount, State.CLAIM_SALES_FIRST_PART);
            await overflowICO.connect(firstAccount).claimSalesFirstPart();

            await stateTrue(firstAccount, State.WAITING_FOR_CLAIM_VESTING);
            await saleShould(firstAccount, "2499999999999999975000");

            await spendTime(vestingBeginTime + 100);

            await stateTrue(firstAccount, State.CLAIM_VESTING);
            await spendTime(vestingBeginTime + vestingDuration + 100);

            await stateTrue(firstAccount, State.CLAIM_VESTING);
            await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);

            await stateTrue(firstAccount, State.NOTHING_TO_DO);

            await commitEmpty(overflowICO);
            await saleEmpty(overflowICO);

            await commitShould(firstAccount, 155_000);
            await saleShould(firstAccount, "9999999999999999900000");
        })

    })

    describe('[two participants], [between soft and hard cap], [full vest]', () => {

        let commitAmount1 = toE6(200_000)
        let commitAmount2 = toE6(50_000)

        beforeEach(async () => {
            await salesToken.mint(account.address, totalSales);
            await salesToken.approve(overflowICO.address, totalSales);
            await overflowICO.start();
            await spendTime(startDate + addDays(1));

            await commitToken.mint(firstAccount.address, commitAmount1);
            await commitToken.connect(firstAccount).approve(overflowICO.address, commitAmount1);
            await overflowICO.connect(firstAccount).commit(commitAmount1, 0, 0);

            await spendTimeWithPayoyt(startDate + addDays(2));
            await commitToken.mint(secondAccount.address, commitAmount2);
            await commitToken.connect(secondAccount).approve(overflowICO.address, commitAmount2);
            await overflowICO.connect(secondAccount).commit(commitAmount2, 0, 0);
            await spendTimeWithPayoyt2(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {

            await stateTrue(firstAccount, State.CLAIM_REFUND);
            await stateTrue(secondAccount, State.CLAIM_REFUND);
            await overflowICO.connect(firstAccount).claimRefund();
            await overflowICO.connect(secondAccount).claimRefund();
        })


    });



    describe('[two participants], [one time], [less soft cap]', () => {

        let commitAmount = toE6(20000);

        beforeEach(async () => {
            await salesToken.mint(account.address, totalSales);
            await salesToken.approve(overflowICO.address, totalSales);
            await overflowICO.start();
            await spendTime(startDate + addDays(1));

            await commitToken.mint(firstAccount.address, commitAmount);
            await commitToken.connect(firstAccount).approve(overflowICO.address, commitAmount);
            await overflowICO.connect(firstAccount).commit(commitAmount, 0, 0);
            await spendTimeWithPayoyt(startDate + addDays(2));
            await commitToken.mint(secondAccount.address, commitAmount);
            await commitToken.connect(secondAccount).approve(overflowICO.address, commitAmount);
            await overflowICO.connect(secondAccount).commit(commitAmount, 0, 0);
            await spendTimeWithPayoyt2(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claimRefund();
            await overflowICO.connect(secondAccount).claimRefund();
            await overflowICO.logCommonInfo();
        })

        it('USD+ should return to user[1]', async () => {
            await overflowICO.connect(firstAccount).claimRefund();
            expect(await commitToken.balanceOf(firstAccount.address)).to.eq(commitAmount);
        })

        it('USD+ should return to user[2]', async () => {
            await overflowICO.connect(secondAccount).claimRefund();
            expect(await commitToken.balanceOf(secondAccount.address)).to.eq(commitAmount);
        })

        it('All OVN should return to account', async () => {
            expect(await salesToken.balanceOf(account.address)).to.eq(totalSales);
        })

    })


    describe('[two participants], [one time], [between soft and hard cap], [full vest]', () => {

        beforeEach(async () => {
            let amount = toE6(125000);
            await salesToken.mint(account.address, totalSales);
            await salesToken.approve(overflowICO.address, totalSales);
            await overflowICO.start();
            await spendTime(startDate + addDays(1));

            await commitToken.mint(firstAccount.address, amount);
            await commitToken.mint(secondAccount.address, amount);
            await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
            await commitToken.connect(secondAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount, 0, 0);
            await spendTimeWithPayoyt(startDate + addDays(2));
            await overflowICO.connect(secondAccount).commit(amount, 0, 0);
            await spendTimeWithPayoyt2(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await spendTime(endDate + 2000);
            await overflowICO.connect(firstAccount).claimRefund();
            await overflowICO.connect(secondAccount).claimRefund();
            await spendTime(claimBonusTime + 1000);
            await overflowICO.connect(firstAccount).claimBonus();
            await overflowICO.connect(secondAccount).claimBonus();
            await spendTime(claimSalesFirstPartTime + 1000);
            await overflowICO.connect(firstAccount).claimSalesFirstPart();
            await overflowICO.connect(secondAccount).claimSalesFirstPart();
            await spendTime(vestingBeginTime + 1000);
            await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
            await overflowICO.connect(secondAccount).claimVesting(secondAccount.address);
            await overflowICO.logCommonInfo();

            await spendTime(vestingBeginTime + vestingDuration + 1000);
            await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
            await overflowICO.connect(secondAccount).claimVesting(secondAccount.address);
            await overflowICO.logCommonInfo();
        })

    })


    describe('[two participants], [one time], [more hard cap], [full vest]', () => {

        beforeEach(async () => {
            let amount = toE6(200000);
            await salesToken.mint(account.address, totalSales);
            await salesToken.approve(overflowICO.address, totalSales);
            await overflowICO.start();
            await spendTime(startDate + addDays(1));

            await commitToken.mint(firstAccount.address, amount);
            await commitToken.mint(secondAccount.address, amount);
            await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
            await commitToken.connect(secondAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount, 0, 0);
            await spendTimeWithPayoyt(startDate + addDays(2));
            await overflowICO.connect(secondAccount).commit(amount, 0, 0);
            await spendTimeWithPayoyt2(endDate + 1000);
        });

        it('all claims', async () => {
            await spendTime(endDate + 2000);
            await overflowICO.connect(firstAccount).claimRefund();
            await overflowICO.connect(secondAccount).claimRefund();
            await spendTime(claimBonusTime + 1000);
            await overflowICO.connect(firstAccount).claimBonus();
            await overflowICO.connect(secondAccount).claimBonus();
            await spendTime(claimSalesFirstPartTime + 1000);
            await overflowICO.connect(firstAccount).claimSalesFirstPart();
            await overflowICO.connect(secondAccount).claimSalesFirstPart();
            await spendTime(vestingBeginTime + vestingDuration + 1000);
            await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
            await overflowICO.connect(secondAccount).claimVesting(secondAccount.address);
            await overflowICO.logCommonInfo();
        })

    })


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
