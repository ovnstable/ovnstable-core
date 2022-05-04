const hre = require("hardhat");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {expect} = require("chai");
const BN = require('bn.js');
const chai = require("chai");
chai.use(require('chai-bn')(BN));
const {toUSDC, fromUSDC, toE18} = require("@overnight-contracts/common/utils/decimals");
const {resetHardhat} = require("@overnight-contracts/common/utils/tests");
const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {fromE18} = require("../../common/utils/decimals");

describe("StakingRewards", function () {

    let account;
    let user1;
    let user2;
    let stakingRewards;

    let stakingToken;
    let rewardToken;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('POLYGON');

        await deployments.fixture(['PreOvnToken', 'StakingRewards', 'test', 'MockERC20']);

        const signers = await ethers.getSigners();

        account = signers[0];
        user1 = signers[1];
        user2 = signers[2];

        rewardToken = await ethers.getContract('PreOvnToken');
        stakingRewards = await ethers.getContract('StakingRewards');
        stakingToken = await ethers.getContract("MockERC20");

        await stakingRewards.setTokens(stakingToken.address, rewardToken.address);

        let rewardRate = new BN(1).muln(10).pow(new BN(13)).toString(); // 1e13
        let periodFinish = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + (5 * 86400000); // +5 Day

        console.log('PeriodFinish: ' + new Date(periodFinish));
        console.log('RewardRate : ' + rewardRate);

        await stakingRewards.setSetting(rewardRate, periodFinish);
        await rewardToken.mint(stakingRewards.address, toE18(10000));

        let value = new BN("46477742369098").muln(100); // 100$ * 100 = 10 000
        await stakingToken.mint(account.address, value.toString());
        await stakingToken.mint(user1.address, value.toString());
        await stakingToken.mint(user2.address, value.toString());

    });


    it('First company', async function () {

        await stake(account);
        await addDays(1);
        await getRewards([account]);
        await addDays(1);
        await stake(user1);
        await addDays(1);
        await getRewards([account, user1]);

        await expectBalance(account, 12);
        await expectBalance(user1, 4);

        await addDays(1);

        await expectBalance(account, 12);
        await expectBalance(user1, 4);

        await getRewards([account, user1]);

        await expectBalance(account, 16);
        await expectBalance(user1, 8);

        await stake(user2);

        await expectBalance(account, 16);
        await expectBalance(user1, 8);
        await expectBalance(user2, 0);

        await addDays(15);
        await getRewards([account, user1, user2]);

        await expectBalance(account, 20);
        await expectBalance(user1, 12);
        await expectBalance(user2, 4);


        let rewardRate = new BN(1).muln(10).pow(new BN(13)).toString(); // 1e13
        let periodFinish = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + (5 * 86400000); // +5 Day

        console.log('PeriodFinish: ' + new Date(periodFinish));
        console.log('RewardRate : ' + rewardRate);
        await stakingRewards.setSetting(rewardRate, periodFinish);


        await moveBalances([account, user1, user2]);

        await expectBalance(account, 0);
        await expectBalance(user1, 0);
        await expectBalance(user2, 0);


        await addDays(1);

        await getRewards([account, user1, user2]);

        await expectBalance(account, 4);
        await expectBalance(user1, 4);
        await expectBalance(user2, 4);

    });

    async function moveBalances(users) {

        for (let i = 0; i < users.length; i++) {
            let user = users[i];
            await rewardToken.connect(user).transfer(stakingRewards.address, await rewardToken.balanceOf(user.address));
        }
    }

    async function expectBalance(user, number) {
        expect(number).to.equal(Number.parseInt(fromE18(await rewardToken.balanceOf(user.address))));

        console.log(`${user.address}: Balance rewards: ${await rewardToken.balanceOf(user.address)}: ${fromE18(await rewardToken.balanceOf(user.address))}`);
    }

    async function stake(user) {

        console.log(`[Stake:${user.address}]`)

        await stakingToken.connect(user).approve(stakingRewards.address, await stakingToken.balanceOf(user.address));
        await stakingRewards.connect(user).stake(await stakingToken.balanceOf(user.address));
    }

    async function getRewards(users) {
        console.log(`[Get rewards]`)
        for (let i = 0; i < users.length; i++) {
            let user = users[i];
            await (await stakingRewards.connect(user).getReward()).wait();
        }
    }

    async function addDays(number) {
        console.log(`[+${number} Days]`);
        const days = number * 24 * 60 * 60 * 1000;
        await ethers.provider.send("evm_increaseTime", [days]);
        await ethers.provider.send('evm_mine');
    }

    it("Staking balance = 0", async function () {
        let value = (await stakingRewards.balanceOf(account.address)).toNumber();
        console.log('StakingRewards balance: ' + value);
        expect(value).to.eq(0);
    });

    it("Reward balance = 0", async function () {
        let value = (await rewardToken.balanceOf(account.address)).toNumber();
        console.log('RewardToken balance: ' + value);
        expect(value).to.eq(0);
    });

    it("RewardPerToken = 0", async function () {
        let value = (await stakingRewards.rewardPerToken()).toNumber();
        console.log('RewardPerToken: ' + value);
        expect(value).to.eq(0);
    });


    describe("Stake 100", function () {

        before(async () => {

            await stakingToken.approve(stakingRewards.address, toUSDC(100));
            await stakingRewards.stake(toUSDC(100));

            await ethers.provider.send('evm_mine');

        });

        it("Balance Staking = 100", async function () {
            let value = (await stakingRewards.balanceOf(account.address)).toNumber();
            console.log('StakingRewards balance: ' + value);
            expect(value).to.eq(toUSDC(100));
        });

        it("Earned = 2", async function () {
            let value = (await stakingRewards.earned(account.address)).toNumber();
            console.log('StakingRewards earned: ' + value);
            expect(value).to.eq(2);
        });


        describe("Withdraw 50", function () {

            let balanceStakingToken;

            before(async () => {

                balanceStakingToken = await stakingToken.balanceOf(account.address);
                await stakingRewards.withdraw(toUSDC(50));
                balanceStakingToken = fromUSDC(await stakingToken.balanceOf(account.address) - balanceStakingToken);

            });

            it("Balance Staking = 50", async function () {
                let value = (await stakingRewards.balanceOf(account.address)).toNumber();
                console.log('StakingRewards balance: ' + value);
                expect(value).to.eq(toUSDC(50));
            });

            it("Balance StakingToken = 50", async function () {
                console.log('StakingToken balance: ' + balanceStakingToken);
                expect(balanceStakingToken).to.eq(50);
            });


            describe("Claim rewards", function () {

                before(async () => {
                    await stakingRewards.getReward();
                });

                it("Balance Staking = 50", async function () {
                    let value = (await rewardToken.balanceOf(account.address)).toNumber();
                    console.log('RewardToken balance: ' + value);
                    expect(value).to.greaterThan(0);
                });

            });

        });

    });

});
