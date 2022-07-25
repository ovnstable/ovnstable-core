const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const {constants} = require('@openzeppelin/test-helpers');
const {ZERO_ADDRESS} = constants;
const {logGas} = require("@overnight-contracts/common/utils/gas");

const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");

const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");


// Copy from USD+ tests

describe("Liquidity Index", function () {

    let account;
    let rebase;


    sharedBeforeEach('deploy token', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["RebaseToken"]);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        rebase = await ethers.getContract("RebaseToken");
        await rebase.setExchanger(account);
    });


    it("Mint with default liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());

        await logGas(rebase.mint(account, 1), "RebaseToken", "mint");

        let scaledBalance = await rebase.scaledBalanceOf(account);
        console.log("ScaledBalance rebase: " + scaledBalance);
        expect(scaledBalance).to.equals(1000000000); // stored as rays

        let balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(1);

    });

    it("Mint with half liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());

        await rebase.mint(account, 1);

        let scaledBalance = await rebase.scaledBalanceOf(account);
        console.log("ScaledBalance rebase: " + scaledBalance);
        expect(scaledBalance).to.equals(2000000000); // stored as rays

        let balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(1);

    });

    it("Mint with double liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());

        await rebase.mint(account, 1);

        let scaledBalance = await rebase.scaledBalanceOf(account);
        console.log("ScaledBalance rebase: " + scaledBalance);
        expect(scaledBalance).to.equals(500000000); // stored as rays

        let balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(1);

    });

    it("Burn with default liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());

        await rebase.mint(account, 2);
        await rebase.burn(account, 1);

        let scaledBalance = await rebase.scaledBalanceOf(account);
        console.log("ScaledBalance rebase: " + scaledBalance);
        expect(scaledBalance).to.equals(1000000000); // stored as rays

        let balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(1);

    });

    it("Burn with half liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());

        await rebase.mint(account, 2);
        await rebase.burn(account, 1);

        let scaledBalance = await rebase.scaledBalanceOf(account);
        console.log("ScaledBalance rebase: " + scaledBalance);
        expect(scaledBalance).to.equals(2000000000); // stored as rays

        let balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(1);

    });

    it("Burn with double liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());

        await rebase.mint(account, 2);
        await rebase.burn(account, 1);

        let scaledBalance = await rebase.scaledBalanceOf(account);
        console.log("ScaledBalance rebase: " + scaledBalance);
        expect(scaledBalance).to.equals(500000000); // stored as rays

        let balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(1);

    });

    it("Mint burn with complex liq index", async function () {

        let newLiquidityIndex = new BN("1022809482605723771055655202");
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());

        await rebase.mint(account, 234141374);
        await rebase.burn(account, 93143413);

        let scaledBalance = await rebase.scaledBalanceOf(account);
        console.log("ScaledBalance rebase: " + scaledBalance);

        let balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(140997961);

    });


    it("Mint burn with changing liq index", async function () {

        let firstLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await rebase.setLiquidityIndex(firstLiquidityIndex.toString());

        await rebase.mint(account, 16);

        let balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(16)

        let secondLiquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await rebase.setLiquidityIndex(secondLiquidityIndex.toString());

        balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(64);

        await rebase.burn(account, 16);

        balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(48);

        await rebase.setLiquidityIndex(firstLiquidityIndex.toString());

        balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(12);

    });


    it("Total supply with default liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());

        await rebase.mint(account, 2);

        let scaledTotalSupply = await rebase.scaledTotalSupply();
        console.log("ScaledTotalSupply rebase: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(2000000000); // stored as rays

        let totalSupply = await rebase.totalSupply();
        console.log("TotalSupply rebase: " + totalSupply);
        expect(totalSupply).to.equals(2);

        await rebase.burn(account, 1);

        scaledTotalSupply = await rebase.scaledTotalSupply();
        console.log("ScaledTotalSupply rebase: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(1000000000); // stored as rays

        totalSupply = await rebase.totalSupply();
        console.log("TotalSupply rebase: " + totalSupply);
        expect(totalSupply).to.equals(1);

    });

    it("Total supply with half liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());

        await rebase.mint(account, 2);

        let scaledTotalSupply = await rebase.scaledTotalSupply();
        console.log("ScaledTotalSupply rebase: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(4000000000); // stored as rays

        let totalSupply = await rebase.totalSupply();
        console.log("TotalSupply rebase: " + totalSupply);
        expect(totalSupply).to.equals(2);

        await rebase.burn(account, 1);

        scaledTotalSupply = await rebase.scaledTotalSupply();
        console.log("ScaledTotalSupply rebase: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(2000000000); // stored as rays

        totalSupply = await rebase.totalSupply();
        console.log("TotalSupply rebase: " + totalSupply);
        expect(totalSupply).to.equals(1);

    });

    it("Total supply with double liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());

        await rebase.mint(account, 2);

        let scaledTotalSupply = await rebase.scaledTotalSupply();
        console.log("ScaledTotalSupply rebase: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(1000000000); // stored as rays

        let totalSupply = await rebase.totalSupply();
        console.log("TotalSupply rebase: " + totalSupply);
        expect(totalSupply).to.equals(2);

        await rebase.burn(account, 1);

        scaledTotalSupply = await rebase.scaledTotalSupply();
        console.log("ScaledTotalSupply rebase: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(500000000); // stored as rays

        totalSupply = await rebase.totalSupply();
        console.log("TotalSupply rebase: " + totalSupply);
        expect(totalSupply).to.equals(1);

    });

    it("Token owners added/removed", async function () {

        let newLiquidityIndex = new BN("1022809482605723771055655202");
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());

        let ownerLength;
        ownerLength = await rebase.ownerLength();
        console.log("ownerLength rebase: " + ownerLength);
        expect(ownerLength).to.equals(0);

        await rebase.mint(account, 93143413);

        ownerLength = await rebase.ownerLength();
        console.log("ownerLength rebase: " + ownerLength);
        expect(ownerLength).to.equals(1);

        await rebase.burn(account, 93143413);

        ownerLength = await rebase.ownerLength();
        console.log("ownerLength rebase: " + ownerLength);
        expect(ownerLength).to.equals(0);

    });

    it("Token transfer", async function () {
        const [owner, tmpUser] = await ethers.getSigners();

        let firstLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await rebase.setLiquidityIndex(firstLiquidityIndex.toString());

        await rebase.mint(account, 16);

        let balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(16)

        await rebase.transfer(tmpUser.address, 10);

        balance = await rebase.balanceOf(tmpUser.address);
        console.log("tmpUser Balance rebase: " + balance);
        expect(balance).to.equals(10);

    });

    it("Token transferFrom", async function () {
        const [owner, tmpUser] = await ethers.getSigners();

        let newLiquidityIndex = new BN("1022809482605723771055655202");
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());

        await rebase.mint(account, 93143413);

        let balance = await rebase.balanceOf(account);
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(93143413)

        await rebase.approve(tmpUser.address, 3143413);

        let allowance = await rebase.allowance(account, tmpUser.address);
        console.log("allowance rebase: " + allowance);
        expect(allowance).to.equals(3143413)

        await rebase.connect(tmpUser).transferFrom(account, tmpUser.address, 1143413);

        balance = await rebase.balanceOf(tmpUser.address);
        console.log("tmpUser Balance rebase: " + balance);
        expect(balance).to.equals(1143413);

        balance = await rebase.balanceOf(account);
        console.log("account Balance rebase: " + balance);
        expect(balance).to.equals(92000000);

        allowance = await rebase.allowance(account, tmpUser.address);
        console.log("allowance rebase: " + allowance);
        expect(allowance).to.equals(2000000)

        await expect(rebase.connect(tmpUser).transferFrom(account, tmpUser.address, 2100000)).to.be.reverted;

    });

    it("Token approve", async function () {

        const [owner, tmpUser] = await ethers.getSigners();

        let newLiquidityIndex = new BN("1022809482605723771055655202");
        await rebase.setLiquidityIndex(newLiquidityIndex.toString());
        await rebase.mint(account, toE6(100));

        let balance = fromE6(await rebase.balanceOf(account));
        console.log("Balance rebase: " + balance);
        expect(balance).to.equals(100)

        await rebase.approve(tmpUser.address, toE6(100));

        let allowance = fromE6(await rebase.allowance(account, tmpUser.address));
        console.log("allowance rebase: " + allowance);
        expect(allowance).to.equals(100);

    });
});


