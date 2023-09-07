const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {toE18, fromE18, toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");


describe("OverflowICO", function () {

    let account;
    let overflowICO;
    let commitToken;
    let salesToken;
    let firstAccount;
    let secondAccount;

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
    
    const UserPresaleStates = {
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

        await deployments.fixture(['CommitToken', 'SalesToken']);

        commitToken = await ethers.getContract("CommitToken");
        salesToken = await ethers.getContract("SalesToken");

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


    // describe("start", () => {

    //     beforeEach(async () => {
    //         await salesToken.mint(account.address, totalSales);
    //         await salesToken.approve(overflowICO.address, totalSales);
    //         await overflowICO.start();
    //     });

    //     it("onlyOwner", async () => {
    //         await expectRevert(overflowICO.connect(secondAccount).start(), "Ownable: caller is not the owner");
    //     });

    //     it("started = true", async () => {
    //         expect(await overflowICO.started()).to.eq(true);
    //     });

    //     it("Error: Already started.", async () => {
    //         await expectRevert(overflowICO.start(), "Already started.");
    //     });

    //     it("transfer correct", async () => {
    //         expect(await salesToken.balanceOf(overflowICO.address)).to.eq(totalSales);
    //     });

    // })


    // describe('finish', () => {

    //     let amount = toE6(1000);

    //     beforeEach(async () => {
    //         await salesToken.mint(account.address, totalSales);
    //         await salesToken.approve(overflowICO.address, totalSales);
    //         await overflowICO.start();
    //         await overflowICO.addToWhitelist([firstAccount.address]);
    //         await spendTime(startDate + addDays(1));

    //         await commitToken.mint(firstAccount.address, amount);
    //         await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
    //     });

    //     it('Revert: Can only finish after the sale has ended', async () => {
    //         await expectRevert(overflowICO.finish(), "Can only finish after the sale has ended");
    //     })

    //     it("onlyOwner", async () => {
    //         await expectRevert(overflowICO.connect(secondAccount).finish(), "Ownable: caller is not the owner");
    //     });

    //     it('Revert: Already finished', async () => {
    //         await spendTime(endDate + 1000);
    //         await overflowICO.finish();
    //         await expectRevert(overflowICO.finish(), "Already finished");
    //     });

    //     it('Participant return USD+ after fail precale', async () => {

    //         let balanceBefore = await commitToken.balanceOf(firstAccount.address);

    //         await overflowICO.connect(firstAccount).commit(amount);
    //         await spendTimeWithPayoyt(endDate + 1000);
    //         await overflowICO.finish();
    //         await overflowICO.connect(firstAccount).claimRefund();

    //         let balanceAfter = await commitToken.balanceOf(firstAccount.address);

    //         expect(balanceBefore).eq(balanceAfter);
    //     });

    // });


    // describe('commit', () => {

    //     let minAmount = toE6(0.5);
    //     let amount = toE6(1000);

    //     beforeEach(async () => {
    //         await salesToken.mint(account.address, totalSales);
    //         await salesToken.approve(overflowICO.address, totalSales);
    //         await overflowICO.start();
    //         await overflowICO.addToWhitelist([firstAccount.address]);
    //         await spendTime(startDate + addDays(1));

    //         await commitToken.mint(firstAccount.address, amount);
    //         await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
    //     });

    //     it('Revert: Can only deposit USD+ during the sale period', async () => {
    //         await spendTime(endDate + 1000);
    //         await expectRevert(overflowICO.connect(firstAccount).commit(amount), 'Can only deposit USD+ during the sale period');
    //     })

    //     it('Revert: Commitment amount is outside the allowed range -> minCommit', async () => {
    //         await expectRevert(overflowICO.connect(firstAccount).commit(minAmount), 'Commitment amount is outside the allowed range');
    //     })

    //     it('commitments = amount', async () => {
    //         await overflowICO.connect(firstAccount).commit(amount);
    //         expect(await overflowICO.commitments(firstAccount.address)).to.eq(amount);
    //     })

    //     it('totalSales = amount', async () => {
    //         await overflowICO.connect(firstAccount).commit(amount);
    //         expect(await overflowICO.totalCommitments()).to.eq(amount);
    //     })

    // })


    // describe("whitelist", () => {

    //     let amount = toE6(200000);

    //     beforeEach(async () => {
    //         await salesToken.mint(account.address, totalSales);
    //         await salesToken.approve(overflowICO.address, totalSales);
    //         await overflowICO.start();

    //         await commitToken.mint(firstAccount.address, amount);
    //         await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
    //     })

    //     it("commit && not whitelist", async function () {
    //         await expectRevert(overflowICO.connect(firstAccount).commit(amount), '!whitelist');
    //     });

    //     it("commit && add whitelist", async function () {
    //         await overflowICO.addToWhitelist([firstAccount.address]);
    //         await overflowICO.connect(firstAccount).commit(amount);
    //     });

    //     it("commit && add/remove whitelist", async function () {
    //         await overflowICO.addToWhitelist([account.address]);
    //         await overflowICO.removeFromWhitelist([account.address]);
    //         await expectRevert(overflowICO.commit(1000000), '!whitelist');
    //     });

    // })

    //ok
    describe('[one participant], [less soft cap]', () => {

        let commitAmount = toE6(200000);

        beforeEach(async () => {
            expect(await checkState(firstAccount, UserPresaleStates.WAITING_FOR_PRESALE_START)).to.eq(true);
            await salesToken.mint(account.address, totalSales);
            await salesToken.approve(overflowICO.address, totalSales);
            await overflowICO.start();
            expect(await checkState(firstAccount, UserPresaleStates.COMMIT)).to.eq(true);
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await commitToken.mint(firstAccount.address, commitAmount);
            await commitToken.connect(firstAccount).approve(overflowICO.address, commitAmount);
            await overflowICO.connect(firstAccount).commit(commitAmount);
            await spendTimeWithPayoyt(endDate + 1000);
            expect(await checkState(firstAccount, UserPresaleStates.CLAIM_REFUND)).to.eq(true);
            await overflowICO.finish();
        });

        it('All USD+ should return to user', async () => {
            await overflowICO.connect(firstAccount).claimRefund();
            expect(await checkState(firstAccount, UserPresaleStates.NOTHING_TO_DO)).to.eq(true);
            expect(await commitToken.balanceOf(firstAccount.address)).to.eq(commitAmount);
            expect(await commitToken.balanceOf(overflowICO.address)).to.eq(0);
            expect(await salesToken.balanceOf(overflowICO.address)).to.eq(0);
        })

        it('All OVN should return to owner', async () => {
            expect(await salesToken.balanceOf(account.address)).to.eq(totalSales);
        })

        it('USD+ rebase should return to owner', async () => {
            expect(await commitToken.balanceOf(account.address)) > 0;
        })

        it('Further getUserState is correct', async () => {
            await overflowICO.connect(firstAccount).claimRefund();
            await spendTime(claimBonusTime + 100);
            expect(await checkState(firstAccount, UserPresaleStates.NOTHING_TO_DO)).to.eq(true);
            await spendTime(claimSalesFirstPartTime + 100);
            expect(await checkState(firstAccount, UserPresaleStates.NOTHING_TO_DO)).to.eq(true);
            await spendTime(vestingBeginTime + 100);
            expect(await checkState(firstAccount, UserPresaleStates.NOTHING_TO_DO)).to.eq(true);
            await spendTime(vestingBeginTime + vestingDuration + 100);
            expect(await checkState(firstAccount, UserPresaleStates.NOTHING_TO_DO)).to.eq(true);
        })

    })


    describe('[one participant], [between soft and hard cap]', () => {

        beforeEach(async () => {
            let amount = toE6(250000);
            expect(await checkState(firstAccount, UserPresaleStates.WAITING_FOR_PRESALE_START)).to.eq(true);
            await salesToken.mint(account.address, totalSales);
            await salesToken.approve(overflowICO.address, totalSales);
            await overflowICO.start();
            expect(await checkState(firstAccount, UserPresaleStates.COMMIT)).to.eq(true);;
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await commitToken.mint(firstAccount.address, amount);
            await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount);
            await spendTimeWithPayoyt(endDate + 1000);
            expect(await checkState(firstAccount, UserPresaleStates.CLAIM_REFUND)).to.eq(true);
            await overflowICO.finish();
        });


        describe('[full vest]', () => {

            it('all claims', async () => {
                await overflowICO.connect(firstAccount).claimRefund();

                expect(await checkState(firstAccount, UserPresaleStates.WAITING_FOR_CLAIM_BONUS)).to.eq(true);

                expect(await commitToken.balanceOf(firstAccount.address)).to.eq(0);
                expect(await salesToken.balanceOf(firstAccount.address)).to.eq(0);


                await spendTime(claimBonusTime + 100);
                expect(await checkState(firstAccount, UserPresaleStates.CLAIM_BONUS)).to.eq(true);
                await overflowICO.connect(firstAccount).claimBonus();
                expect(await checkState(firstAccount, UserPresaleStates.WAITING_FOR_CLAIM_SALES_FIRST_PART)).to.eq(true);
                await spendTime(claimSalesFirstPartTime + 100);
                expect(await checkState(firstAccount, UserPresaleStates.CLAIM_SALES_FIRST_PART)).to.eq(true);
                await overflowICO.connect(firstAccount).claimSalesFirstPart();
                expect(await checkState(firstAccount, UserPresaleStates.WAITING_FOR_CLAIM_VESTING)).to.eq(true);

                expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(50_000));

                expect(await salesToken.balanceOf(firstAccount.address)).to.eq("2083333333333333312500");

                await spendTime(vestingBeginTime + 100);
                expect(await checkState(firstAccount, UserPresaleStates.CLAIM_VESTING)).to.eq(true);
                await spendTime(vestingBeginTime + vestingDuration + 100);
                expect(await checkState(firstAccount, UserPresaleStates.CLAIM_VESTING)).to.eq(true);
                await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
                expect(await checkState(firstAccount, UserPresaleStates.NOTHING_TO_DO)).to.eq(true);

                expect(await commitToken.balanceOf(overflowICO.address)).to.eq(0);
                expect(await salesToken.balanceOf(overflowICO.address)).to.eq(0);

                expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(50_000));

                expect(await salesToken.balanceOf(firstAccount.address)).to.eq("8333333333333333250000");
            })
        })

    //     describe('[partial vest]', () => {

    //         it('all claims', async () => {
    //             await overflowICO.connect(firstAccount).claimRefund();

    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(0);
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq(0);

    //             await overflowICO.connect(firstAccount).claimBonus();
    //             await overflowICO.connect(firstAccount).claimSalesFirstPart();

    //             // Return extra USD+
    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(50_000));

    //             //TODO Check correct value
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq("2083333333333333312500");

    //             await spendTime(vestingBeginTime + vestingDuration / 2);
    //             await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);

    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(50_000));

    //             //TODO Check correct value
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq("5208333333333333281250");
    //         })
    //     })

    //     describe('[zero vest]', () => {

    //         it('all claims', async () => {
    //             await overflowICO.connect(firstAccount).claimRefund();

    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(0);
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq(0);

    //             await overflowICO.connect(firstAccount).claimBonus();
    //             await overflowICO.connect(firstAccount).claimSalesFirstPart();

    //             // Return extra USD+
    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(50_000));

    //             //TODO Check correct value
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq("2083333333333333312500");

    //             await spendTime(vestingBeginTime - 1000);
    //             await expectRevert(overflowICO.connect(firstAccount).claimVesting(firstAccount.address), "not claimVesting yet");

    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(50_000));

    //             //TODO Check correct value
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq("2083333333333333312500");
    //         })
    //     })

    })


    // describe('[one participant], [more hard cap], [full vest]', () => {

    //     beforeEach(async () => {
    //         let amount = toE6(350000);
    //         await salesToken.mint(account.address, totalSales);
    //         await salesToken.approve(overflowICO.address, totalSales);
    //         await overflowICO.start();
    //         await overflowICO.addToWhitelist([firstAccount.address]);
    //         await spendTime(startDate + addDays(1));

    //         await commitToken.mint(firstAccount.address, amount);
    //         await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
    //         await overflowICO.connect(firstAccount).commit(amount);
    //         await spendTimeWithPayoyt(endDate + 1000);
    //         await overflowICO.finish();
    //     });


    //     describe('[full vest]', () => {

    //         it('all claims', async () => {
    //             await overflowICO.connect(firstAccount).claimRefund();

    //             // Return extra USD+ to user
    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(50_000));
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq(0);

    //             await overflowICO.logCommonInfo();
    //             await overflowICO.connect(firstAccount).claimBonus();
    //             await overflowICO.connect(firstAccount).claimSalesFirstPart();

    //             //TODO Check value
    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(120_000));
    //             // TODO Check value
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq("2499999999999999975000");

    //             await spendTime(vestingBeginTime + vestingDuration + 1000);
    //             await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);

    //             //TODO Check value
    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(120_000));
    //             // TODO Check value
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq("9999999999999999900000");
    //         })

    //     })

    //     describe('[partial vest]', () => {

    //         it('all claims', async () => {
    //             await overflowICO.connect(firstAccount).claimRefund();

    //             // Return extra USD+ to user
    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(50_000));
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq(0);

    //             await overflowICO.logCommonInfo();
    //             await overflowICO.connect(firstAccount).claimBonus();
    //             await overflowICO.connect(firstAccount).claimSalesFirstPart();

    //             //TODO Check value
    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(120_000));
    //             // TODO Check value
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq("2499999999999999975000");

    //             await spendTime(vestingBeginTime + vestingDuration / 2);

    //             await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);

    //             //TODO Check value
    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(120_000));
    //             // TODO Check value
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq("6249999999999999937500");
    //         })

    //     })

    //     describe('[zero vest]', () => {

    //         it('all claims', async () => {
    //             await overflowICO.connect(firstAccount).claimRefund();

    //             // Return extra USD+ to user
    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(50_000));
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq(0);

    //             await overflowICO.logCommonInfo();
    //             await overflowICO.connect(firstAccount).claimBonus();
    //             await overflowICO.connect(firstAccount).claimSalesFirstPart();

    //             //TODO Check value
    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(120_000));
    //             // TODO Check value
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq("2499999999999999975000");

    //             await spendTime(vestingBeginTime - 1000);

    //             await expectRevert(overflowICO.connect(firstAccount).claimVesting(firstAccount.address), "not claimVesting yet");

    //             //TODO Check value
    //             expect(await commitToken.balanceOf(firstAccount.address)).to.eq(toE6(120_000));
    //             // TODO Check value
    //             expect(await salesToken.balanceOf(firstAccount.address)).to.eq("2499999999999999975000");
    //         })

    //     })


    // })


    // describe('[one participant], [two times], [less soft cap]', () => {

    //     beforeEach(async () => {
    //         let amount = toE6(200000);
    //         await salesToken.mint(account.address, totalSales);
    //         await salesToken.approve(overflowICO.address, totalSales);
    //         await overflowICO.start();
    //         await overflowICO.addToWhitelist([firstAccount.address]);
    //         await spendTime(startDate + addDays(1));

    //         await commitToken.mint(firstAccount.address, amount);
    //         await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
    //         await overflowICO.connect(firstAccount).commit(amount / 2);
    //         await spendTimeWithPayoyt(startDate + addDays(2));
    //         await overflowICO.connect(firstAccount).commit(amount / 2);
    //         await spendTimeWithPayoyt2(endDate + 1000);
    //         await overflowICO.finish();
    //     });

    //     it('all claims', async () => {
    //         await overflowICO.connect(firstAccount).claimRefund();
    //         await overflowICO.logCommonInfo();
    //     })

    // })


    // describe('[one participant], [two times], [between soft and hard cap], [full vest]', () => {

    //     beforeEach(async () => {
    //         let amount = toE6(250000);
    //         await salesToken.mint(account.address, totalSales);
    //         await salesToken.approve(overflowICO.address, totalSales);
    //         await overflowICO.start();
    //         await overflowICO.addToWhitelist([firstAccount.address]);
    //         await spendTime(startDate + addDays(1));

    //         await commitToken.mint(firstAccount.address, amount);
    //         await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
    //         await overflowICO.connect(firstAccount).commit(amount / 2);
    //         await spendTimeWithPayoyt(startDate + addDays(2));
    //         await overflowICO.connect(firstAccount).commit(amount / 2);
    //         await spendTimeWithPayoyt2(endDate + 1000);
    //         await overflowICO.finish();
    //     });

    //     it('all claims', async () => {
    //         await overflowICO.connect(firstAccount).claimRefund();
    //         await overflowICO.connect(firstAccount).claimBonus();
    //         await overflowICO.connect(firstAccount).claimSalesFirstPart();
    //         await spendTime(vestingBeginTime + vestingDuration + 1000);
    //         await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
    //         await overflowICO.logCommonInfo();
    //     })

    // })


    // describe('[one participant], [two times], [more hard cap], [full vest]', () => {

    //     beforeEach(async () => {
    //         let amount = toE6(350000);
    //         await salesToken.mint(account.address, totalSales);
    //         await salesToken.approve(overflowICO.address, totalSales);
    //         await overflowICO.start();
    //         await overflowICO.addToWhitelist([firstAccount.address]);
    //         await spendTime(startDate + addDays(1));

    //         await commitToken.mint(firstAccount.address, amount);
    //         await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
    //         await overflowICO.connect(firstAccount).commit(amount / 2);
    //         await spendTimeWithPayoyt(startDate + addDays(2));
    //         await overflowICO.connect(firstAccount).commit(amount / 2);
    //         await spendTimeWithPayoyt2(endDate + 1000);
    //         await overflowICO.finish();
    //     });

    //     it('all claims', async () => {
    //         await overflowICO.connect(firstAccount).claimRefund();
    //         await overflowICO.logCommonInfo();
    //         await overflowICO.connect(firstAccount).claimBonus();
    //         await overflowICO.connect(firstAccount).claimSalesFirstPart();
    //         await spendTime(vestingBeginTime + vestingDuration + 1000);
    //         await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
    //         await overflowICO.logCommonInfo();
    //     })

    // })


    // describe('[two participants], [one time], [less soft cap]', () => {

    //     let commitAmount = toE6(20000);

    //     beforeEach(async () => {
    //         await salesToken.mint(account.address, totalSales);
    //         await salesToken.approve(overflowICO.address, totalSales);
    //         await overflowICO.start();
    //         await overflowICO.addToWhitelist([firstAccount.address]);
    //         await overflowICO.addToWhitelist([secondAccount.address]);
    //         await spendTime(startDate + addDays(1));

    //         await commitToken.mint(firstAccount.address, commitAmount);
    //         await commitToken.connect(firstAccount).approve(overflowICO.address, commitAmount);
    //         await overflowICO.connect(firstAccount).commit(commitAmount);
    //         await spendTimeWithPayoyt(startDate + addDays(2));
    //         await commitToken.mint(secondAccount.address, commitAmount);
    //         await commitToken.connect(secondAccount).approve(overflowICO.address, commitAmount);
    //         await overflowICO.connect(secondAccount).commit(commitAmount);
    //         await spendTimeWithPayoyt2(endDate + 1000);
    //         await overflowICO.finish();
    //     });

    //     it('all claims', async () => {
    //         await overflowICO.connect(firstAccount).claimRefund();
    //         await overflowICO.connect(secondAccount).claimRefund();
    //         await overflowICO.logCommonInfo();
    //     })

    //     it('USD+ should return to user[1]', async () => {
    //         await overflowICO.connect(firstAccount).claimRefund();
    //         expect(await commitToken.balanceOf(firstAccount.address)).to.eq(commitAmount);
    //     })

    //     it('USD+ should return to user[2]', async () => {
    //         await overflowICO.connect(secondAccount).claimRefund();
    //         expect(await commitToken.balanceOf(secondAccount.address)).to.eq(commitAmount);
    //     })

    //     it('All OVN should return to account', async () => {
    //         expect(await salesToken.balanceOf(account.address)).to.eq(totalSales);
    //     })

    // })


    // describe('[two participants], [one time], [between soft and hard cap], [full vest]', () => {

    //     beforeEach(async () => {
    //         let amount = toE6(125000);
    //         await salesToken.mint(account.address, totalSales);
    //         await salesToken.approve(overflowICO.address, totalSales);
    //         await overflowICO.start();
    //         await overflowICO.addToWhitelist([firstAccount.address]);
    //         await overflowICO.addToWhitelist([secondAccount.address]);
    //         await spendTime(startDate + addDays(1));

    //         await commitToken.mint(firstAccount.address, amount);
    //         await commitToken.mint(secondAccount.address, amount);
    //         await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
    //         await commitToken.connect(secondAccount).approve(overflowICO.address, amount);
    //         await overflowICO.connect(firstAccount).commit(amount);
    //         await spendTimeWithPayoyt(startDate + addDays(2));
    //         await overflowICO.connect(secondAccount).commit(amount);
    //         await spendTimeWithPayoyt2(endDate + 1000);
    //         await overflowICO.finish();
    //     });

    //     it('all claims', async () => {
    //         await overflowICO.connect(firstAccount).claimRefund();
    //         await overflowICO.connect(firstAccount).claimBonus();
    //         await overflowICO.connect(firstAccount).claimSalesFirstPart();
    //         await overflowICO.connect(secondAccount).claimRefund();
    //         await overflowICO.connect(secondAccount).claimBonus();
    //         await overflowICO.connect(secondAccount).claimSalesFirstPart();
    //         await spendTime(vestingBeginTime + vestingDuration + 1000);
    //         await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
    //         await overflowICO.connect(secondAccount).claimVesting(secondAccount.address);
    //         await overflowICO.logCommonInfo();
    //     })

    // })


    // describe('[two participants], [one time], [more hard cap], [full vest]', () => {

    //     beforeEach(async () => {
    //         let amount = toE6(200000);
    //         await salesToken.mint(account.address, totalSales);
    //         await salesToken.approve(overflowICO.address, totalSales);
    //         await overflowICO.start();
    //         await overflowICO.addToWhitelist([firstAccount.address]);
    //         await overflowICO.addToWhitelist([secondAccount.address]);
    //         await spendTime(startDate + addDays(1));

    //         await commitToken.mint(firstAccount.address, amount);
    //         await commitToken.mint(secondAccount.address, amount);
    //         await commitToken.connect(firstAccount).approve(overflowICO.address, amount);
    //         await commitToken.connect(secondAccount).approve(overflowICO.address, amount);
    //         await overflowICO.connect(firstAccount).commit(amount);
    //         await spendTimeWithPayoyt(startDate + addDays(2));
    //         await overflowICO.connect(secondAccount).commit(amount);
    //         await spendTimeWithPayoyt2(endDate + 1000);
    //         await overflowICO.finish();
    //     });

    //     it('all claims', async () => {
    //         await overflowICO.connect(firstAccount).claimRefund();
    //         await overflowICO.connect(firstAccount).claimBonus();
    //         await overflowICO.connect(firstAccount).claimSalesFirstPart();
    //         await overflowICO.connect(secondAccount).claimRefund();
    //         await overflowICO.connect(secondAccount).claimBonus();
    //         await overflowICO.connect(secondAccount).claimSalesFirstPart();
    //         await spendTime(vestingBeginTime + vestingDuration + 1000);
    //         await overflowICO.connect(firstAccount).claimVesting(firstAccount.address);
    //         await overflowICO.connect(secondAccount).claimVesting(secondAccount.address);
    //         await overflowICO.logCommonInfo();
    //     })

    // })

    function addDays(days) {
        return (days * 24 * 60 * 60 * 1000);
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

    async function checkState(account, value) {
        let userState = await overflowICO.connect(account).getUserState(account.address);
        console.log("userState", userState);
        return userState.toString() === value;
    }

});
