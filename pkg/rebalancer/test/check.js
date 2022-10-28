const hre = require("hardhat");
const {waffle} = require("hardhat");
const {getAbi} = require("@overnight-contracts/common/utils/script-utils");
const {expect} = require("chai");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const fs = require("fs");
const {deployContract, deployMockContract, provider} = waffle;
const chai = require("chai");
chai.use(require('chai-bignumber')());

describe("RebalancerPlus", function () {

    let rebalancerPlus;
    let mockVault;
    let mockUniswap;
    let mockLinearPool;
    let mockWrappedUsdPlus;
    let mockUsdc;
    let deployer;

    sharedBeforeEach("deploy contracts", async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        [deployer] = provider.getWallets();

        // reload after recompile
        let IERC20 = await getAbi('IERC20');
        let IVault = await getAbi('IVault');
        let IUniswapV3Pair = await getAbi('IUniswapV3Pair');
        let LinearPool = await getAbi('LinearPool');
        let IWrappedUsdPlusToken = await getAbi('IWrappedUsdPlusToken');
        let RebalancerPlus = JSON.parse(fs.readFileSync('./artifacts/contracts/RebalancerPlus.sol/RebalancerPlus.json'))

        mockUsdc = await deployMockContract(deployer, IERC20);
        mockVault = await deployMockContract(deployer, IVault);
        mockUniswap = await deployMockContract(deployer, IUniswapV3Pair);
        mockWrappedUsdPlus = await deployMockContract(deployer, IWrappedUsdPlusToken);
        mockLinearPool = await deployMockContract(deployer, LinearPool);

        console.log("mockUsdc: " + mockUsdc.address);
        console.log("mockVault: " + mockVault.address);
        console.log("mockUniswap: " + mockUniswap.address);
        console.log("mockWrappedUsdPlus: " + mockWrappedUsdPlus.address);
        console.log("mockLinearPool: " + mockLinearPool.address);

        // called on constructor, so mock here
        await mockUsdc.mock.approve.returns(true);

        rebalancerPlus = await deployContract(deployer, RebalancerPlus, [
            mockVault.address,
            mockUsdc.address,
            mockUniswap.address,
            5
        ]);

    });


    it("approveAmountRequirement", async function () {
        await mockLinearPool.mock.getSwapFeePercentage.returns(500000000000000); // 0.05% * 10^18
        await mockLinearPool.mock.getTargets.returns(250000, 500000); // [250k, 500k]

        await mockLinearPool.mock.getScalingFactors.returns([
            "1000000000000000000",
            "1000000000000000000"
        ]);
        await mockLinearPool.mock.getMainIndex.returns(0);
        await mockLinearPool.mock.getWrappedIndex.returns(1);
        await mockLinearPool.mock.getPoolId.returns(
            "0x0000000000000000000000000000000000000000000000000000000000000001"
        );

        await mockVault.mock.getPoolTokens.returns([
            mockUsdc.address,
            mockWrappedUsdPlus.address,
        ],
        [
            1000000, 1000000 // current balances [1kk, 1kk]
        ],
            0 // lastChangeBlock
        );

        // fee = (1kk - 500k) * getSwapFeePercentage =  250. При возврате в коридор на них уменьшается объем
        // поэтому необходимо оплатить свапнуть дельту 1kk - 500k и уменьшить на величину возвращаемой комиссии
        await mockWrappedUsdPlus.mock.convertToAssets
            .withArgs(499750)
            .returns(550000);

        // need 550k USDC to move current 1kk to 500k upper target
        let amount = await rebalancerPlus.callStatic.approveAmountRequirement(mockLinearPool.address, 0);
        expect(amount[0]).to.equal(550000);

        // 100 комиссии компенсировалось
        await mockWrappedUsdPlus.mock.convertToAssets
            .withArgs(199900)
            .returns(250000);

        // need 250k USDC to move 1kk to 800k desired target
        amount = await rebalancerPlus.callStatic.approveAmountRequirement(mockLinearPool.address, 800000);
        expect(amount[0]).to.equal(250000);


        // need 200k USDC to move 1kk to 1.2kk desired
        amount = await rebalancerPlus.callStatic.approveAmountRequirement(mockLinearPool.address, 1200000);
        expect(amount[0]).to.equal(200000);



        await mockVault.mock.getPoolTokens.returns([
            mockUsdc.address,
            mockWrappedUsdPlus.address,
        ], [
            100000, 1000000 // current balances [100k, 1kk]
        ]);

        // need 150k USDC to move 100k to 250k lower target
        amount = await rebalancerPlus.callStatic.approveAmountRequirement(mockLinearPool.address, 0);
        expect(amount[0]).to.equal(150000);


        await mockVault.mock.getPoolTokens.returns([
            mockUsdc.address,
            mockWrappedUsdPlus.address,
        ], [
            400000, 1000000 // current balances [400k, 1kk]
        ]);

        // need 300k USDC to move 400k to 100k under lower target
        // и еще комиссия 75 = (400k - 250k) * 0.05% = 75 (400k - текущее, 250k - нижняя граница, комиссия на разницу)
        await mockWrappedUsdPlus.mock.convertToAssets
            .withArgs(300075)
            .returns(350000);

        amount = await rebalancerPlus.callStatic.approveAmountRequirement(mockLinearPool.address, 100000);
        expect(amount[0]).to.equal(350000);

    });

});
