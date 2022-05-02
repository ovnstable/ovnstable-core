const hre = require("hardhat");
const { deployments, ethers, getNamedAccounts } = require('hardhat');
const { expect } = require("chai");
const BN = require('bn.js');
const chai = require("chai");
chai.use(require('chai-bn')(BN));
const { toUSDC, fromUSDC } = require("@overnight-contracts/common/utils/decimals");
const { resetHardhat } = require("@overnight-contracts/common/utils/tests");
const { POLYGON } = require('@overnight-contracts/common/utils/assets');

describe("StakingRewards", function () {

    let account;
    let stakingRewards;

    let stakingToken;
    let rewardToken;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('POLYGON');

        await deployments.fixture(['PreOvnToken', 'StakingRewards', 'StakingRewardsSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        rewardToken = await ethers.getContract('PreOvnToken');
        stakingRewards = await ethers.getContract('StakingRewards');
        stakingToken = await ethers.getContractAt("ERC20", POLYGON.usdc);

        await rewardToken.mint(stakingRewards.address, toUSDC(100));

    });

    it("Staking balance = 0", async function () {
        let value = (await stakingRewards.balanceOf(account)).toNumber();
        console.log('StakingRewards balance: ' + value);
        expect(value).to.eq(0);
    });

    it("Reward balance = 0", async function () {
        let value = (await rewardToken.balanceOf(account)).toNumber();
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
            let value = (await stakingRewards.balanceOf(account)).toNumber();
            console.log('StakingRewards balance: ' + value);
            expect(value).to.eq(toUSDC(100));
        });

        it("Earned = 2", async function () {
            let value = (await stakingRewards.earned(account)).toNumber();
            console.log('StakingRewards earned: ' + value);
            expect(value).to.eq(2);
        });


        describe("Withdraw 50", function () {

            let balanceStakingToken;

            before(async () => {

                balanceStakingToken = await stakingToken.balanceOf(account);
                await stakingRewards.withdraw(toUSDC(50));
                balanceStakingToken = fromUSDC(await stakingToken.balanceOf(account) - balanceStakingToken);

            });

            it("Balance Staking = 50", async function () {
                let value = (await stakingRewards.balanceOf(account)).toNumber();
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
                    let value = (await rewardToken.balanceOf(account)).toNumber();
                    console.log('RewardToken balance: ' + value);
                    expect(value).to.greaterThan(0);
                });

            });

        });

    });

});
