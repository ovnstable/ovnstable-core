const { expect } = require("chai");
const chai = require("chai");
const { deployments, ethers, getNamedAccounts, upgrades } = require("hardhat");
const {createRandomWallet } = require("@overnight-contracts/common/utils/tests");
const hre = require("hardhat");
let { BASE } = require('@overnight-contracts/common/utils/assets');
const INCH_ROUTER_V5 = require("./abi/InchRouterV5.json");
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach")

chai.use(require('chai-bignumber')());
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const {getChainId, transferAsset, getContract, getERC20, sleep } = require("@overnight-contracts/common/utils/script-utils");
const {toE6, toE18 } = require("@overnight-contracts/common/utils/decimals");
const { default: axios } = require("axios");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const {getDataForSwap} = require("@overnight-contracts/common/utils/inch-helpers");

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

    sharedBeforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        const { deployer } = await getNamedAccounts();

        account = deployer;

        await deployments.fixture(['InchSwapper']);

        inchSwapper = await ethers.getContract('InchSwapper');
        testAccount = await createRandomWallet();

        await inchSwapper.setRouter(BASE.inchRouterV5);
        await inchSwapper.grantRole(Roles.UNIT_ROLE, testAccount.address);
        await inchSwapper.grantRole(Roles.UNIT_ROLE, account);
    });


    describe('add and swap and add and swap', () => {

        let item;

        beforeEach(async () => {

            amountIn0 = toE6(1000);
            amountIn1 = toE18(1000);

            amountInMax0 = toE6(1_000_000);
            amountInMax1 = toE18(1_000_000);

            inchDataForSwapResponse0 = await getDataForSwap(
                await getChainId(),
                testAccount.address,
                BASE.usdbc,
                BASE.dai,
                amountInMax0,
                "BASE_UNISWAP_V3",
                "");

            await inchSwapper.updatePath({
                tokenIn: BASE.usdbc,
                tokenOut: BASE.dai,
                amount: amountInMax0,
                flags: inchDataForSwapResponse0.flags,
                srcReceiver: inchDataForSwapResponse0.srcReceiver
            }, inchDataForSwapResponse0.data,);

            inchDataForSwapResponse1 = await getDataForSwap(
                await getChainId(),
                testAccount.address,
                BASE.dai,
                BASE.usdbc,
                amountInMax1,
                "BASE_UNISWAP_V3",
                "");

            await inchSwapper.updatePath({
                tokenIn: BASE.dai,
                tokenOut: BASE.usdbc,
                amount: amountIn1,
                flags: inchDataForSwapResponse1.flags,
                srcReceiver: inchDataForSwapResponse1.srcReceiver
            }, inchDataForSwapResponse1.data,);

        });

        it("check data and run with lower volume", async function () {
            const path = await inchSwapper.routePathsMap(BASE.usdbc, BASE.dai);

            expect(path.data.toString()).to.be.equal(inchDataForSwapResponse0.data);
            expect(path.amount.toString()).to.be.equal(amountInMax0.toString());

            const usdbc = await getERC20("usdbc");
            const dai = await getERC20("dai");

            await transferAsset(BASE.usdbc, testAccount.address);

            const balanceBeforeUsdbc = await usdbc.balanceOf(testAccount.address);
            const balanceBeforeDai = await dai.balanceOf(testAccount.address);

            await (await usdbc.connect(testAccount).approve(inchSwapper.address, amountIn0)).wait();

            await (await inchSwapper.connect(testAccount).swap(account, BASE.usdbc, BASE.dai, amountIn0, 10)).wait(); // reverted with an unrecognized custom error (return data: 0x0262dde4)

            const balanceAfterUsdbc = await usdbc.balanceOf(account);
            const balanceAfterDai = await dai.balanceOf(account);

            console.log((balanceBeforeUsdbc - balanceAfterUsdbc).toString(), amountIn0 / 10, (balanceAfterDai - balanceBeforeDai).toString());

        });

        it("update same and check block and amount and data update ", async function () {
            const pathBefore = await inchSwapper.routePathsMap(BASE.usdbc, BASE.dai);

            expect(pathBefore.data.toString()).to.be.equal(inchDataForSwapResponse0.data);
            expect(pathBefore.amount.toString()).to.be.equal(amountIn0.toString());

            await inchSwapper.updatePath({
                tokenIn: BASE.usdbc,
                tokenOut: BASE.dai,
                amount: amountIn1,
                flags: inchDataForSwapResponse1.flags,
                srcReceiver: inchDataForSwapResponse1.srcReceiver
            }, inchDataForSwapResponse1.data,);
            const pathAfter = await inchSwapper.routePathsMap(BASE.usdbc, BASE.dai);

            expect(pathAfter.data.toString()).not.to.be.equal(pathBefore.data.toString());
            expect(pathAfter.amount.toString()).not.to.be.equal(pathBefore.amount.toString());
            expect(pathAfter.updateBlock.toString()).not.to.be.equal(pathBefore.updateBlock.toString());

            const pathDifferent = await inchSwapper.routePathsMap(BASE.dai, BASE.usdbc);

            expect(pathAfter.data.toString()).to.be.equal(pathDifferent.data.toString());
            expect(pathAfter.amount.toString()).to.be.equal(pathDifferent.amount.toString());



        });




    });

});

