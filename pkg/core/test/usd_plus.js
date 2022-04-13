const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const {smock} = require("@defi-wonderland/smock");
const BN = require("bn.js");
const {constants} = require('@openzeppelin/test-helpers');
const {ZERO_ADDRESS} = constants;
const {logGas} = require("../../common/utils/gas");

const hre = require("hardhat");
const expectRevert = require("../../common/utils/expectRevert");
const {toOvn, fromOvn} = require("../../common/utils/decimals");

chai.use(smock.matchers);

describe("Liquidity Index", function () {

    let account;
    let usdPlus;


    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["UsdPlusToken"]);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        usdPlus = await ethers.getContract("UsdPlusToken");
        usdPlus.setExchanger(account);
    });


    it("Mint with default liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await logGas(usdPlus.mint(account, 1), "UsdPlusToken", "mint");

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);
        expect(scaledBalance).to.equals(1000000000); // stored as rays

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(1);

    });

    it("Mint with half liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 1);

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);
        expect(scaledBalance).to.equals(2000000000); // stored as rays

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(1);

    });

    it("Mint with double liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 1);

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);
        expect(scaledBalance).to.equals(500000000); // stored as rays

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(1);

    });

    it("Burn with default liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 2);
        await usdPlus.burn(account, 1);

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);
        expect(scaledBalance).to.equals(1000000000); // stored as rays

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(1);

    });

    it("Burn with half liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 2);
        await usdPlus.burn(account, 1);

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);
        expect(scaledBalance).to.equals(2000000000); // stored as rays

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(1);

    });

    it("Burn with double liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 2);
        await usdPlus.burn(account, 1);

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);
        expect(scaledBalance).to.equals(500000000); // stored as rays

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(1);

    });

    it("Mint burn with complex liq index", async function () {

        let newLiquidityIndex = new BN("1022809482605723771055655202");
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 234141374);
        await usdPlus.burn(account, 93143413);

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(140997961);

    });


    it("Mint burn with changing liq index", async function () {

        let firstLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(firstLiquidityIndex.toString());

        await usdPlus.mint(account, 16);

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(16)

        let secondLiquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(secondLiquidityIndex.toString());

        balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(64);

        await usdPlus.burn(account, 16);

        balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(48);

        await usdPlus.setLiquidityIndex(firstLiquidityIndex.toString());

        balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(12);

    });


    it("Total supply with default liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 2);

        let scaledTotalSupply = await usdPlus.scaledTotalSupply();
        console.log("ScaledTotalSupply usdPlus: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(2000000000); // stored as rays

        let totalSupply = await usdPlus.totalSupply();
        console.log("TotalSupply usdPlus: " + totalSupply);
        expect(totalSupply).to.equals(2);

        await usdPlus.burn(account, 1);

        scaledTotalSupply = await usdPlus.scaledTotalSupply();
        console.log("ScaledTotalSupply usdPlus: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(1000000000); // stored as rays

        totalSupply = await usdPlus.totalSupply();
        console.log("TotalSupply usdPlus: " + totalSupply);
        expect(totalSupply).to.equals(1);

    });

    it("Total supply with half liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 2);

        let scaledTotalSupply = await usdPlus.scaledTotalSupply();
        console.log("ScaledTotalSupply usdPlus: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(4000000000); // stored as rays

        let totalSupply = await usdPlus.totalSupply();
        console.log("TotalSupply usdPlus: " + totalSupply);
        expect(totalSupply).to.equals(2);

        await usdPlus.burn(account, 1);

        scaledTotalSupply = await usdPlus.scaledTotalSupply();
        console.log("ScaledTotalSupply usdPlus: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(2000000000); // stored as rays

        totalSupply = await usdPlus.totalSupply();
        console.log("TotalSupply usdPlus: " + totalSupply);
        expect(totalSupply).to.equals(1);

    });

    it("Total supply with double liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 2);

        let scaledTotalSupply = await usdPlus.scaledTotalSupply();
        console.log("ScaledTotalSupply usdPlus: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(1000000000); // stored as rays

        let totalSupply = await usdPlus.totalSupply();
        console.log("TotalSupply usdPlus: " + totalSupply);
        expect(totalSupply).to.equals(2);

        await usdPlus.burn(account, 1);

        scaledTotalSupply = await usdPlus.scaledTotalSupply();
        console.log("ScaledTotalSupply usdPlus: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(500000000); // stored as rays

        totalSupply = await usdPlus.totalSupply();
        console.log("TotalSupply usdPlus: " + totalSupply);
        expect(totalSupply).to.equals(1);

    });

    it("Token owners added/removed", async function () {

        let newLiquidityIndex = new BN("1022809482605723771055655202");
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        let ownerLength;
        ownerLength = await usdPlus.ownerLength();
        console.log("ownerLength usdPlus: " + ownerLength);
        expect(ownerLength).to.equals(0);

        await usdPlus.mint(account, 93143413);

        ownerLength = await usdPlus.ownerLength();
        console.log("ownerLength usdPlus: " + ownerLength);
        expect(ownerLength).to.equals(1);

        await usdPlus.burn(account, 93143413);

        ownerLength = await usdPlus.ownerLength();
        console.log("ownerLength usdPlus: " + ownerLength);
        expect(ownerLength).to.equals(0);

    });

    it("Token transfer", async function () {
        const [owner, tmpUser] = await ethers.getSigners();

        let firstLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(firstLiquidityIndex.toString());

        await usdPlus.mint(account, 16);

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(16)

        await usdPlus.transfer(tmpUser.address, 10);

        balance = await usdPlus.balanceOf(tmpUser.address);
        console.log("tmpUser Balance usdPlus: " + balance);
        expect(balance).to.equals(10);

    });

    it("Token transferFrom", async function () {
        const [owner, tmpUser] = await ethers.getSigners();

        let newLiquidityIndex = new BN("1022809482605723771055655202");
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 93143413);

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(93143413)

        await usdPlus.approve(tmpUser.address, 3143413);

        let allowance = await usdPlus.allowance(account, tmpUser.address);
        console.log("allowance usdPlus: " + allowance);
        expect(allowance).to.equals(3143413)

        await usdPlus.connect(tmpUser).transferFrom(account, tmpUser.address, 1143413);

        balance = await usdPlus.balanceOf(tmpUser.address);
        console.log("tmpUser Balance usdPlus: " + balance);
        expect(balance).to.equals(1143413);

        balance = await usdPlus.balanceOf(account);
        console.log("account Balance usdPlus: " + balance);
        expect(balance).to.equals(92000000);

        allowance = await usdPlus.allowance(account, tmpUser.address);
        console.log("allowance usdPlus: " + allowance);
        expect(allowance).to.equals(2000000)

        await expect(usdPlus.connect(tmpUser).transferFrom(account, tmpUser.address, 2100000)).to.be.reverted;

    });

    it("Token approve", async function () {

        const [owner, tmpUser] = await ethers.getSigners();

        let newLiquidityIndex = new BN("1022809482605723771055655202");
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());
        await usdPlus.mint(account, toOvn(100));

        let balance = fromOvn(await usdPlus.balanceOf(account));
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(100)

        await usdPlus.approve(tmpUser.address, toOvn(100));

        let allowance = fromOvn(await usdPlus.allowance(account, tmpUser.address));
        console.log("allowance usdPlus: " + allowance);
        expect(allowance).to.equals(100);

    });
});


