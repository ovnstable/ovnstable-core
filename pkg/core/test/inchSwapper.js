const { expect } = require("chai");
const chai = require("chai");
const { deployments, ethers, getNamedAccounts, upgrades } = require("hardhat");
const { resetHardhat, createRandomWallet } = require("@overnight-contracts/common/utils/tests");
const hre = require("hardhat");
let { BASE } = require('@overnight-contracts/common/utils/assets');
const INCH_ROUTER_V5 = require("./InchRouterV5.json");
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach")

chai.use(require('chai-bignumber')());
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const { waffle } = require("hardhat");
const { transferETH, getChainId, transferAsset, getContract, getERC20, sleep } = require("@overnight-contracts/common/utils/script-utils");
const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { fromE6, toE6, toAsset, toE18 } = require("@overnight-contracts/common/utils/decimals");
const { default: axios } = require("axios");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { provider } = waffle;

describe("GlobalPayoutListener", function () {

    let pl;
    let testAccount;
    let inchDataForSwapResponse0;
    let inchDataForSwapResponse1;
    let amountIn0;
    let amountIn1;

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

            inchDataForSwapResponse0 = await getDataForSwap(
                await getChainId(),
                account,
                BASE.usdbc,
                BASE.dai,
                amountIn0,
                "",
                "");

            await inchSwapper.updatePath(BASE.usdbc, BASE.dai, inchDataForSwapResponse0.data, amountIn0, inchDataForSwapResponse0.flags, inchDataForSwapResponse0.srcReceiver);

            inchDataForSwapResponse1 = await getDataForSwap(
                await getChainId(),
                account,
                BASE.dai,
                BASE.usdbc,
                amountIn1,
                "",
                "");

            await inchSwapper.updatePath(BASE.dai, BASE.usdbc, inchDataForSwapResponse1.data, amountIn1, inchDataForSwapResponse1.flags, inchDataForSwapResponse1.srcReceiver);

        });

        it("check data and run with lower volume", async function () {
            const path = await inchSwapper.routePathsMap(BASE.usdbc, BASE.dai);

            expect(path.data.toString()).to.be.equal(inchDataForSwapResponse0.data);
            expect(path.amount.toString()).to.be.equal(amountIn0.toString());

            const usdbc = await getERC20("usdbc");
            const dai = await getERC20("dai");

            await transferAsset(BASE.usdbc, testAccount.address);

            const balanceBeforeUsdbc = await usdbc.balanceOf(testAccount.address);
            const balanceBeforeDai = await dai.balanceOf(testAccount.address);

            await (await usdbc.connect(testAccount).approve(inchSwapper.address, amountIn0)).wait();

            await (await inchSwapper.connect(testAccount).swap(account, BASE.usdbc, BASE.dai, amountIn0, 0)).wait(); // reverted with an unrecognized custom error (return data: 0x0262dde4)

            const balanceAfterUsdbc = await usdbc.balanceOf(account);
            const balanceAfterDai = await dai.balanceOf(account);

            console.log((balanceBeforeUsdbc - balanceAfterUsdbc).toString(), amountIn0 / 10, (balanceAfterDai - balanceBeforeDai).toString());

        });

        it("update same and check block and amount and data update ", async function () {
            const pathBefore = await inchSwapper.routePathsMap(BASE.usdbc, BASE.dai);

            expect(pathBefore.data.toString()).to.be.equal(inchDataForSwapResponse0.data);
            expect(pathBefore.amount.toString()).to.be.equal(amountIn0.toString());

            await inchSwapper.updatePath(BASE.usdbc, BASE.dai, inchDataForSwapResponse1.data, amountIn1, inchDataForSwapResponse1.flags, inchDataForSwapResponse1.srcReceiver);
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

async function getDataForSwap(chainId,
    strategyAddress,
    tokenIn,
    tokenOut,
    amountIn,
    protocols = "",
    connectors = "") {


    const swapParams = {
        fromTokenAddress: tokenIn,
        toTokenAddress: tokenOut,
        amount: amountIn,
        fromAddress: strategyAddress,
        destReceiver: strategyAddress,
        slippage: "15",
        disableEstimate: "true",
        allowPartialFill: "false",
        protocols: protocols,
        connectorTokens: connectors,
        usePatching: "true"
    };

    let baseUrl = 'https://api-overnight.1inch.io/v5.0';

    const url = `${baseUrl}/${chainId}/swap?` + (new URLSearchParams(swapParams)).toString();

    // console.log('[InchService] Request url: ' + url);

    const response = await axios.get(url, { headers: { "Accept-Encoding": "br" } });

    return getArgs(response);
}

function getArgs(transaction) {

    let decodedData;
    try {

        let iface = new ethers.utils.Interface(INCH_ROUTER_V5);

        decodedData = iface.parseTransaction({ data: transaction.data.tx.data, value: transaction.data.tx.value });
    } catch (e) {
        console.error("[InchService] decodedData error: " + e);
        return 0;
    }

    let args;

    args = {
        flags: decodedData.args.desc.flags,
        data: decodedData.args.data,
        srcReceiver: decodedData.args.desc.srcReceiver
    }
    return args;
}