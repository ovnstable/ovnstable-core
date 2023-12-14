const {expect} = require("chai");
const {utils, BigNumber} = require("ethers");
const hre = require('hardhat');
const {getNamedAccounts, deployments, ethers} = require("hardhat");
const {createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {fromE18, fromE6, toE18, toE6} = require("@overnight-contracts/common/utils/decimals");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");


describe("Token", function () {

    let usdPlus;
    let account;

    let user1;
    let user2;
    let user3;

    let nonRebaseUser1;
    let nonRebaseUser2;

    let fromAsset;
    let toAsset;

    sharedBeforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["UsdPlusToken"]);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        user1 = await createRandomWallet();
        user2 = await createRandomWallet();
        user3 = await createRandomWallet();
        nonRebaseUser1 = await createRandomWallet();
        nonRebaseUser2 = await createRandomWallet();
        usdPlus = await ethers.getContract("UsdPlusToken");
        await usdPlus.setExchanger(account);
        await usdPlus.setPayoutManager(account);

        await rebaseOptOut(nonRebaseUser1);
        await rebaseOptOut(nonRebaseUser2);

        let decimals = await usdPlus.decimals();
        fromAsset = decimals === 18 ? fromE18 : fromE6;
        toAsset = decimals === 18 ? toE18 : toE6;
    });


    async function rebaseOptIn(user) {
        await usdPlus.rebaseOptIn(user.address);
    }

    async function rebaseOptOut(user) {
        await usdPlus.rebaseOptOut(user.address);
    }


    async function transfer(from, to, amount) {
        await usdPlus.connect(from).transfer(to.address, toAsset(amount));
    }

    async function mint(user, amount) {
        await usdPlus.mint(user.address, toAsset(amount));
    }

    async function balanceOf(user, amount) {
        let balanceValue = await usdPlus.balanceOf(user.address);
        let balance = Math.ceil(fromAsset(balanceValue));
        expect(balance).to.eq(amount);
    }

    async function totalSupply(amount) {
        let totalSupply = await usdPlus.totalSupply();
        expect(fromAsset(totalSupply)).to.eq(amount);
    }

    async function changeTotalSupply(amount) {
        await usdPlus.changeSupply(toAsset(amount));
    }

    async function validateTotalSupply() {

        // Validate rebasing and non rebasing credit accounting by calculating'
        // total supply manually
        const calculatedTotalSupply = (await usdPlus.rebasingCreditsHighres())
            .mul(utils.parseUnits("1", 18))
            .div(await usdPlus.rebasingCreditsPerTokenHighres())
            .add(await usdPlus.nonRebasingSupply());


        const totalSupply = Math.ceil(fromAsset(await usdPlus.totalSupply()));
        await expect(Math.ceil(fromAsset(calculatedTotalSupply))).to.eq(totalSupply);
    }

    it("Should return the token name and symbol", async () => {
        expect(await usdPlus.name()).to.equal("USD+");
        expect(await usdPlus.symbol()).to.equal("USD+");
    });

    it("Should have 6 decimals", async () => {
        expect(await usdPlus.decimals()).to.equal(6);
    });

    it("Should return 0 balance for the zero address", async () => {
        expect(
            await usdPlus.balanceOf("0x0000000000000000000000000000000000000000")
        ).to.equal(0);
    });

    it("Should not allow anyone to mint USD+ directly", async () => {
        await expectRevert(
            usdPlus.connect(user1).mint(user1.address, toAsset(100)), "Caller is not the EXCHANGER")
    });

    it("Should allow a simple transfer of 1 USD+", async () => {
        await usdPlus.mint(user2.address, toAsset(100));
        await balanceOf(user1, 0);
        await balanceOf(user2, 100);
        await usdPlus.connect(user2).transfer(user1.address, toAsset(1));
        await balanceOf(user1, 1);
        await balanceOf(user2, 99);
    });

    it("Should allow a transferFrom with an allowance", async () => {
        await usdPlus.mint(user1.address, toAsset(1000));

        await usdPlus.connect(user1).approve(user2.address, toAsset(1000));
        expect(await usdPlus.allowance(user1.address, user2.address)).to.eq(toAsset(1000));

        await usdPlus.connect(user2).transferFrom(user1.address, user2.address, toAsset(1));
        await balanceOf(user2, 1);
        expect(await usdPlus.allowance(user1.address, user2.address)).to.eq(toAsset(999));

    });


    it('Should return correct balance for small amounts at mint/burn', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        for (const amount of amounts) {
            await usdPlus.mint(user1.address, amount);
            expect(usdPlus.balanceOf(user1.address), amount);
            await usdPlus.burn(user1.address, amount);
            expect(usdPlus.balanceOf(user1.address), '0');
        }

    });

    it('Should return correct balance for small amounts at mint/burn after shifted rebasingCreditsPerToken', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        await mint(user2, 12345);
        await changeTotalSupply(12543);

        for (const amount of amounts) {
            await usdPlus.mint(user1.address, amount);
            expect(usdPlus.balanceOf(user1.address), amount);
            await usdPlus.burn(user1.address, amount);
            expect(usdPlus.balanceOf(user1.address), '0');
        }

    });

    it('Should return correct balance for small amounts at transfer', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        for (const amount of amounts) {
            await usdPlus.mint(user1.address, amount);
            expect(usdPlus.balanceOf(user1.address), amount);
            await usdPlus.connect(user1).transfer(user2.address, amount);
            expect(usdPlus.balanceOf(user2.address), amount);
            expect(usdPlus.balanceOf(user1.address), '0');
            await usdPlus.burn(user2.address, amount);
            expect(usdPlus.balanceOf(user2.address), '0');

        }

    });

    it('Should return correct balance for small amounts at transfer after shifted rebasingCreditsPerToken', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        await mint(user3, 12345);
        await changeTotalSupply(12543);

        for (const amount of amounts) {
            await usdPlus.mint(user1.address, amount);
            expect(usdPlus.balanceOf(user1.address), amount);
            await usdPlus.connect(user1).transfer(user2.address, amount);
            expect(usdPlus.balanceOf(user2.address), amount);
            expect(usdPlus.balanceOf(user1.address), '0');
            await usdPlus.burn(user2.address, amount);
            expect(usdPlus.balanceOf(user2.address), '0');

        }

    });

    it("Should transfer the correct amount from a rebasing account to a non-rebasing account and set creditsPerToken", async () => {

        await usdPlus.mint(nonRebaseUser1.address, toAsset(100));
        await usdPlus.mint(user1.address, toAsset(100));

        await balanceOf(user1, 100);
        await balanceOf(nonRebaseUser1, 100);

        const creditsBalanceOf = await usdPlus.creditsBalanceOf(
            nonRebaseUser1.address
        );

        // Make rebase
        await usdPlus.changeSupply(toAsset(250));

        // Credits per token should be the same for the contract
        let creditsBalanceOfNew = await usdPlus.creditsBalanceOf(nonRebaseUser1.address);
        expect(creditsBalanceOf[0]).to.eq(creditsBalanceOfNew[0]);
        expect(creditsBalanceOf[1]).to.eq(creditsBalanceOfNew[1]);

        await validateTotalSupply();
    });

    it("Should transfer the correct amount from a rebasing account to a non-rebasing account with previously set creditsPerToken", async () => {

        await usdPlus.mint(user1.address, toAsset(100));
        await usdPlus.mint(nonRebaseUser1.address, toAsset(100));

        await balanceOf(user1, 100);
        await balanceOf(user2, 0);
        await balanceOf(nonRebaseUser1, 100);
        await totalSupply(200);

        await usdPlus.changeSupply(toAsset(300));
        await totalSupply(250);
        await balanceOf(user1, 150);
        await balanceOf(user2, 0);
        await balanceOf(nonRebaseUser1, 100);

        // Give contract 100 USD+ from User1
        await usdPlus.connect(user1).transfer(nonRebaseUser1.address, toAsset(50));
        await balanceOf(user1, 100);
        await balanceOf(nonRebaseUser1, 150);

        await validateTotalSupply();

    });

    it("Should transfer the correct amount from a non-rebasing account without previously set creditssPerToken to a rebasing account", async () => {

        await usdPlus.mint(user1.address, toAsset(100));
        await usdPlus.mint(nonRebaseUser1.address, toAsset(100));

        await balanceOf(user1, 100);
        await balanceOf(user2, 0);
        await balanceOf(nonRebaseUser1, 100);
        await totalSupply(200);

        // Transfer from contract to user
        await usdPlus.connect(nonRebaseUser1).transfer(user1.address, toAsset(100));
        await balanceOf(user1, 200);
        await balanceOf(user2, 0);
        await balanceOf(nonRebaseUser1, 0);

        await validateTotalSupply();
    });

    it("Should transfer the correct amount from a non-rebasing account with previously set creditsPerToken to a rebasing account", async () => {


        await mint(user1, 100);
        await mint(nonRebaseUser1, 100);

        await balanceOf(user1, 100);
        await balanceOf(nonRebaseUser1, 100);

        await changeTotalSupply(300);

        await balanceOf(user1, 150);
        await balanceOf(nonRebaseUser1, 100);

        await transfer(user1, nonRebaseUser1, 50);

        await balanceOf(user1, 100);
        await balanceOf(nonRebaseUser1, 150);

        await transfer(nonRebaseUser1, user2, 150);

        await balanceOf(user1, 100);
        await balanceOf(user2, 150);
        await balanceOf(nonRebaseUser1, 0);

        await validateTotalSupply();

    });

    it("Should transfer the correct amount from a non-rebasing account to a non-rebasing account with different previously set creditsPerToken", async () => {

        await mint(user1, 100);
        await balanceOf(user1, 100);

        await mint(nonRebaseUser1, 50);
        await balanceOf(nonRebaseUser1, 50);

        await changeTotalSupply(300);

        await balanceOf(user1, 200);
        await transfer(user1, nonRebaseUser2, 50);
        await balanceOf(nonRebaseUser2, 50);

        await changeTotalSupply(400);
        await balanceOf(nonRebaseUser1, 50);
        await balanceOf(nonRebaseUser2, 50);
        await balanceOf(user1, 240);

        await transfer(nonRebaseUser1, nonRebaseUser2, 10);
        await balanceOf(nonRebaseUser2, 60);
        await balanceOf(nonRebaseUser1, 40);

        // Validate rebasing and non rebasing credit accounting by calculating'
        // total supply manually
        const creditBalanceMockNonRebasing = await usdPlus.creditsBalanceOf(
            nonRebaseUser1.address
        );
        const balanceMockNonRebasing = creditBalanceMockNonRebasing[0]
            .mul(utils.parseUnits("1", 18))
            .div(creditBalanceMockNonRebasing[1]);

        const creditBalanceMockNonRebasingTwo = await usdPlus.creditsBalanceOf(
            nonRebaseUser2.address
        );
        const balanceMockNonRebasingTwo = creditBalanceMockNonRebasingTwo[0]
            .mul(utils.parseUnits("1", 18))
            .div(creditBalanceMockNonRebasingTwo[1]);

        const calculatedTotalSupply = (await usdPlus.rebasingCreditsHighres())
            .mul(utils.parseUnits("1", 18))
            .div(await usdPlus.rebasingCreditsPerTokenHighres())
            .add(balanceMockNonRebasing)
            .add(balanceMockNonRebasingTwo);

        await expect(calculatedTotalSupply).to.equal(
            await usdPlus.totalSupply()
        );
    });

    it("Should transferFrom the correct amount from a rebasing account to a non-rebasing account and set creditsPerToken", async () => {

        await mint(user1, 100);

        await usdPlus.connect(user1).increaseAllowance(user2.address, toAsset(100));
        await usdPlus.connect(user2).transferFrom(user1.address, nonRebaseUser1.address, toAsset(100));

        await balanceOf(user1, 0);
        await balanceOf(user2, 0);
        await balanceOf(nonRebaseUser1, 100);

        const creditsBalanceOf = await usdPlus.creditsBalanceOf(
            nonRebaseUser1.address
        );

        // Make rebase
        await changeTotalSupply(200);

        // Credits per token should be the same for the contract

        let creditsBalanceOfNew = await usdPlus.creditsBalanceOf(nonRebaseUser1.address);
        expect(creditsBalanceOf[0]).to.eq(creditsBalanceOfNew[0]);
        expect(creditsBalanceOf[1]).to.eq(creditsBalanceOfNew[1]);
        await validateTotalSupply();

    });

    it("Should transferFrom the correct amount from a rebasing account to a non-rebasing account with previously set creditsPerToken", async () => {

        await mint(user1, 100);

        await usdPlus.connect(user1).increaseAllowance(user2.address, toAsset(150));
        await usdPlus.connect(user2).transferFrom(user1.address, nonRebaseUser1.address, toAsset(50));

        await balanceOf(user1, 50);
        await balanceOf(nonRebaseUser1, 50);

        await changeTotalSupply(200);

        await usdPlus.connect(user2).transferFrom(user1.address, nonRebaseUser1.address, toAsset(50));
        await balanceOf(nonRebaseUser1, 100);

        await validateTotalSupply();

    });

    it("Should transferFrom the correct amount from a non-rebasing account without previously set creditsPerToken to a rebasing account", async () => {

        await mint(nonRebaseUser1, 100);
        await mint(user1, 100);

        await balanceOf(nonRebaseUser1, 100);
        await balanceOf(user1, 100);

        await usdPlus.connect(nonRebaseUser1).increaseAllowance(user1.address, toAsset(100));
        await usdPlus.connect(user1).transferFrom(nonRebaseUser1.address, user1.address, toAsset(100));

        await balanceOf(nonRebaseUser1, 0);
        await balanceOf(user1, 200);

        await validateTotalSupply();

    });

    it("Should transferFrom the correct amount from a non-rebasing account with previously set creditsPerToken to a rebasing account", async () => {

        await mint(user1, 100);
        await mint(nonRebaseUser1, 100);

        await changeTotalSupply(300);

        await balanceOf(user1, 150);
        await balanceOf(nonRebaseUser1, 100);

        await transfer(user1, nonRebaseUser1, 50);

        await balanceOf(user1, 100);
        await balanceOf(nonRebaseUser1, 150);

        await usdPlus.connect(nonRebaseUser1).increaseAllowance(user1.address, toAsset(150));
        await usdPlus.connect(user1).transferFrom(nonRebaseUser1.address, user1.address, toAsset(150));

        await balanceOf(user1, 250);
        await balanceOf(nonRebaseUser1, 0);

        await validateTotalSupply();

    });

    it("Should maintain the correct balances when rebaseOptIn is called from non-rebasing contract", async () => {

        await mint(nonRebaseUser1, 100);
        await balanceOf(nonRebaseUser1, 100);

        const initialRebasingCredits = await usdPlus.rebasingCreditsHighres();
        const initialTotalSupply = await usdPlus.totalSupply();

        await changeTotalSupply(200);

        const totalSupplyBefore = await usdPlus.totalSupply();

        await balanceOf(nonRebaseUser1, 100);
        await rebaseOptIn(nonRebaseUser1);
        await balanceOf(nonRebaseUser1, 100);

        expect(await usdPlus.totalSupply()).to.equal(totalSupplyBefore);

        const rebasingCredits = await usdPlus.rebasingCreditsHighres();
        const rebasingCreditsPerTokenHighres =
          await usdPlus.rebasingCreditsPerTokenHighres();

        const creditsAdded = BigNumber.from(toAsset("100"))
          .mul(rebasingCreditsPerTokenHighres)
          .div(utils.parseUnits("1", 18));

        await expect(rebasingCredits).to.equal(
          initialRebasingCredits.add(creditsAdded)
        );

        expect(await usdPlus.totalSupply()).to.equal(initialTotalSupply);


        await validateTotalSupply();
    });

    it("Should maintain the correct balance when rebaseOptOut is called from rebasing EOA", async () => {


        await mint(user1, 100);
        await mint(user2, 100);

        await changeTotalSupply(400);

        const totalSupplyBefore = await usdPlus.totalSupply();

        const initialRebasingCredits = await usdPlus.rebasingCreditsHighres();
        const initialrebasingCreditsPerTokenHighres = await usdPlus.rebasingCreditsPerTokenHighres();

        await rebaseOptOut(user1);

        await balanceOf(user1, 200);
        await balanceOf(user2, 200);

        const rebasingCredits = await usdPlus.rebasingCreditsHighres();

        const creditsDeducted = BigNumber.from(toAsset("200"))
            .mul(initialrebasingCreditsPerTokenHighres)
            .div(utils.parseUnits("1", 18));

        await expect(rebasingCredits).to.equal(
            initialRebasingCredits.sub(creditsDeducted)
        );

        expect(await usdPlus.totalSupply()).to.equal(totalSupplyBefore);
    });

    it("Should not allow EOA to call rebaseOptIn when already opted in to rebasing", async () => {
        await expectRevert(usdPlus.rebaseOptIn(user1.address), "Account has not opted out");
    });

    it("Should not allow EOA to call rebaseOptOut when already opted out of rebasing", async () => {
        await rebaseOptOut(user1);
        await expectRevert(usdPlus.rebaseOptOut(user1.address), "Account has not opted in");
    });

    it("Should not allow Contract to call rebaseOptIn when already opted in to rebasing", async () => {
        await expectRevert(usdPlus.rebaseOptIn(usdPlus.address), "Account has not opted out");
    });

    it("Should not allow Contract to call rebaseOptOut when already opted out of rebasing", async () => {
        await rebaseOptOut(usdPlus);
        await expectRevert(usdPlus.rebaseOptOut(usdPlus.address), "Account has not opted in");
    });

    it("Should maintain the correct balance on a partial transfer for a non-rebasing account without previously set creditsPerToken", async () => {

        await mint(user1, 100);

        await rebaseOptIn(nonRebaseUser1);

        await transfer(user1, nonRebaseUser1, 100);
        await balanceOf(nonRebaseUser1, 100);

        await rebaseOptOut(user2);

        await transfer(nonRebaseUser1, user2, 50);
        await balanceOf(user2, 50);
        await balanceOf(nonRebaseUser1, 50);

        await transfer(nonRebaseUser1, user2, 25);
        await balanceOf(user2, 75);
        await balanceOf(nonRebaseUser1, 25);

    });

    it("Should maintain the same totalSupply on many transfers between different account types", async () => {

        await mint(nonRebaseUser1, 50);
        await mint(nonRebaseUser2, 50);

        await mint(user1, 100);
        await mint(user2, 100);

        await rebaseOptOut(user1);
        await rebaseOptIn(nonRebaseUser1);

        const nonRebasingEOA = user1;
        const rebasingEOA = user2;
        const nonRebasingContract = nonRebaseUser2;
        const rebasingContract = nonRebaseUser1;

        const allAccounts = [
            nonRebasingEOA,
            rebasingEOA,
            nonRebasingContract,
            rebasingContract,
        ];

        const initialTotalSupply = await usdPlus.totalSupply();
        for (let i = 0; i < 10; i++) {
            for (const fromAccount of allAccounts) {
                const toAccount =
                    allAccounts[Math.floor(Math.random() * allAccounts.length)];

                if (typeof fromAccount.transfer === "function") {
                    // From account is a contract
                    await fromAccount.transfer(
                        toAccount.address,
                        (await usdPlus.balanceOf(fromAccount.address)).div(2)
                    );
                } else {
                    // From account is a EOA
                    await usdPlus
                        .connect(fromAccount)
                        .transfer(
                            toAccount.address,
                            (await usdPlus.balanceOf(fromAccount.address)).div(2)
                        );
                }

                await expect(await usdPlus.totalSupply()).to.equal(initialTotalSupply);
            }
        }
    });

    it("Should revert a transferFrom if an allowance is insufficient", async () => {
        await mint(user1, 100);

        await usdPlus.connect(user1).approve(user2.address, toAsset(10));
        expect(await usdPlus.allowance(user1.address, user2.address)).to.equal(toAsset(10));
        await expectRevert(usdPlus.connect(user2).transferFrom(user1.address, user2.address, toAsset(100)), "Allowance amount exceeds balance");
    });

    it("Should allow to increase/decrease allowance", async () => {


        await mint(user1, 1000);

        await usdPlus.connect(user1).approve(user2.address, toAsset(1000));
        expect(await usdPlus.allowance(user1.address, user2.address)).to.equal(toAsset(1000));

        await usdPlus.connect(user1).decreaseAllowance(user2.address, toAsset(100));
        expect(await usdPlus.allowance(user1.address, user2.address)).to.equal(toAsset(900));

        await usdPlus.connect(user1).increaseAllowance(user2.address, toAsset(20));
        expect(await usdPlus.allowance(user1.address, user2.address)).to.equal(toAsset(920));

        // Decrease allowance more than what's there
        await usdPlus.connect(user1).decreaseAllowance(user2.address, toAsset(950));
        expect(await usdPlus.allowance(user1.address, user2.address)).to.equal(toAsset(0));

    });

    it("Should increase users balance on supply increase", async () => {

        await mint(user1, 99);
        await mint(user2, 1);

        await changeTotalSupply(102);

        let balanceUser1 = fromAsset(await usdPlus.balanceOf(user1.address));
        let balanceUser2 = fromAsset(await usdPlus.balanceOf(user2.address));

        expect(balanceUser1).to.eq(100.98);
        expect(balanceUser2).to.eq(1.02);
    });


  it("Should exact transfer to new contract accounts", async () => {

    // Add yield to so we need higher resolution
    await mint(user1, 125);

    // Helper to verify balance-exact transfers in
    const checkTransferIn = async (amount) => {
      const beforeReceiver = await usdPlus.balanceOf(nonRebaseUser1.address);
      await usdPlus.connect(user1).transfer(nonRebaseUser1.address, amount);
      const afterReceiver = await usdPlus.balanceOf(nonRebaseUser1.address);
      expect(beforeReceiver.add(amount)).to.equal(afterReceiver);
    };

    // Helper to verify balance-exact transfers out
    const checkTransferOut = async (amount) => {
      const beforeReceiver = await usdPlus.balanceOf(nonRebaseUser1.address);
      await usdPlus.connect(nonRebaseUser1).transfer(user1.address, amount);
      const afterReceiver = await usdPlus.balanceOf(nonRebaseUser1.address);
      expect(beforeReceiver.sub(amount)).to.equal(afterReceiver);
    };

    // In
    await checkTransferIn(1);
    await checkTransferIn(2);
    await checkTransferIn(5);
    await checkTransferIn(9);
    await checkTransferIn(100);
    await checkTransferIn(2);
    await checkTransferIn(5);
    await checkTransferIn(9);

    // Out
    await checkTransferOut(1);
    await checkTransferOut(2);
    await checkTransferOut(5);
    await checkTransferOut(9);
    await checkTransferOut(100);
    await checkTransferOut(2);
    await checkTransferOut(5);
    await checkTransferOut(9);
  });

    it("assetToCredit converts asset", async () => {

        await mint(user1, 99);
        await mint(user2, 1);

        let amount01 = {amount: "1",             credit: "1000000000"};
        let amount02 = {amount: "1000",          credit: "1000000000000"};
        let amount03 = {amount: "1000000",       credit: "1000000000000000"};
        let amount04 = {amount: "1000000000",    credit: "1000000000000000000"};
        let amount05 = {amount: "1000000000000", credit: "1000000000000000000000"};

        expect(await usdPlus.assetToCredit(user1.address, amount01.amount)).to.eq(amount01.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount02.amount)).to.eq(amount02.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount03.amount)).to.eq(amount03.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount04.amount)).to.eq(amount04.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount05.amount)).to.eq(amount05.credit);

        await changeTotalSupply(102);

        let amount11 = {amount: "1",             credit: "980392157"};
        let amount12 = {amount: "1000",          credit: "980392156863"};
        let amount13 = {amount: "1000000",       credit: "980392156862745"};
        let amount14 = {amount: "1000000000",    credit: "980392156862745098"};
        let amount15 = {amount: "1000000000000", credit: "980392156862745098039"};

        expect(await usdPlus.assetToCredit(user1.address, amount11.amount)).to.eq(amount11.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount12.amount)).to.eq(amount12.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount13.amount)).to.eq(amount13.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount14.amount)).to.eq(amount14.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount15.amount)).to.eq(amount15.credit);
    });

    it("creditToAsset converts credit", async () => {

        await mint(user1, 99);
        await mint(user2, 1);

        let amount01 = {amount: "1",             credit: "1000000000"};
        let amount02 = {amount: "1000",          credit: "1000000000000"};
        let amount03 = {amount: "1000000",       credit: "1000000000000000"};
        let amount04 = {amount: "1000000000",    credit: "1000000000000000000"};
        let amount05 = {amount: "1000000000000", credit: "1000000000000000000000"};

        expect(await usdPlus.creditToAsset(user1.address, amount01.credit)).to.eq(amount01.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount02.credit)).to.eq(amount02.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount03.credit)).to.eq(amount03.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount04.credit)).to.eq(amount04.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount05.credit)).to.eq(amount05.amount);

        await changeTotalSupply(102);

        let amount11 = {amount: "1",             credit: "980392157"};
        let amount12 = {amount: "1000",          credit: "980392156863"};
        let amount13 = {amount: "1000000",       credit: "980392156862745"};
        let amount14 = {amount: "1000000000",    credit: "980392156862745098"};
        let amount15 = {amount: "1000000000000", credit: "980392156862745098039"};

        expect(await usdPlus.creditToAsset(user1.address, amount11.credit)).to.eq(amount11.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount12.credit)).to.eq(amount12.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount13.credit)).to.eq(amount13.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount14.credit)).to.eq(amount14.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount15.credit)).to.eq(amount15.amount);
    });

    it("subCredits work correct", async () => {

        let amount1 = {credit1: "2000000000",       credit2: "1000000000",             error: "errorText", result: "1000000000"};
        let amount2 = {credit1: "1000000000000",    credit2: "1000000",                error: "errorText", result: "999999000000"};
        let amount3 = {credit1: "1000000000000000", credit2: "1000000000012345",       error: "errorText", result: "0"};
        let amount4 = {credit1: "1000000000012345", credit2: "1000000000000000",       error: "errorText", result: "12345"};
        let amount5 = {credit1: "1000000000000000", credit2: "1000000000000000",       error: "errorText", result: "0"};
        let amount6 = {credit1: "1000000000000",    credit2: "1000000000000000000000", error: "errorText", result: "errorText"};

        expect(await usdPlus.subCredits(amount1.credit1, amount1.credit2, amount1.error)).to.eq(amount1.result);
        expect(await usdPlus.subCredits(amount2.credit1, amount2.credit2, amount2.error)).to.eq(amount2.result);
        expect(await usdPlus.subCredits(amount3.credit1, amount3.credit2, amount3.error)).to.eq(amount3.result);
        expect(await usdPlus.subCredits(amount4.credit1, amount4.credit2, amount4.error)).to.eq(amount4.result);
        expect(await usdPlus.subCredits(amount5.credit1, amount5.credit2, amount5.error)).to.eq(amount5.result);
        await expectRevert(usdPlus.subCredits(amount6.credit1, amount6.credit2, amount6.error), amount6.result);
    });

    it("Approve/allowance different numbers", async () => {

        let amounts0 = [
            "115792089237316195423570985008687907853269984665640564039457584007913129639935", // max
            "115792089237316195423570985008687907853269984665640564039457584007913", // max / 1e9
            "115792089237316195423570985008687907853269984665640564039457", // max / 1e18
            "115792089237316195423570985008687907853269984665640", // max / 1e27
            "115792089237316195423570985008687907853269", // max / 1e36
            "115792089237316195423570985008688", // max / 1e45 + 1
        ];

        let amounts1 = [
            "115792089237316195423570985008687", // max / 1e45
            "115792089237316195423570", // max / 1e54
            "115792089237316", // max / 1e63
            "115792", // max / 1e72
            "1"
        ];

        for (const amount of amounts0) {
            await usdPlus.connect(user1).approve(user2.address, amount);
            expect(await usdPlus.allowance(user1.address, user2.address)).to.eq(amounts0[0]);
        }

        for (const amount of amounts1) {
            await usdPlus.connect(user1).approve(user2.address, amount);
            expect(await usdPlus.allowance(user1.address, user2.address)).to.eq(amount);
        }

    });

});
