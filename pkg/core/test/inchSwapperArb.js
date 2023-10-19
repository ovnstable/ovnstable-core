const { expect } = require("chai");
const chai = require("chai");
const { deployments, ethers, getNamedAccounts, upgrades } = require("hardhat");
const { createRandomWallet, resetHardhat } = require("@overnight-contracts/common/utils/tests");
const hre = require("hardhat");
let { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const INCH_ROUTER_V5 = require("./abi/InchRouterV5.json");
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach")

chai.use(require('chai-bignumber')());
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const { getChainId, transferAsset, getContract, getERC20, sleep } = require("@overnight-contracts/common/utils/script-utils");
const { toE6, toE18, fromE6, fromE18 } = require("@overnight-contracts/common/utils/decimals");
const { default: axios } = require("axios");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { getDataForSwap } = require("@overnight-contracts/common/utils/inch-helpers");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");

describe("InchSwapper", function () {

    let testAccount;
    let inchDataForSwapResponse0;
    let inchDataForSwapResponse1;
    let amountIn0;
    let amountIn1;
    let inchSwapper;
    let amountInMax0;
    let amountInMax1;

    let account;
    let unregisteredAccount;

    sharedBeforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat("ARBITRUM")
        const { deployer } = await getNamedAccounts();

        account = deployer;

        await deployments.fixture(['InchSwapper']);

        inchSwapper = await ethers.getContract('InchSwapper');
        testAccount = await createRandomWallet();
        unregisteredAccount = await createRandomWallet();

        await inchSwapper.setParams(ARBITRUM.inchRouterV5, ZERO_ADDRESS);
        await inchSwapper.grantRole(Roles.UNIT_ROLE, testAccount.address);
        await inchSwapper.grantRole(Roles.UNIT_ROLE, account);
    });


    describe('user flow', () => {

        beforeEach(async () => {

            amountIn0 = toE6(1000);
            amountIn1 = toE18(1000);

            amountInMax0 = toE6(10_000);
            amountInMax1 = toE18(10_000);

            inchDataForSwapResponse0 = await getDataForSwap(
                await getChainId(),
                testAccount.address,
                ARBITRUM.usdc,
                ARBITRUM.dai,
                amountInMax0,
                "",
                "");

            await inchSwapper.connect(testAccount).updatePath({
                tokenIn: ARBITRUM.usdc,
                tokenOut: ARBITRUM.dai,
                amount: amountInMax0,
                flags: inchDataForSwapResponse0.flags,
                srcReceiver: inchDataForSwapResponse0.srcReceiver,
                pools: inchDataForSwapResponse0.pools,
                isUniV3: inchDataForSwapResponse0.isUniV3
            }, inchDataForSwapResponse0.data,);

            inchDataForSwapResponse1 = await getDataForSwap(
                await getChainId(),
                account,
                ARBITRUM.dai,
                ARBITRUM.usdc,
                amountInMax1,
                "ARBITRUM_UNISWAP_V3",
                "");

            await inchSwapper.updatePath({
                tokenIn: ARBITRUM.dai,
                tokenOut: ARBITRUM.usdc,
                amount: amountInMax1,
                flags: inchDataForSwapResponse1.flags,
                srcReceiver: inchDataForSwapResponse1.srcReceiver,
                pools: inchDataForSwapResponse1.pools,
                isUniV3: inchDataForSwapResponse1.isUniV3
            }, inchDataForSwapResponse1.data,);

        });

        it("same user, smaller amount", async function () {
            const path = await inchSwapper.getPath(ARBITRUM.usdc, ARBITRUM.dai);

            expect(path.data.toString()).to.be.equal(inchDataForSwapResponse0.data);
            expect(path.amount.toString()).to.be.equal(amountInMax0.toString());

            const usdc = await getERC20("usdc");
            const dai = await getERC20("dai");

            await transferAsset(ARBITRUM.usdc, testAccount.address);

            const balanceBeforeUsdbc = await usdc.balanceOf(testAccount.address);
            const balanceBeforeDai = await dai.balanceOf(testAccount.address);

            const balanceBeforeUsdbcAccount = await usdc.balanceOf(account);
            const balanceBeforeDaiAccount = await dai.balanceOf(account);

            await (await usdc.connect(testAccount).approve(inchSwapper.address, amountIn0)).wait();

            await (await inchSwapper.connect(testAccount).swap(testAccount.address, ARBITRUM.usdc, ARBITRUM.dai, amountIn0, 1)).wait();

            const balanceAfterUsdbc = await usdc.balanceOf(testAccount.address);
            const balanceAfterDai = await dai.balanceOf(testAccount.address);

            const balanceAfterUsdbcContract = await usdc.balanceOf(inchSwapper.address);
            const balanceAfterDaiContract = await dai.balanceOf(inchSwapper.address);
            const balanceAfterUsdbcAccount = await usdc.balanceOf(account);
            const balanceAfterDaiAccount = await dai.balanceOf(account);
            let tables = []

            tables.push({
                name: 'usdc',
                before: fromE6(balanceBeforeUsdbc),
                after: fromE6(balanceAfterUsdbc),
                contract: fromE6(balanceAfterUsdbcContract),
                beforeAccount: fromE6(balanceBeforeUsdbcAccount),
                afterAccount: fromE6(balanceAfterUsdbcAccount),
            })

            tables.push({
                name: 'dai',
                before: fromE18(balanceBeforeDai),
                after: fromE18(balanceAfterDai),
                contract: fromE18(balanceAfterDaiContract),
                beforeAccount: fromE18(balanceBeforeDaiAccount),
                afterAccount: fromE18(balanceAfterDaiAccount),
            })

            console.table(tables)
        });

        it("update path and check", async function () {
            const pathBefore = await inchSwapper.getPath(ARBITRUM.usdc, ARBITRUM.dai);

            expect(pathBefore.data.toString()).to.be.equal(inchDataForSwapResponse0.data);
            expect(pathBefore.amount.toString()).to.be.equal(amountInMax0.toString());

            await inchSwapper.updatePath({
                tokenIn: ARBITRUM.usdc,
                tokenOut: ARBITRUM.dai,
                amount: amountInMax1,
                flags: inchDataForSwapResponse1.flags,
                srcReceiver: inchDataForSwapResponse1.srcReceiver,
                pools: inchDataForSwapResponse1.pools,
                isUniV3: inchDataForSwapResponse1.isUniV3
            }, inchDataForSwapResponse1.data,);
            const pathAfter = await inchSwapper.getPath(ARBITRUM.usdc, ARBITRUM.dai);

            expect(pathAfter.data.toString()).not.to.be.equal(pathBefore.data.toString());
            expect(pathAfter.amount.toString()).not.to.be.equal(pathBefore.amount.toString());
            expect(pathAfter.updateBlock.toString()).not.to.be.equal(pathBefore.updateBlock.toString());

            const pathDifferent = await inchSwapper.getPath(ARBITRUM.dai, ARBITRUM.usdc);

            expect(pathAfter.data.toString()).to.be.equal(pathDifferent.data.toString());
            expect(pathAfter.amount.toString()).to.be.equal(pathDifferent.amount.toString());
        });


        it("diff user, smaller amount", async function () {
            const path = await inchSwapper.getPath(ARBITRUM.dai, ARBITRUM.usdc);

            expect(path.data.toString()).to.be.equal(inchDataForSwapResponse1.data);
            expect(path.amount.toString()).to.be.equal(amountInMax1.toString());

            const usdc = await getERC20("usdc");
            const dai = await getERC20("dai");

            await transferAsset(ARBITRUM.dai, testAccount.address);

            const balanceBeforeUsdbc = await usdc.balanceOf(testAccount.address);
            const balanceBeforeDai = await dai.balanceOf(testAccount.address);

            const balanceBeforeUsdbcAccount = await usdc.balanceOf(account);
            const balanceBeforeDaiAccount = await dai.balanceOf(account);

            await (await dai.connect(testAccount).approve(inchSwapper.address, amountIn1)).wait();

            await (await inchSwapper.connect(testAccount).swap(testAccount.address, ARBITRUM.dai, ARBITRUM.usdc, amountIn1, 1)).wait();

            const balanceAfterUsdbc = await usdc.balanceOf(testAccount.address);
            const balanceAfterDai = await dai.balanceOf(testAccount.address);

            const balanceAfterUsdbcContract = await usdc.balanceOf(inchSwapper.address);
            const balanceAfterDaiContract = await dai.balanceOf(inchSwapper.address);
            const balanceAfterUsdbcAccount = await usdc.balanceOf(account);
            const balanceAfterDaiAccount = await dai.balanceOf(account);
            let tables = []

            tables.push({
                name: 'usdc',
                before: fromE6(balanceBeforeUsdbc),
                after: fromE6(balanceAfterUsdbc),
                contract: fromE6(balanceAfterUsdbcContract),
                beforeAccount: fromE6(balanceBeforeUsdbcAccount),
                afterAccount: fromE6(balanceAfterUsdbcAccount),
            })

            tables.push({
                name: 'dai',
                before: fromE18(balanceBeforeDai),
                after: fromE18(balanceAfterDai),
                contract: fromE18(balanceAfterDaiContract),
                beforeAccount: fromE18(balanceBeforeDaiAccount),
                afterAccount: fromE18(balanceAfterDaiAccount),
            })

            console.table(tables)
        });


        it("univ3swapcase", async function () {

            inchDataForSwapResponse1 = await getDataForSwap(
                await getChainId(),
                testAccount.address,
                ARBITRUM.dai,
                ARBITRUM.usdc,
                amountInMax1,
                "ARBITRUM_UNISWAP_V3",
                "");


            await inchSwapper.connect(testAccount).updatePath({
                tokenIn: ARBITRUM.dai,
                tokenOut: ARBITRUM.usdc,
                amount: amountInMax1,
                flags: inchDataForSwapResponse1.flags,
                srcReceiver: inchDataForSwapResponse1.srcReceiver,
                pools: inchDataForSwapResponse1.pools,
                isUniV3: inchDataForSwapResponse1.isUniV3
            }, inchDataForSwapResponse1.data,);

            const path = await inchSwapper.getPath(ARBITRUM.dai, ARBITRUM.usdc);

            expect(path.data.toString()).to.be.equal(inchDataForSwapResponse1.data);
            expect(path.amount.toString()).to.be.equal(amountInMax1.toString());
            expect(path.isUniV3).to.be.equal(true);
            expect(path.isNew).to.be.equal(true);
            expect(path.pools).not.to.be.equal([0]);

            const usdc = await getERC20("usdc");
            const dai = await getERC20("dai");

            await transferAsset(ARBITRUM.dai, testAccount.address);

            const balanceBeforeUsdbc = await usdc.balanceOf(testAccount.address);
            const balanceBeforeDai = await dai.balanceOf(testAccount.address);

            const balanceBeforeUsdbcAccount = await usdc.balanceOf(account);
            const balanceBeforeDaiAccount = await dai.balanceOf(account);

            await (await dai.connect(testAccount).approve(inchSwapper.address, amountIn1)).wait();

            await (await inchSwapper.connect(testAccount).swap(testAccount.address, ARBITRUM.dai, ARBITRUM.usdc, amountIn1, 1)).wait();

            const balanceAfterUsdbc = await usdc.balanceOf(testAccount.address);
            const balanceAfterDai = await dai.balanceOf(testAccount.address);

            const balanceAfterUsdbcContract = await usdc.balanceOf(inchSwapper.address);
            const balanceAfterDaiContract = await dai.balanceOf(inchSwapper.address);
            const balanceAfterUsdbcAccount = await usdc.balanceOf(account);
            const balanceAfterDaiAccount = await dai.balanceOf(account);
            let tables = []

            tables.push({
                name: 'usdc',
                before: fromE6(balanceBeforeUsdbc),
                after: fromE6(balanceAfterUsdbc),
                contract: fromE6(balanceAfterUsdbcContract),
                beforeAccount: fromE6(balanceBeforeUsdbcAccount),
                afterAccount: fromE6(balanceAfterUsdbcAccount),
            })

            tables.push({
                name: 'dai',
                before: fromE18(balanceBeforeDai),
                after: fromE18(balanceAfterDai),
                contract: fromE18(balanceAfterDaiContract),
                beforeAccount: fromE18(balanceBeforeDaiAccount),
                afterAccount: fromE18(balanceAfterDaiAccount),
            })

            console.table(tables)
        });

        it("unregistered user to update path", async function () {

            await expectRevert(inchSwapper.connect(unregisteredAccount).updatePath({
                tokenIn: ARBITRUM.usdc,
                tokenOut: ARBITRUM.dai,
                amount: amountInMax1,
                flags: inchDataForSwapResponse1.flags,
                srcReceiver: inchDataForSwapResponse1.srcReceiver,
                pools: inchDataForSwapResponse1.pools,
                isUniV3: inchDataForSwapResponse1.isUniV3
            }, inchDataForSwapResponse1.data,), "Restricted to Unit");

        });

        it("errors in update tokens", async function () {

            await expectRevert(inchSwapper.updatePath({
                tokenIn: ARBITRUM.usdc,
                tokenOut: ARBITRUM.usdc,
                amount: amountInMax1,
                flags: inchDataForSwapResponse1.flags,
                srcReceiver: inchDataForSwapResponse1.srcReceiver,
                pools: inchDataForSwapResponse1.pools,
                isUniV3: inchDataForSwapResponse1.isUniV3
            }, inchDataForSwapResponse1.data,), "wrong tokens");
            await expectRevert(inchSwapper.updatePath({
                tokenIn: ZERO_ADDRESS,
                tokenOut: ARBITRUM.usdc,
                amount: amountInMax1,
                flags: inchDataForSwapResponse1.flags,
                srcReceiver: inchDataForSwapResponse1.srcReceiver,
                pools: inchDataForSwapResponse1.pools,
                isUniV3: inchDataForSwapResponse1.isUniV3
            }, inchDataForSwapResponse1.data,), "wrong tokens");
            await expectRevert(inchSwapper.updatePath({
                tokenIn: ARBITRUM.usdc,
                tokenOut: ZERO_ADDRESS,
                amount: amountInMax1,
                flags: inchDataForSwapResponse1.flags,
                srcReceiver: inchDataForSwapResponse1.srcReceiver,
                pools: inchDataForSwapResponse1.pools,
                isUniV3: inchDataForSwapResponse1.isUniV3
            }, inchDataForSwapResponse1.data,), "wrong tokens");
        });

        it("unregistered user to get path", async function () {
            await expectRevert(inchSwapper.connect(unregisteredAccount).getPath(ARBITRUM.usdc, ARBITRUM.dai,), "Restricted to Unit");

        });

        it("amount is more than allowed", async function () {
            await expectRevert(inchSwapper.connect(testAccount).swap(testAccount.address, ARBITRUM.usdc, ARBITRUM.dai, amountInMax0 * 100, 1), "amount is more than saved");

        });

        it("no path", async function () {
            const noPath = await inchSwapper.getPath(ARBITRUM.usdc, ARBITRUM.aDai,);

            expect(noPath.updateBlock.toString()).to.be.equal("0");
            expect(noPath.amount.toString()).to.be.equal("0");
            expect(noPath.flags.toString()).to.be.equal("0");
            expect(noPath.srcReceiver.toString()).to.be.equal("0x0000000000000000000000000000000000000000");
            expect(noPath.data.toString()).to.be.equal("0x");

        });

        it("no path swap", async function () {
            await expectRevert(inchSwapper.connect(testAccount).swap(testAccount.address, ARBITRUM.usdc, ARBITRUM.aDai, amountIn0, 1), "amount is more than saved");

        });

        it("is already used", async function () {
            const usdc = await getERC20("usdc");

            await transferAsset(ARBITRUM.usdc, testAccount.address);

            await (await usdc.connect(testAccount).approve(inchSwapper.address, amountIn0)).wait();
            await inchSwapper.connect(testAccount).swap(testAccount.address, ARBITRUM.usdc, ARBITRUM.dai, amountIn0, 1)
            await sleep(1000);
            await (await usdc.connect(testAccount).approve(inchSwapper.address, amountIn0)).wait();
            await expectRevert(inchSwapper.connect(testAccount).swap(testAccount.address, ARBITRUM.usdc, ARBITRUM.dai, amountIn0, 1), "route already used");

        });

    });

});