describe("Total Mint/Burn/Supply", function () {

    let usdPlus;
    let account;

    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["UsdPlusToken"]);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        usdPlus = await ethers.getContract("UsdPlusToken");
        usdPlus.setExchanger(account);
    });


    it("Total Supply", async function () {

        await usdPlus.setLiquidityIndex(new BN("1022809482605723771055655202").toString());
        await usdPlus.mint(account, toOvn(100));

        let balance = fromOvn(await usdPlus.totalSupply());
        expect(balance).to.equals(100)

        await usdPlus.setLiquidityIndex(new BN("1032809482605723771055655202").toString());

        balance = fromOvn(await usdPlus.totalSupply());
        expect(balance).to.equals(100.977699)
    });

    it("Total Mint", async function () {

        await usdPlus.setLiquidityIndex(new BN("1022809482605723771055655202").toString());
        await usdPlus.mint(account, toOvn(100));

        let balance = fromOvn(await usdPlus.totalMint());
        expect(balance).to.equals(100);

        await usdPlus.setLiquidityIndex(new BN("1032809482605723771055655202").toString());

        balance = fromOvn(await usdPlus.totalMint());
        expect(balance).to.equals(100.977699)

    });

    it("Total Burn", async function () {

        await usdPlus.setLiquidityIndex(new BN("1022809482605723771055655202").toString());
        await usdPlus.mint(account, toOvn(100));
        await usdPlus.burn(account, toOvn(50));

        let balance = fromOvn(await usdPlus.totalBurn());
        expect(balance).to.equals(50);


        await usdPlus.setLiquidityIndex(new BN("1032809482605723771055655202").toString());

        balance = fromOvn(await usdPlus.totalBurn());
        expect(balance).to.equals(50.48885)
    });

});

