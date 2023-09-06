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
    let salesToken;
    let emissionToken;
    let firstAccount;
    let secondAccount;

    let startDate;
    let endDate;
    let receiveTime;

    let vestingBegin;
    let vestingDuration;
    let vestingProportion;
    let totalEmission;

    let usdpToRaise;
    let refundThreshold;
    let minCommit;
    let maxCommit;

    sharedBeforeEach('deploy and setup', async () => {

        await hre.run("compile");
        const signers = await ethers.getSigners();
        account = signers[0];
        firstAccount = signers[1];
        secondAccount = signers[2];
        console.log("account address:", account.address);
        console.log("firstAccount address:", firstAccount.address);
        console.log("secondAccount address:", secondAccount.address);

        await deployments.fixture(['SalesToken', 'EmissionToken']);

        salesToken = await ethers.getContract("SalesToken");
        emissionToken = await ethers.getContract("EmissionToken");

        await salesToken.setExchanger(account.address);

        startDate = Math.floor((new Date().getTime()) / 1000);
        console.log('startDate: ' + startDate);
        endDate = startDate + addDays(5);
        console.log('endDate: ' + endDate);
        receiveTime = endDate + 100;
        vestingBegin = endDate + addDays(1);
        vestingDuration = addDays(1);
        vestingProportion = toE18(0.75);
        totalEmission = toE18(10000);
        usdpToRaise = toE6(300000);
        refundThreshold = toE6(225000);
        minCommit = toE6(1);
        maxCommit = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

        await spendTime(startDate);

        let params = {
            salesToken: salesToken.address,
            emissionToken: emissionToken.address,
            usdpToRaise: usdpToRaise,
            refundThreshold: refundThreshold,
            startTime: startDate,
            endTime: endDate,
            receiveTime: receiveTime,
            vestingBegin: vestingBegin,
            vestingDuration: vestingDuration,
            vestingProportion: vestingProportion,
            minCommit: minCommit,
            maxCommit: maxCommit,
            totalEmission: totalEmission,
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
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
        });

        it("onlyOwner", async () => {
            await expectRevert(overflowICO.connect(secondAccount).start(), "Ownable: caller is not the owner");
        });

        it("started = true", async () => {
            expect(await overflowICO.started()).to.eq(true);
        });

        it("Error: Already started.", async () => {
            await expectRevert(overflowICO.start(), "Already started.");
        });

        it("transfer correct", async () => {
            expect(await emissionToken.balanceOf(overflowICO.address)).to.eq(totalEmission);
        });

    })

    
    describe('finish', () => {

        let amount = toE6(1000);

        beforeEach(async () => {
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
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

        it('Participant return USD+ after fail precale', async () => {

            let balanceBefore = await salesToken.balanceOf(firstAccount.address);

            await overflowICO.connect(firstAccount).commit(amount);
            await spendTimeWithPayoyt(endDate + 1000);
            await overflowICO.finish();
            await overflowICO.connect(firstAccount).claim();

            let balanceAfter = await salesToken.balanceOf(firstAccount.address);

            expect(balanceBefore).eq(balanceAfter);
        });

    });


    describe('commit', () => {

        let minAmount = toE6(0.5);
        let amount = toE6(1000);

        beforeEach(async () => {
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
        });

        it('Revert: Can only deposit USD+ during the sale period', async () => {
            await spendTime(endDate + 1000);
            await expectRevert(overflowICO.connect(firstAccount).commit(amount), 'Can only deposit USD+ during the sale period');
        })

        it('Revert: Commitment amount is outside the allowed range -> minCommit', async () => {
            await expectRevert(overflowICO.connect(firstAccount).commit(minAmount), 'Commitment amount is outside the allowed range');
        })

        it('commitments = amount', async () => {
            await overflowICO.connect(firstAccount).commit(amount);
            expect(await overflowICO.commitments(firstAccount.address)).to.eq(amount);
        })

        it('totalEmission = amount', async () => {
            await overflowICO.connect(firstAccount).commit(amount);
            expect(await overflowICO.totalCommitments()).to.eq(amount);
        })

    })


    describe("whitelist", () => {

        let amount = toE6(200000);

        beforeEach(async () => {
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
        })

        it("commit && not whitelist", async function () {
            await expectRevert(overflowICO.connect(firstAccount).commit(amount), '!whitelist');
        });

        it("commit && add whitelist", async function () {
            await overflowICO.addToWhitelist([firstAccount.address]);
            await overflowICO.connect(firstAccount).commit(amount);
        });

        it("commit && add/remove whitelist", async function () {
            await overflowICO.addToWhitelist([account.address]);
            await overflowICO.removeFromWhitelist([account.address]);
            await expectRevert(overflowICO.commit(1000000), '!whitelist');
        });

    })

    
    describe('[one participant], [less soft cap]', () => {

        beforeEach(async () => {
            let amount = toE6(200000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount);
            await spendTimeWithPayoyt(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
        })
        
    })

    
    describe('[one participant], [between soft and hard cap], [full vest]', () => {

        beforeEach(async () => {
            let amount = toE6(250000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount);
            await spendTimeWithPayoyt(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
            await overflowICO.connect(firstAccount).claim2();
            await spendTime(vestingBegin + vestingDuration + 1000);
            await overflowICO.connect(firstAccount).claim3(firstAccount.address);
        })

    })

    
    describe('[one participant], [between soft and hard cap], [partial vest]', () => {

        beforeEach(async () => {
            let amount = toE6(250000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount);
            await spendTimeWithPayoyt(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
            await overflowICO.connect(firstAccount).claim2();
            await spendTime(vestingBegin + vestingDuration / 2);
            await overflowICO.connect(firstAccount).claim3(firstAccount.address);
        })

    })

    
    describe('[one participant], [between soft and hard cap], [zero vest]', () => {

        beforeEach(async () => {
            let amount = toE6(250000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount);
            await spendTimeWithPayoyt(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
            await overflowICO.connect(firstAccount).claim2();
            await spendTime(vestingBegin - 1000);
            await overflowICO.connect(firstAccount).claim3(firstAccount.address);
        })

    })

    
    describe('[one participant], [more hard cap], [full vest]', () => {

        beforeEach(async () => {
            let amount = toE6(350000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount);
            await spendTimeWithPayoyt(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
            await overflowICO.logCommonInfo();
            await overflowICO.connect(firstAccount).claim2();
            await spendTime(vestingBegin + vestingDuration + 1000);
            await overflowICO.connect(firstAccount).claim3(firstAccount.address);
        })

    })

    
    describe('[one participant], [more hard cap], [partial vest]', () => {

        beforeEach(async () => {
            let amount = toE6(350000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount);
            await spendTimeWithPayoyt(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
            await overflowICO.logCommonInfo();
            await overflowICO.connect(firstAccount).claim2();
            await spendTime(vestingBegin + vestingDuration / 2);
            await overflowICO.connect(firstAccount).claim3(firstAccount.address);
        })

    })

    describe('[one participant], [more hard cap], [zero vest]', () => {

        beforeEach(async () => {
            let amount = toE6(350000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount);
            await spendTimeWithPayoyt(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
            await overflowICO.logCommonInfo();
            await overflowICO.connect(firstAccount).claim2();
            await spendTime(vestingBegin - 1000);
            await overflowICO.connect(firstAccount).claim3(firstAccount.address);
        })

    })

    
    describe('[one participant], [two times], [less soft cap]', () => {

        beforeEach(async () => {
            let amount = toE6(200000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount / 2);
            await spendTimeWithPayoyt(startDate + addDays(2));
            await overflowICO.connect(firstAccount).commit(amount / 2);
            await spendTimeWithPayoyt2(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
            await overflowICO.logCommonInfo();
        })

    })

    
    describe('[one participant], [two times], [between soft and hard cap], [full vest]', () => {

        beforeEach(async () => {
            let amount = toE6(250000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount / 2);
            await spendTimeWithPayoyt(startDate + addDays(2));
            await overflowICO.connect(firstAccount).commit(amount / 2);
            await spendTimeWithPayoyt2(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
            await overflowICO.connect(firstAccount).claim2();
            await spendTime(vestingBegin + vestingDuration + 1000);
            await overflowICO.connect(firstAccount).claim3(firstAccount.address);
            await overflowICO.logCommonInfo();
        })

    })


    describe('[one participant], [two times], [more hard cap], [full vest]', () => {

        beforeEach(async () => {
            let amount = toE6(350000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount / 2);
            await spendTimeWithPayoyt(startDate + addDays(2));
            await overflowICO.connect(firstAccount).commit(amount / 2);
            await spendTimeWithPayoyt2(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
            await overflowICO.logCommonInfo();
            await overflowICO.connect(firstAccount).claim2();
            await spendTime(vestingBegin + vestingDuration + 1000);
            await overflowICO.connect(firstAccount).claim3(firstAccount.address);
            await overflowICO.logCommonInfo();
        })

    })
    
    
    describe('[two participants], [one time], [less soft cap]', () => {

        beforeEach(async () => {
            let amount = toE6(20000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await overflowICO.addToWhitelist([secondAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.mint(secondAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await salesToken.connect(secondAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount);
            await spendTimeWithPayoyt(startDate + addDays(2));
            await overflowICO.connect(secondAccount).commit(amount);
            await spendTimeWithPayoyt2(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
            await overflowICO.connect(secondAccount).claim();
            await overflowICO.logCommonInfo();
        })

    })

    
    describe('[two participants], [one time], [between soft and hard cap], [full vest]', () => {

        beforeEach(async () => {
            let amount = toE6(125000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await overflowICO.addToWhitelist([secondAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.mint(secondAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await salesToken.connect(secondAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount);
            await spendTimeWithPayoyt(startDate + addDays(2));
            await overflowICO.connect(secondAccount).commit(amount);
            await spendTimeWithPayoyt2(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
            await overflowICO.connect(firstAccount).claim2();
            await overflowICO.connect(secondAccount).claim();
            await overflowICO.connect(secondAccount).claim2();
            await spendTime(vestingBegin + vestingDuration + 1000);
            await overflowICO.connect(firstAccount).claim3(firstAccount.address);
            await overflowICO.connect(secondAccount).claim3(secondAccount.address);
            await overflowICO.logCommonInfo();
        })

    })


    describe('[two participants], [one time], [more hard cap], [full vest]', () => {

        beforeEach(async () => {
            let amount = toE6(200000);
            await emissionToken.mint(account.address, totalEmission);
            await emissionToken.approve(overflowICO.address, totalEmission);
            await overflowICO.start();
            await overflowICO.addToWhitelist([firstAccount.address]);
            await overflowICO.addToWhitelist([secondAccount.address]);
            await spendTime(startDate + addDays(1));

            await salesToken.mint(firstAccount.address, amount);
            await salesToken.mint(secondAccount.address, amount);
            await salesToken.connect(firstAccount).approve(overflowICO.address, amount);
            await salesToken.connect(secondAccount).approve(overflowICO.address, amount);
            await overflowICO.connect(firstAccount).commit(amount);
            await spendTimeWithPayoyt(startDate + addDays(2));
            await overflowICO.connect(secondAccount).commit(amount);
            await spendTimeWithPayoyt2(endDate + 1000);
            await overflowICO.finish();
        });

        it('all claims', async () => {
            await overflowICO.connect(firstAccount).claim();
            await overflowICO.connect(firstAccount).claim2();
            await overflowICO.connect(secondAccount).claim();
            await overflowICO.connect(secondAccount).claim2();
            await spendTime(vestingBegin + vestingDuration + 1000);
            await overflowICO.connect(firstAccount).claim3(firstAccount.address);
            await overflowICO.connect(secondAccount).claim3(secondAccount.address);
            await overflowICO.logCommonInfo();
        })

    })

    function addDays(days) {
        return (days * 24 * 60 * 60 * 1000);
    }

    async function spendTimeWithPayoyt(value) {
        await ethers.provider.send("evm_setNextBlockTimestamp", [value]);
        await salesToken.setLiquidityIndex("1200000000000000000000000000");
    }

    async function spendTimeWithPayoyt2(value) {
        await ethers.provider.send("evm_setNextBlockTimestamp", [value]);
        await salesToken.setLiquidityIndex("1300000000000000000000000000");
    }

    async function spendTime(value) {
        await ethers.provider.send("evm_setNextBlockTimestamp", [value]);
    }

});
