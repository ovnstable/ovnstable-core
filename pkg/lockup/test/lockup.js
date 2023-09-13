const {expect} = require("chai");
const {deployments, ethers} = require("hardhat");
const hre = require("hardhat");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {toE18, toE6} = require("@overnight-contracts/common/utils/decimals");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const BigNumber = require('bignumber.js');

const LOCKUP_ABI = (require("./Lockup_ABI.json"));

describe("Lockup", function () {

    let account;
    let lockup;

    let beneficiary;
    let startTimestamp;
    let durationSeconds;

    let lockupToken;


    sharedBeforeEach('deploy and setup', async () => {

        await hre.run("compile");
        const signers = await ethers.getSigners();
        account = signers[0];
        beneficiary = signers[1];

        console.log("account address:", account.address);
        console.log("beneficiary address:", beneficiary.address);

        await deployments.fixture(['LockupToken']);

        lockupToken = await ethers.getContract("LockupToken");
        startTimestamp = Math.floor((new Date().getTime()) / 1000) + addDays(1);
        durationSeconds = addDays(30);

        let params = {
            beneficiaryAddress: beneficiary.address,
            startTimestamp: startTimestamp,
            durationSeconds: durationSeconds,
        }

        lockup = await deployments.deploy("Lockup", {
            from: account.address,
            args: [
                params
            ],
            log: true,
            skipIfAlreadyDeployed: false
        });

        console.log("Lockup created at " + lockup.address);

        lockup = await ethers.getContractAt(LOCKUP_ABI, lockup.address);
    });


    describe('[Slow participant]', () => {

        let amountToLockup = toE18(10_000);

        beforeEach(async () => {
            await spendTime(startTimestamp - 100);
            await lockupToken.mint(account.address, amountToLockup);
            await lockupToken.transfer(lockup.address, amountToLockup);
        });

        it('try to release before start', async () => {
            await lockup.connect(beneficiary).release(lockupToken.address);
            await lockupEmpty(beneficiary);
        })

        it('try to release after start, 1/2', async () => {
            await spendTime(startTimestamp + durationSeconds / 2);
            await lockup.connect(beneficiary).release(lockupToken.address);
            await lockupShould(beneficiary, (new BigNumber(amountToLockup)).div(2).toFixed(0));
        })

        it('try to release after start, 1/3', async () => {
            await spendTime(startTimestamp + durationSeconds / 3);
            await lockup.connect(beneficiary).release(lockupToken.address);
            await lockupShould(beneficiary, (new BigNumber(amountToLockup)).div(3).toFixed(0));
        })

        it('try to release after start, 1/100', async () => {
            await spendTime(startTimestamp + durationSeconds / 100);
            await lockup.connect(beneficiary).release(lockupToken.address);
            await lockupShould(beneficiary, (new BigNumber(amountToLockup)).div(100).toFixed(0));
        })

        it('try to release after start + duration', async () => {
            await spendTime(startTimestamp + durationSeconds + 100);
            await lockup.connect(beneficiary).release(lockupToken.address);
            await lockupShould(beneficiary, amountToLockup);
        })
    })

    function addDays(days) {
        return (days * 24 * 60 * 60);
    }


    async function lockupShould(user, amount) {
        if (typeof amount === 'number' || amount instanceof Number) {
            amount = toE6(amount);
        }
        expect(amount).to.eq(await lockupToken.balanceOf(user.address));
    }

    async function lockupEmpty(user) {
        expect(await lockupToken.balanceOf(user.address)).to.eq(0);
    }

    async function spendTime(value) {
        await ethers.provider.send("evm_setNextBlockTimestamp", [value]);
    }

});