describe("ERC20", function () {

    let account;
    let usdPlus;
    let recipient;


    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["UsdPlusToken"]);

        const accounts = await getNamedAccounts();
        account = accounts.deployer;
        usdPlus = await ethers.getContract("UsdPlusToken");
        usdPlus.setExchanger(account);

        const [owner, tmpUser] = await ethers.getSigners();

        recipient = tmpUser;
    });

    it('has a name', async function () {
        expect(await usdPlus.name()).to.equal('USD+');
    });

    it('has a symbol', async function () {
        expect(await usdPlus.symbol()).to.equal('USD+');
    });

    it('has 6 decimals', async function () {
        expect(await usdPlus.decimals()).to.equal(6);
    });


    describe("_transfer", function () {

        it('transfer', async function () {

            await usdPlus.mint(account, 50);
            await usdPlus.transfer(recipient.address, 50);

            expect(await usdPlus.balanceOf(recipient.address)).to.eq(50)
            expect(await usdPlus.balanceOf(account)).to.eq(0)
        });

        describe('when the sender is the zero address', function () {
            it('reverts', async function () {
                await expectRevert(usdPlus.transferFrom(ZERO_ADDRESS, recipient.address, 50),
                    'ERC20: transfer from the zero address',
                );
            });
        });

        it('amount exceeds allowance', async function () {
            const [owner, tmpUser] = await ethers.getSigners();

            await usdPlus.mint(account, 50);
            await expectRevert(usdPlus.connect(tmpUser).transferFrom(account, tmpUser.address, 50),
                'UsdPlusToken: transfer amount exceeds allowance',
            );
        });

    });

    describe("approve", function () {

        it('max', async function () {
            const [owner, tmpUser] = await ethers.getSigners();

            let uint256Max = new BN(2).pow(new BN(256)).subn(1);
            await usdPlus.approve(tmpUser.address, uint256Max.toString());

            expect((await usdPlus.allowance(account, tmpUser.address)).toString()).to.eq(uint256Max.toString())
        });

        it('transfer', async function () {
            const [owner, tmpUser] = await ethers.getSigners();

            await usdPlus.mint(account, 50);
            await usdPlus.approve(tmpUser.address, 50);

            expect(await usdPlus.balanceOf(recipient.address)).to.eq(0)
            expect(await usdPlus.balanceOf(account)).to.eq(50)

            await usdPlus.connect(tmpUser).transferFrom(account, tmpUser.address, 50);

            expect(await usdPlus.balanceOf(account)).to.eq(0)
            expect(await usdPlus.balanceOf(recipient.address)).to.eq(50)
        });

        it('increaseAllowance', async function () {
            const [owner, tmpUser] = await ethers.getSigners();

            await usdPlus.mint(account, 50);
            await usdPlus.increaseAllowance(tmpUser.address, 25);
            await usdPlus.increaseAllowance(tmpUser.address, 25);

            expect(await usdPlus.balanceOf(recipient.address)).to.eq(0)
            expect(await usdPlus.balanceOf(account)).to.eq(50)

            await usdPlus.connect(tmpUser).transferFrom(account, tmpUser.address, 50);

            expect(await usdPlus.balanceOf(account)).to.eq(0)
            expect(await usdPlus.balanceOf(recipient.address)).to.eq(50)
        });

        it('decreaseAllowance', async function () {
            const [owner, tmpUser] = await ethers.getSigners();

            await usdPlus.mint(account, 50);
            await usdPlus.increaseAllowance(tmpUser.address, 75);
            await usdPlus.decreaseAllowance(tmpUser.address, 25);

            expect(await usdPlus.balanceOf(recipient.address)).to.eq(0)
            expect(await usdPlus.balanceOf(account)).to.eq(50)

            await usdPlus.connect(tmpUser).transferFrom(account, tmpUser.address, 50);

            expect(await usdPlus.balanceOf(account)).to.eq(0)
            expect(await usdPlus.balanceOf(recipient.address)).to.eq(50)
        });

        describe('when the owner is the zero address', function () {
            it('reverts', async function () {
                await expectRevert(usdPlus.approve(ZERO_ADDRESS, 50),
                    'ERC20: approve to the zero address',
                );
            });
        });


    });


    describe('_mint', function () {
        const amount = 50;
        it('rejects a null account', async function () {
            await expectRevert(usdPlus.mint(ZERO_ADDRESS, amount), 'ERC20: mint to the zero address')
        });

        describe('for a non zero account', function () {
            beforeEach('minting', async function () {
                this.receipt = await usdPlus.mint(recipient.address, amount);
            });

            it('increments totalSupply', async function () {
                await usdPlus.mint(recipient.address, 1);
                expect(await usdPlus.totalSupply()).to.equal(amount + 1);
            });

            it('increments recipient balance', async function () {
                expect(await usdPlus.balanceOf(recipient.address)).to.equal(amount);
            });

            it('emits Transfer event', async function () {
                let events = await usdPlus.queryFilter(usdPlus.filters.Transfer(ZERO_ADDRESS, recipient.address), this.receipt.blockNumber - 1, this.receipt.blockNumber + 1);
                let value = events[0].args[2];
                expect(value.toString()).to.equal("50");
            });
        });
    });
});

