const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {expect} = require("chai");
const hre = require("hardhat");
const {resetHardhat, createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const {getNamedAccounts, deployments, ethers} = require("hardhat");
const {ARBITRUM, OPTIMISM} = require("@overnight-contracts/common/utils/assets");
const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {toE18, fromE18, toE6, fromE6, toE8} = require("@overnight-contracts/common/utils/decimals");

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
            roleManager: oracle.address,
            asset: ovnToken.address,
            minPriceUsd: toE8(0.9),
            maxPriceUsd: toE8(25),
            duration: 24 * 60 * 60,
        }

        await oracle.setParams(params);
        await oracle.grantRole(Roles.UNIT_ROLE, account);

        let item = {
            assetAddress: OPTIMISM.usdc,
            oracle: underlyingOracle.address,
            dm: 0
        }

        console.log(`setUnderlyingItem ${JSON.stringify(item)}`);
        await oracle.setUnderlyingItem(item);
        await oracle.updatePriceAssetUsd(toE8(1));

    });


    describe('params', function (){

        it('assetDm', async function(){
            expect(await oracle.assetDm()).to.eq(toE18(1));
        });

        it('underlyingItem', async function(){

            let item = await oracle.underlyingItems(OPTIMISM.usdc);
            expect(item.oracle).to.eq(underlyingOracle.address);
            expect(item.assetAddress).to.eq(OPTIMISM.usdc);
            expect(item.dm).to.eq(toE6(1));
        });
    });

    describe('updatePriceAssetUsd', function (){

        it('updated', async function(){
            let price = toE8(5);

            expect(await oracle.priceAssetUsd()).to.eq("100000000");
            await oracle.updatePriceAssetUsd(price);
            expect(await oracle.priceAssetUsd()).to.eq(price);

        });

        it('revert: minPriceUsd', async function(){
            await expectRevert(oracle.updatePriceAssetUsd(toE8(0.5)), 'minPriceUsd');
        });

        it('revert: maxPriceUsd', async function(){
            await expectRevert(oracle.updatePriceAssetUsd(toE8(50)), 'maxPriceUsd');
        });

        it('revert: Restricted to Unit', async function(){
            await expectRevert(oracle.connect(testAccount).updatePriceAssetUsd(toE8(10)), 'Restricted to Unit');
        });

        it('revert: Restricted to Unit', async function(){
            await expectRevert(oracle.connect(testAccount).updatePriceAssetUsd(toE8(10)), 'Restricted to Unit');
        });

    })


    describe('convert', function(){


        it('fix: underlyingAsset->asset', async function(){

            await underlyingOracle.setPrice(toE8(1));
            await oracle.updatePriceAssetUsd(toE8(17));
            let amountOut = await oracle.convert(OPTIMISM.usdc, ovnToken.address, 46237033);
            expect(amountOut.toString()).to.eq('2719825470588235294');
        });

        it('success underlyingAsset->asset', async function (){
            await underlyingOracle.setPrice(toE8(1));
            await oracle.updatePriceAssetUsd(toE8(10));
            let amountOut = fromE18(await oracle.convert(OPTIMISM.usdc, ovnToken.address, toE6(10)));
            expect(amountOut.toString()).to.eq('1');

            await underlyingOracle.setPrice(toE8(1));
            await oracle.updatePriceAssetUsd(toE8(1));
            amountOut = fromE18(await oracle.convert(OPTIMISM.usdc, ovnToken.address, toE6(1)));
            expect(amountOut.toString()).to.eq('1');

            await underlyingOracle.setPrice(toE8(10));
            await oracle.updatePriceAssetUsd(toE8(10));
            amountOut = fromE18(await oracle.convert(OPTIMISM.usdc, ovnToken.address, toE6(1)));
            expect(amountOut.toString()).to.eq('1');
        });

        it('success asset->underlyingAsset', async function (){
            await underlyingOracle.setPrice(toE8(1));
            await oracle.updatePriceAssetUsd(toE8(10));
            let amountOut = fromE6(await oracle.convert(ovnToken.address, OPTIMISM.usdc, toE18(1)));
            expect(amountOut.toString()).to.eq('10');

            await underlyingOracle.setPrice(toE8(1));
            await oracle.updatePriceAssetUsd(toE8(1));
            amountOut = fromE6(await oracle.convert(ovnToken.address, OPTIMISM.usdc, toE18(1)));
            expect(amountOut.toString()).to.eq('1');

            await underlyingOracle.setPrice(toE8(10));
            await oracle.updatePriceAssetUsd(toE8(10));
            amountOut = fromE6(await oracle.convert(ovnToken.address, OPTIMISM.usdc, toE18(1)));
            expect(amountOut.toString()).to.eq('1');
        });



        it('item is empty', async function (){
            await expectRevert(oracle.convert(OPTIMISM.dai, ovnToken.address, toE18(10)), 'item is empty');
        });

        it('assetIn/assetOut not acceptable', async function (){
            await expectRevert(oracle.convert(OPTIMISM.usdc, OPTIMISM.dai, toE18(10)), 'assetIn/assetOut not acceptable');
        });

        it('assetIn/assetOut not acceptable', async function (){
            await expectRevert(oracle.convert(OPTIMISM.ovn, OPTIMISM.dai, toE18(10)), 'assetIn/assetOut not acceptable');
        });

        it('convertDuration: not support', async function (){
            await expectRevert(oracle.convertDuration(OPTIMISM.usdc, ovnToken.address, toE18(10), 10), 'not support');
        });

        it('revert: price is old', async function (){

            await ethers.provider.send("evm_increaseTime", [25 * 60 * 60]);
            await ethers.provider.send('evm_mine');

            await expectRevert(oracle.convert(OPTIMISM.usdc, ovnToken.address, toE6(10)), 'price is old');

            await oracle.updatePriceAssetUsd(toE8(1));

            await oracle.convert(OPTIMISM.usdc, ovnToken.address, toE6(10));

        });
    })


});