describe("Total Mint/Burn/Supply", function () {

    let rebase;
    let account;

    sharedBeforeEach('deploy token', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["RebaseToken"]);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        rebase = await ethers.getContract("RebaseToken");
        await rebase.setExchanger(account);
    });


    it("Total Supply", async function () {

        await rebase.setLiquidityIndex(new BN("1022809482605723771055655202").toString());
        await rebase.mint(account, toE6(100));

        let balance = fromE6(await rebase.totalSupply());
        expect(balance).to.equals(100)

        await rebase.setLiquidityIndex(new BN("1032809482605723771055655202").toString());

        balance = fromE6(await rebase.totalSupply());
        expect(balance).to.equals(100.977699)
    });

    it("Total Mint", async function () {

        await rebase.setLiquidityIndex(new BN("1022809482605723771055655202").toString());
        await rebase.mint(account, toE6(100));

        let balance = fromE6(await rebase.totalMint());
        expect(balance).to.equals(100);

        await rebase.setLiquidityIndex(new BN("1032809482605723771055655202").toString());

        balance = fromE6(await rebase.totalMint());
        expect(balance).to.equals(100.977699)

    });

    it("Total Burn", async function () {

        await rebase.setLiquidityIndex(new BN("1022809482605723771055655202").toString());
        await rebase.mint(account, toE6(100));
        await rebase.burn(account, toE6(50));

        let balance = fromE6(await rebase.totalBurn());
        expect(balance).to.equals(50);


        await rebase.setLiquidityIndex(new BN("1032809482605723771055655202").toString());

        balance = fromE6(await rebase.totalBurn());
        expect(balance).to.equals(50.48885)
    });

});


