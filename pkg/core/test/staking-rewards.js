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
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");

describe("StakingRewards", function () {

    let account;
    let user1;
    let user2;
    let stakingRewards;

    let stakingToken;
    let rewardToken;

    sharedBeforeEach(async () => {
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

        await stakingRewards.updateRewardProgram(rewardRate, periodFinish);
        await rewardToken.mint(stakingRewards.address, toE18(100));

        let value = new BN("46477742369098").muln(100); // 100$ * 100 = 10 000
        await stakingToken.mint(account.address, value.toString());
        await stakingToken.mint(user1.address, value.toString());
        await stakingToken.mint(user2.address, value.toString());

    });


    it('Stake User', async  function () {

        await rewardBalance(10000);
        await stake(account);
        await addDays(1);
        await expectEarned(account, 4);
        await getRewards([account]);
        await expectBalance(account, 4);
        await rewardBalance(9996);
        await expectEarned(account, 0);

    });



    it('Stake multi Users' , async function (){

        await rewardBalance(100);

        await stake(account);
        await stake(user1);
        await stake(user2);

        await addDays(1);

        await expectEarned(account, 4);
        await expectEarned(user1, 4);
        await expectEarned(user2, 4);

        await getRewards([account, user1, user2]);

        await expectBalance(account, 4);
        await expectBalance(user1, 4);
        await expectBalance(user2, 4);

        await rewardBalance(88);

        await expectEarned(account, 0);
        await expectEarned(user1, 0);
        await expectEarned(user2, 0);

    });


    it('Stake/Withdraw = balances equals', async function (){

        let stakingBalanceBefore = await stakingToken.balanceOf(account.address);
        await stake(account);

        await expectStakingBalanceBN(account, new BN(0));

        await addDays(1);
        await getRewards([account]);
        await withdraw([account]);

        await expectStakingBalanceBN(account, stakingBalanceBefore);
    });


    it("Finish rewards = 5 day max", async function () {

        await stake(account);
        await addDays(5);

        await expectEarned(account, 20);

        await addDays(10);

        await expectEarned(account, 20);

        await getRewards([account]);
        await expectEarned(account, 0);
        await expectBalance(account, 20);
    });


    it("Finish RewardProgram => updateRewardProgram", async function (){

        await stake(account);
        await addDays(5);
        await expectEarned(account, 20);

        let rewardRate = new BN(1).muln(10).pow(new BN(13)).toString(); // 1e13
        let periodFinish = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + (5 * 86400000); // +5 Day
        await stakingRewards.updateRewardProgram(rewardRate, periodFinish);

        await addDays(10);

        await expectEarned(account, 40);

        await getRewards([account]);
        await expectEarned(account, 0);
        await expectBalance(account, 40);

        await rewardBalance(60);

    });

    it("Stop RewardProgram", async function (){

        await stake(account);
        await addDays(1);
        await expectEarned(account, 4);

        let rewardRate = new BN(1).muln(10).pow(new BN(13)).toString(); // 1e13
        let periodFinish = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + 1;
        await stakingRewards.updateRewardProgram(rewardRate, periodFinish);

        await addDays(4);

        await expectEarned(account, 4);

        await getRewards([account]);
        await expectEarned(account, 0);
        await expectBalance(account, 4);

    });


    it("SetTokens = expect", async function (){
        await expectRevert(stakingRewards.setTokens(stakingToken.address, rewardToken.address), 'StakingToken already initialized');
    });

    async function rewardBalance(amount) {
        let value = await rewardToken.balanceOf(stakingRewards.address);
        let number = Number.parseInt(fromE18(value));
        console.log(`Reward balance ${value}:${number}`);
        expect(amount).to.eq(number);
    }

    async function withdraw(users) {

        for (let i = 0; i < users.length; i++) {
            let user = users[i];
            await stakingRewards.connect(user).withdraw(await stakingRewards.balanceOf(user.address));
        }
    }

    async function resetBalances(users) {

        for (let i = 0; i < users.length; i++) {
            let user = users[i];
            await rewardToken.connect(user).transfer(stakingRewards.address, await rewardToken.balanceOf(user.address));
        }
    }

    async function expectEarned(user, number) {
        expect(number).to.equal(Number.parseInt(fromE18(await stakingRewards.earned(user.address))));

        console.log(`${user.address}: Earned rewards: ${await stakingRewards.earned(user.address)}: ${fromE18(await stakingRewards.earned(user.address))}`);
    }

    async function expectStakingBalanceBN(user, number) {
        expect(number.toString()).to.equal((await stakingToken.balanceOf(user.address)).toString());

        console.log(`${user.address}: Balance staking: ${await stakingToken.balanceOf(user.address)}: ${fromE18(await stakingToken.balanceOf(user.address))}`);
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


});
