const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const {constants} = require('@openzeppelin/test-helpers');
const {ZERO_ADDRESS} = constants;

const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");


describe("Swapper", function () {

    let account;
    let secondAccount;
    let swapper;
    let mockSwapPlace;


    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["Swapper", "MockSwapPlace"]);

        const {deployer, anotherAccount} = await getNamedAccounts();
        account = deployer;
        secondAccount = anotherAccount;
        swapper = await ethers.getContract("Swapper");
        mockSwapPlace = await ethers.getContract("MockSwapPlace");

    });


    it("checkEmpty", async function () {

        let params = {
            tokenIn: POLYGON.usdc,
            tokenOut: POLYGON.usdt,
            amountIn: "1000",
            amountOutMin: 0,
            partsAmount: 10,
        };

        await expectRevert(swapper.swapPath(params), "Cant find swapPlace by tokens");

    });

    it("register swap info", async function () {
        let tmpSwapPlaceType = "BalancerSwapPlace";
        let tmpPool = "0x3333333333333333333333333333333333333333";

        let swapPlaceLength1 = await swapper.swapPlaceInfoLength(POLYGON.usdc, POLYGON.usdt);
        expect(swapPlaceLength1).eq(0);

        let swapPlaceLength2 = await swapper.swapPlaceInfoLength(POLYGON.usdt, POLYGON.usdc);
        expect(swapPlaceLength2).eq(0);

        let swapPlaceType = await swapper.poolSwapPlaceTypes(tmpPool);
        expect(swapPlaceType).eq("");

        await swapper.swapPlaceInfoRegister(
            POLYGON.usdc,
            POLYGON.usdt,
            tmpPool,
            tmpSwapPlaceType,
        );


        swapPlaceType = await swapper.poolSwapPlaceTypes(tmpPool);
        expect(swapPlaceType).eq(tmpSwapPlaceType);

        swapPlaceLength1 = await swapper.swapPlaceInfoLength(POLYGON.usdc, POLYGON.usdt);
        expect(swapPlaceLength1).eq(1);

        swapPlaceLength2 = await swapper.swapPlaceInfoLength(POLYGON.usdt, POLYGON.usdc);
        expect(swapPlaceLength2).eq(1);


        let swapPlace1 = await swapper.swapPlaceInfos(POLYGON.usdc, POLYGON.usdt, 0);
        expect(swapPlace1.pool).eq(tmpPool);

        let swapPlace2 = await swapper.swapPlaceInfos(POLYGON.usdt, POLYGON.usdc, 0);
        expect(swapPlace2.pool).eq(tmpPool);

        await expectRevert(swapper.swapPlaceInfoRegister(
            POLYGON.usdc,
            POLYGON.usdt,
            tmpPool,
            tmpSwapPlaceType,
        ), "Already in list");


        await swapper.swapPlaceInfoRemove(
            POLYGON.usdc,
            POLYGON.usdt,
            tmpPool,
        );


        swapPlaceLength1 = await swapper.swapPlaceInfoLength(POLYGON.usdc, POLYGON.usdt);
        expect(swapPlaceLength1).eq(0);

        swapPlaceLength2 = await swapper.swapPlaceInfoLength(POLYGON.usdt, POLYGON.usdc);
        expect(swapPlaceLength2).eq(0);


        await expectRevert(swapper.swapPlaceInfoRemove(
            POLYGON.usdc,
            POLYGON.usdt,
            tmpPool,
        ), "Cant remove from empty array");

    });

    it("register swap place", async function () {

        let tmpSwapPlaceType = "MockSwapPlace";
        let tmpSwapPlace = mockSwapPlace.address;

        let swapPlace = await swapper.swapPlaces(tmpSwapPlaceType);
        expect(swapPlace).eq(ZERO_ADDRESS);

        await swapper.swapPlaceRegister(
            tmpSwapPlaceType,
            tmpSwapPlace,
        );

        swapPlace = await swapper.swapPlaces(tmpSwapPlaceType);
        expect(swapPlace).eq(tmpSwapPlace);

        await swapper.swapPlaceRemove(tmpSwapPlaceType);

        swapPlace = await swapper.swapPlaces(tmpSwapPlaceType);
        expect(swapPlace).eq(ZERO_ADDRESS);

    });

    describe("checkPath", function () {
        let tmpSwapPlaceType = "MockSwapPlace";
        let tmpSwapPlace;

        let tmpPool1 = "0x1111111111111111111111111111111111111111";
        let tmpPool2 = "0x2222222222222222222222222222222222222222";
        let tmpPool3 = "0x3333333333333333333333333333333333333333";

        sharedBeforeEach('add swap places', async () => {
            tmpSwapPlace = mockSwapPlace.address;

            await swapper.swapPlaceRegister(
                tmpSwapPlaceType,
                tmpSwapPlace,
            );

            await swapper.swapPlaceInfoRegister(
                POLYGON.usdc,
                POLYGON.usdt,
                tmpPool1,
                tmpSwapPlaceType,
            );
            await swapper.swapPlaceInfoRegister(
                POLYGON.usdc,
                POLYGON.usdt,
                tmpPool2,
                tmpSwapPlaceType,
            );
            await swapper.swapPlaceInfoRegister(
                POLYGON.usdc,
                POLYGON.usdt,
                tmpPool3,
                tmpSwapPlaceType,
            );
        });


        it("checkPath 3", async function () {

            let params = {
                tokenIn: POLYGON.usdc,
                tokenOut: POLYGON.usdt,
                amountIn: 1000,
                amountOutMin: 0,
                partsAmount: 3,
            };

            let path = await swapper.swapPath(params);
            // console.log(JSON.stringify(path, null, 2))


            let totalAmountIn = 0;
            for (let i = 0; i < path.length; i++) {
                let swapRoute = path[i];
                totalAmountIn += parseInt(swapRoute.amountIn.toString());
                // console.log(`${swapRoute.amountIn} -> ${swapRoute.amountOut} on ${swapRoute.pool}`)
            }

            expect(totalAmountIn).eq(params.amountIn);

            expect(path[0].amountIn).eq(333);
            expect(path[1].amountIn).eq(333);
            expect(path[2].amountIn).eq(334); // plus delta

            expect(path[0].amountOut).eq(322);
            expect(path[1].amountOut).eq(321);
            expect(path[2].amountOut).eq(320);

            expect(path[0].pool).eq(tmpPool1);
            expect(path[1].pool).eq(tmpPool2);
            expect(path[2].pool).eq(tmpPool3);

        });

        it("checkPath 10", async function () {

            let params = {
                tokenIn: POLYGON.usdc,
                tokenOut: POLYGON.usdt,
                amountIn: 1000,
                amountOutMin: 0,
                partsAmount: 10,
            };

            let path = await swapper.swapPath(params);
            // console.log(JSON.stringify(path, null, 2))


            let totalAmountIn = 0;
            for (let i = 0; i < path.length; i++) {
                let swapRoute = path[i];
                totalAmountIn += parseInt(swapRoute.amountIn.toString());
                // console.log(`${swapRoute.amountIn} -> ${swapRoute.amountOut} on ${swapRoute.pool}`)
            }

            expect(totalAmountIn).eq(params.amountIn);

            expect(path[0].amountIn).eq(400);
            expect(path[1].amountIn).eq(300);
            expect(path[2].amountIn).eq(300);

            expect(path[0].amountOut).eq(383);
            expect(path[1].amountOut).eq(290);
            expect(path[2].amountOut).eq(288);

            expect(path[0].pool).eq(tmpPool1);
            expect(path[1].pool).eq(tmpPool2);
            expect(path[2].pool).eq(tmpPool3);

        });
        // // uncomment to see gas usage
        // it("check path estimate gas", async function () {
        //
        //     let params = {
        //         tokenIn: POLYGON.usdc,
        //         tokenOut: POLYGON.usdt,
        //         amountIn: 1000,
        //         amountOutMin: 0,
        //         partsAmount: 1,
        //     };
        //
        //     for (let i = 1; i <= 100; i++) {
        //         params.partsAmount = i;
        //         let estGas = await swapper.estimateGas.swapPath(params);
        //         console.log(`${i} estGas: ${estGas.toString()}`)
        //     }
        //
        // });

    });

});