describe("ERC20", function () {

    let account;
    let rebase;
    let recipient;


    sharedBeforeEach('deploy token', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["RebaseToken"]);

        const accounts = await getNamedAccounts();
        account = accounts.deployer;
        rebase = await ethers.getContract("RebaseToken");
        await rebase.setExchanger(account);

        await rebase.setName('LP USD+/WMATIC', 'USD+/WMATIC')

        const [owner, tmpUser] = await ethers.getSigners();

        recipient = tmpUser;
    });

    it('has a name', async function () {
        expect(await rebase.name()).to.equal('LP USD+/WMATIC');
    });

    it('has a symbol', async function () {
        expect(await rebase.symbol()).to.equal('USD+/WMATIC');
    });

    it('has 6 decimals', async function () {
        expect(await rebase.decimals()).to.equal(6);
    });


    describe("_transfer", function () {

        it('transfer', async function () {

            await rebase.mint(account, 50);
            await rebase.transfer(recipient.address, 50);

            expect(await rebase.balanceOf(recipient.address)).to.eq(50)
            expect(await rebase.balanceOf(account)).to.eq(0)
        });

        describe('when the sender is the zero address', function () {
            it('reverts', async function () {
                await expectRevert(rebase.transferFrom(ZERO_ADDRESS, recipient.address, 50),
                    'ERC20: transfer from the zero address',
                );
            });
        });

        it('amount exceeds allowance', async function () {
            const [owner, tmpUser] = await ethers.getSigners();

            await rebase.mint(account, 50);
            await expectRevert(rebase.connect(tmpUser).transferFrom(account, tmpUser.address, 50),
                'RebaseToken: transfer amount exceeds allowance',
            );
        });

    });

    describe("approve", function () {

        it('max 256', async function () {
            const [owner, tmpUser] = await ethers.getSigners();

            let uint256Max = new BN(2).pow(new BN(256)).subn(1);
            await rebase.approve(tmpUser.address, uint256Max.toString());

            expect((await rebase.allowance(account, tmpUser.address)).toString()).to.eq(uint256Max.toString())
        });

        it('max 75 symbols', async function () {
            const [owner, tmpUser] = await ethers.getSigners();

            let uint256Max = new BN(2).pow(new BN(256)).subn(1);
            await rebase.approve(tmpUser.address, "115792089237316195423570985008687907853269984665640564039457584007913129");

            expect((await rebase.allowance(account, tmpUser.address)).toString()).to.eq(uint256Max.toString())
        });


        it('max 40 symbols', async function () {
            const [owner, tmpUser] = await ethers.getSigners();

            let value = "1157920892373161954235709850086879078532";
            await rebase.approve(tmpUser.address, value);

            expect((await rebase.allowance(account, tmpUser.address)).toString()).to.eq(value.toString())
        });


        it('transfer', async function () {
            const [owner, tmpUser] = await ethers.getSigners();

            await rebase.mint(account, 50);
            await rebase.approve(tmpUser.address, 50);

            expect(await rebase.balanceOf(recipient.address)).to.eq(0)
            expect(await rebase.balanceOf(account)).to.eq(50)

            await rebase.connect(tmpUser).transferFrom(account, tmpUser.address, 50);

            expect(await rebase.balanceOf(account)).to.eq(0)
            expect(await rebase.balanceOf(recipient.address)).to.eq(50)
        });

        it('increaseAllowance', async function () {
            const [owner, tmpUser] = await ethers.getSigners();

            await rebase.mint(account, 50);
            await rebase.increaseAllowance(tmpUser.address, 25);
            await rebase.increaseAllowance(tmpUser.address, 25);

            expect(await rebase.balanceOf(recipient.address)).to.eq(0)
            expect(await rebase.balanceOf(account)).to.eq(50)

            await rebase.connect(tmpUser).transferFrom(account, tmpUser.address, 50);

            expect(await rebase.balanceOf(account)).to.eq(0)
            expect(await rebase.balanceOf(recipient.address)).to.eq(50)
        });

        it('decreaseAllowance', async function () {
            const [owner, tmpUser] = await ethers.getSigners();

            await rebase.mint(account, 50);
            await rebase.increaseAllowance(tmpUser.address, 75);
            await rebase.decreaseAllowance(tmpUser.address, 25);

            expect(await rebase.balanceOf(recipient.address)).to.eq(0)
            expect(await rebase.balanceOf(account)).to.eq(50)

            await rebase.connect(tmpUser).transferFrom(account, tmpUser.address, 50);

            expect(await rebase.balanceOf(account)).to.eq(0)
            expect(await rebase.balanceOf(recipient.address)).to.eq(50)
        });

        describe('when the owner is the zero address', function () {
            it('reverts', async function () {
                await expectRevert(rebase.approve(ZERO_ADDRESS, 50),
                    'ERC20: approve to the zero address',
                );
            });
        });


    });


    describe('_mint', function () {
        const amount = 50;
        it('rejects a null account', async function () {
            await expectRevert(rebase.mint(ZERO_ADDRESS, amount), 'ERC20: mint to the zero address')
        });

        describe('for a non zero account', function () {
            beforeEach('minting', async function () {
                this.receipt = await rebase.mint(recipient.address, amount);
            });

            it('increments totalSupply', async function () {
                await rebase.mint(recipient.address, 1);
                expect(await rebase.totalSupply()).to.equal(amount + 1);
            });

            it('increments recipient balance', async function () {
                expect(await rebase.balanceOf(recipient.address)).to.equal(amount);
            });

            it('emits Transfer event', async function () {
                let events = await rebase.queryFilter(rebase.filters.Transfer(ZERO_ADDRESS, recipient.address), this.receipt.blockNumber - 1, this.receipt.blockNumber + 1);
                let value = events[0].args[2];
                expect(value.toString()).to.equal("50");
            });
        });
    });
});




