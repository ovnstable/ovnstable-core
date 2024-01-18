const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {expect} = require("chai");
const hre = require("hardhat");
const {resetHardhat, createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const {getNamedAccounts, deployments, ethers} = require("hardhat");
const {ARBITRUM, OPTIMISM} = require("@overnight-contracts/common/utils/assets");
const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {toE18, fromE18, toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");

describe("AssetOracleOffChain", function () {

    let account;
    let testAccount;

    let oracle;
    let underlyingOracle;
    let ovnToken;

    sharedBeforeEach(async () => {
        await hre.run("compile");
        const { deployer } = await getNamedAccounts();

        account = deployer;
        testAccount = await createRandomWallet();
        await deployments.fixture(['TestAssetOracleOffchain']);

        oracle = await ethers.getContract('AssetOracleOffChain');
        ovnToken = await ethers.getContract('OvnToken');
        underlyingOracle = await ethers.getContract('MockPriceFeed');

        let params = {
            oracleUnderlyingAsset: underlyingOracle.address,
            underlyingAsset: OPTIMISM.usdc,
            roleManager: oracle.address,
            asset: ovnToken.address,
            minPriceUsd: toE18(0.9),
            maxPriceUsd: toE18(15),
            duration: 24 * 60 * 60,
        }

        await oracle.setParams(params);
        await oracle.grantRole(Roles.UNIT_ROLE, account);
    });


    describe('params', function (){

        it('assetDm', async function(){
            expect(await oracle.assetDm()).to.eq(toE18(1));
        });

        it('underlyingAssetDm', async function(){
            expect(await oracle.underlyingAssetDm()).to.eq(toE6(1));
        });
    });

    describe('updatePriceAssetUsd', function (){

        it('updated', async function(){
            let price = toE18(5);

            expect(await oracle.priceAssetUsd()).to.eq("0");
            await oracle.updatePriceAssetUsd(price);
            expect(await oracle.priceAssetUsd()).to.eq(price);

        });

        it('revert: minPriceUsd', async function(){
            await expectRevert(oracle.updatePriceAssetUsd(toE18(0.5)), 'minPriceUsd');
        });

        it('revert: maxPriceUsd', async function(){
            await expectRevert(oracle.updatePriceAssetUsd(toE18(50)), 'maxPriceUsd');
        });

        it('revert: Restricted to Unit', async function(){
            await expectRevert(oracle.connect(testAccount).updatePriceAssetUsd(toE18(10)), 'Restricted to Unit');
        });

        it('revert: Restricted to Unit', async function(){
            await expectRevert(oracle.connect(testAccount).updatePriceAssetUsd(toE18(10)), 'Restricted to Unit');
        });

    })


    describe('convert', function(){

        it('success underlyingAsset->asset', async function (){
            await underlyingOracle.setPrice(toE6(1));
            await oracle.updatePriceAssetUsd(toE18(10));
            let amountOut = fromE18(await oracle.convert(OPTIMISM.usdc, ovnToken.address, toE6(10)));
            expect(amountOut.toString()).to.eq('1');

            await underlyingOracle.setPrice(toE6(1));
            await oracle.updatePriceAssetUsd(toE18(1));
            amountOut = fromE18(await oracle.convert(OPTIMISM.usdc, ovnToken.address, toE6(1)));
            expect(amountOut.toString()).to.eq('1');

            await underlyingOracle.setPrice(toE6(10));
            await oracle.updatePriceAssetUsd(toE18(10));
            amountOut = fromE18(await oracle.convert(OPTIMISM.usdc, ovnToken.address, toE6(1)));
            expect(amountOut.toString()).to.eq('1');
        });

        it('success asset->underlyingAsset', async function (){
            await underlyingOracle.setPrice(toE6(1));
            await oracle.updatePriceAssetUsd(toE18(10));
            let amountOut = fromE6(await oracle.convert(ovnToken.address, OPTIMISM.usdc, toE18(1)));
            expect(amountOut.toString()).to.eq('10');

            await underlyingOracle.setPrice(toE6(1));
            await oracle.updatePriceAssetUsd(toE18(1));
            amountOut = fromE6(await oracle.convert(ovnToken.address, OPTIMISM.usdc, toE18(1)));
            expect(amountOut.toString()).to.eq('1');

            await underlyingOracle.setPrice(toE6(10));
            await oracle.updatePriceAssetUsd(toE18(10));
            amountOut = fromE6(await oracle.convert(ovnToken.address, OPTIMISM.usdc, toE18(1)));
            expect(amountOut.toString()).to.eq('1');
        });

        it('revert: price is old', async function (){

            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send('evm_mine');

            await expectRevert(oracle.convert(OPTIMISM.usdc, ovnToken.address, toE6(10)), 'price is old');

            await oracle.updatePriceAssetUsd(toE18(1));

            await oracle.convert(OPTIMISM.usdc, ovnToken.address, toE6(10));

        });

        it('assetIn not acceptable', async function (){
            await expectRevert(oracle.convert(OPTIMISM.dai, ovnToken.address, toE18(10)), 'assetIn not acceptable');
        });

        it('assetOut not acceptable', async function (){
            await expectRevert(oracle.convert(OPTIMISM.usdc, OPTIMISM.dai, toE18(10)), 'assetOut not acceptable');
        });

        it('convertDuration: not support', async function (){
            await expectRevert(oracle.convertDuration(OPTIMISM.usdc, ovnToken.address, toE18(10), 10), 'not support');
        });

    })


});
