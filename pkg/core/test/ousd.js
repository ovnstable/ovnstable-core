const {expect} = require("chai");
const {utils} = require("ethers");
const {parseUnits} = require("ethers").utils;
const hre = require('hardhat');
const {getNamedAccounts, deployments, ethers} = require("hardhat");
const {createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {fromE18, fromE6, toE18, toE6} = require("@overnight-contracts/common/utils/decimals");

function ousdUnits(amount) {
    return parseUnits(amount, 6);
}

function usdcUnits(amount) {
    return parseUnits(amount, 6);
}

function daiUnits(amount) {
    return parseUnits(amount, 18);
}


describe("Token", function () {

    let usdPlus;
    let account;

    let user1;
    let user2;

    let nonRebaseUser1;
    let nonRebaseUser2;

    let fromAsset;
    let toAsset;

    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["UsdPlusToken"]);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        user1 = await createRandomWallet();
        user2 = await createRandomWallet();
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


    async function rebaseOptIn(user){
        await usdPlus.rebaseOptIn(user.address);
    }

    async function rebaseOptOut(user){
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
        // TODO VM Exception while processing transaction: reverted with panic code 0x12 (Division or modulo division by zero)
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

    // TODO Error: VM Exception while processing transaction: reverted with panic code 0x12 (Division or modulo division by zero)
    expect(await usdPlus.totalSupply()).to.equal(totalSupplyBefore);

    // const rebasingCredits = await ousd.rebasingCreditsHighres();
    // const rebasingCreditsPerTokenHighres =
    //   await ousd.rebasingCreditsPerTokenHighres();
    //
    // const creditsAdded = ousdUnits("99.50")
    //   .mul(rebasingCreditsPerTokenHighres)
    //   .div(utils.parseUnits("1", 18));
    //
    // await expect(rebasingCredits).to.equal(
    //   initialRebasingCredits.add(creditsAdded)
    // );
    //
    // expect(await ousd.totalSupply()).to.approxEqual(
    //   initialTotalSupply.add(utils.parseUnits("200", 18))
    // );
    //
    // // Validate rebasing and non rebasing credit accounting by calculating'
    // // total supply manually
    // const calculatedTotalSupply = (await ousd.rebasingCreditsHighres())
    //   .mul(utils.parseUnits("1", 18))
    //   .div(await ousd.rebasingCreditsPerTokenHighres())
    //   .add(await ousd.nonRebasingSupply());
    // await expect(calculatedTotalSupply).to.approxEqual(
    //   await ousd.totalSupply()
    // );
  });

//   it("Should maintain the correct balance when rebaseOptOut is called from rebasing EOA", async () => {
//     let { ousd, vault, matt, usdc } = fixture;
//     await expect(matt).has.an.approxBalanceOf("100.00", ousd);
//     // Transfer USDC into the Vault to simulate yield
//     await usdc.connect(matt).transfer(vault.address, usdcUnits("200"));
//     await vault.rebase();
//     const totalSupplyBefore = await ousd.totalSupply();

//     const initialRebasingCredits = await ousd.rebasingCreditsHighres();
//     const initialrebasingCreditsPerTokenHighres =
//       await ousd.rebasingCreditsPerTokenHighres();

//     await ousd.connect(matt).rebaseOptOut();
//     // Received 100 from the rebase, the 200 simulated yield was split between
//     // Matt and Josh
//     await expect(matt).has.an.approxBalanceOf("200.00", ousd);

//     const rebasingCredits = await ousd.rebasingCreditsHighres();

//     const creditsDeducted = ousdUnits("200")
//       .mul(initialrebasingCreditsPerTokenHighres)
//       .div(utils.parseUnits("1", 18));

//     await expect(rebasingCredits).to.equal(
//       initialRebasingCredits.sub(creditsDeducted)
//     );

//     expect(await ousd.totalSupply()).to.equal(totalSupplyBefore);
//   });

//   it("Should not allow EOA to call rebaseOptIn when already opted in to rebasing", async () => {
//     let { ousd, matt } = fixture;
//     await expect(ousd.connect(matt).rebaseOptIn()).to.be.revertedWith(
//       "Account has not opted out"
//     );
//   });

//   it("Should not allow EOA to call rebaseOptOut when already opted out of rebasing", async () => {
//     let { ousd, matt } = fixture;
//     await ousd.connect(matt).rebaseOptOut();
//     await expect(ousd.connect(matt).rebaseOptOut()).to.be.revertedWith(
//       "Account has not opted in"
//     );
//   });

//   it("Should not allow contract to call rebaseOptIn when already opted in to rebasing", async () => {
//     let { mockNonRebasing } = fixture;
//     await mockNonRebasing.rebaseOptIn();
//     await expect(mockNonRebasing.rebaseOptIn()).to.be.revertedWith(
//       "Account has not opted out"
//     );
//   });

//   it("Should not allow contract to call rebaseOptOut when already opted out of rebasing", async () => {
//     let { mockNonRebasing } = fixture;
//     await expect(mockNonRebasing.rebaseOptOut()).to.be.revertedWith(
//       "Account has not opted in"
//     );
//   });

//   it("Should maintain the correct balance on a partial transfer for a non-rebasing account without previously set creditsPerToken", async () => {
//     let { ousd, matt, josh, mockNonRebasing } = fixture;

//     // Opt in to rebase so contract doesn't set a fixed creditsPerToken for the contract
//     await mockNonRebasing.rebaseOptIn();
//     // Give contract 100 OUSD from Josh
//     await ousd
//       .connect(josh)
//       .transfer(mockNonRebasing.address, ousdUnits("100"));
//     await expect(mockNonRebasing).has.an.approxBalanceOf("100", ousd);
//     await ousd.connect(matt).rebaseOptOut();
//     // Transfer will cause a fixed creditsPerToken to be set for mockNonRebasing
//     await mockNonRebasing.transfer(await matt.getAddress(), ousdUnits("50"));
//     await expect(mockNonRebasing).has.an.approxBalanceOf("50", ousd);
//     await expect(matt).has.an.approxBalanceOf("150", ousd);
//     await mockNonRebasing.transfer(await matt.getAddress(), ousdUnits("25"));
//     await expect(mockNonRebasing).has.an.approxBalanceOf("25", ousd);
//     await expect(matt).has.an.approxBalanceOf("175", ousd);
//   });

//   it("Should maintain the same totalSupply on many transfers between different account types", async () => {
//     let { ousd, matt, josh, mockNonRebasing, mockNonRebasingTwo } = fixture;

//     // Only Matt and Josh have OUSD, give some to contracts
//     await ousd.connect(josh).transfer(mockNonRebasing.address, ousdUnits("50"));
//     await ousd
//       .connect(matt)
//       .transfer(mockNonRebasingTwo.address, ousdUnits("50"));

//     // Set up accounts
//     await ousd.connect(josh).rebaseOptOut();
//     const nonRebasingEOA = josh;
//     const rebasingEOA = matt;
//     const nonRebasingContract = mockNonRebasing;
//     await mockNonRebasingTwo.rebaseOptIn();
//     const rebasingContract = mockNonRebasingTwo;

//     const allAccounts = [
//       nonRebasingEOA,
//       rebasingEOA,
//       nonRebasingContract,
//       rebasingContract,
//     ];

//     const initialTotalSupply = await ousd.totalSupply();
//     for (let i = 0; i < 10; i++) {
//       for (const fromAccount of allAccounts) {
//         const toAccount =
//           allAccounts[Math.floor(Math.random() * allAccounts.length)];

//         if (typeof fromAccount.transfer === "function") {
//           // From account is a contract
//           await fromAccount.transfer(
//             toAccount.address,
//             (await ousd.balanceOf(fromAccount.address)).div(2)
//           );
//         } else {
//           // From account is a EOA
//           await ousd
//             .connect(fromAccount)
//             .transfer(
//               toAccount.address,
//               (await ousd.balanceOf(fromAccount.address)).div(2)
//             );
//         }

//         await expect(await ousd.totalSupply()).to.equal(initialTotalSupply);
//       }
//     }
//   });

//   it("Should revert a transferFrom if an allowance is insufficient", async () => {
//     const { ousd, anna, matt } = fixture;
//     // Approve OUSD for transferFrom
//     await ousd.connect(matt).approve(anna.getAddress(), ousdUnits("10"));
//     expect(
//       await ousd.allowance(await matt.getAddress(), await anna.getAddress())
//     ).to.equal(ousdUnits("10"));

//     // Do a transferFrom of OUSD
//     await expect(
//       ousd
//         .connect(anna)
//         .transferFrom(
//           await matt.getAddress(),
//           await anna.getAddress(),
//           ousdUnits("100")
//         )
//     ).to.be.revertedWith("panic code 0x11");
//   });

//   it("Should allow to increase/decrease allowance", async () => {
//     const { ousd, anna, matt } = fixture;
//     // Approve OUSD
//     await ousd.connect(matt).approve(anna.getAddress(), ousdUnits("1000"));
//     expect(
//       await ousd.allowance(await matt.getAddress(), await anna.getAddress())
//     ).to.equal(ousdUnits("1000"));

//     // Decrease allowance
//     await ousd
//       .connect(matt)
//       .decreaseAllowance(await anna.getAddress(), ousdUnits("100"));
//     expect(
//       await ousd.allowance(await matt.getAddress(), await anna.getAddress())
//     ).to.equal(ousdUnits("900"));

//     // Increase allowance
//     await ousd
//       .connect(matt)
//       .increaseAllowance(await anna.getAddress(), ousdUnits("20"));
//     expect(
//       await ousd.allowance(await matt.getAddress(), await anna.getAddress())
//     ).to.equal(ousdUnits("920"));

//     // Decrease allowance more than what's there
//     await ousd
//       .connect(matt)
//       .decreaseAllowance(await anna.getAddress(), ousdUnits("950"));
//     expect(
//       await ousd.allowance(await matt.getAddress(), await anna.getAddress())
//     ).to.equal(ousdUnits("0"));
//   });

//   it("Should increase users balance on supply increase", async () => {
//     const { ousd, usdc, vault, anna, matt } = fixture;
//     // Transfer 1 to Anna, so we can check different amounts
//     await ousd.connect(matt).transfer(anna.getAddress(), ousdUnits("1"));
//     await expect(matt).has.a.balanceOf("99", ousd);
//     await expect(anna).has.a.balanceOf("1", ousd);

//     // Increase total supply thus increasing all user's balances
//     await usdc.connect(matt).mint(usdcUnits("2"));
//     await usdc.connect(matt).transfer(vault.address, usdcUnits("2"));
//     await vault.rebase();

//     // Contract originally contained $200, now has $202.
//     // Matt should have (99/200) * 202 OUSD
//     await expect(matt).has.a.balanceOf("99.99", ousd);
//     // Anna should have (1/200) * 202 OUSD
//     await expect(anna).has.a.balanceOf("1.01", ousd);
//   });

//   it("Should mint correct amounts on non-rebasing account without previously set creditsPerToken", async () => {
//     let { ousd, dai, vault, josh, mockNonRebasing } = fixture;

//     // Give contract 100 DAI from Josh
//     await dai.connect(josh).transfer(mockNonRebasing.address, daiUnits("100"));
//     await expect(mockNonRebasing).has.a.balanceOf("0", ousd);
//     const totalSupplyBefore = await ousd.totalSupply();
//     await mockNonRebasing.approveFor(
//       dai.address,
//       vault.address,
//       daiUnits("100")
//     );
//     await mockNonRebasing.mintOusd(vault.address, dai.address, daiUnits("50"));
//     await expect(await ousd.totalSupply()).to.equal(
//       totalSupplyBefore.add(ousdUnits("50"))
//     );

//     // Validate rebasing and non rebasing credit accounting by calculating'
//     // total supply manually
//     await expect(await ousd.nonRebasingSupply()).to.approxEqual(
//       ousdUnits("50")
//     );
//     const calculatedTotalSupply = (await ousd.rebasingCreditsHighres())
//       .mul(utils.parseUnits("1", 18))
//       .div(await ousd.rebasingCreditsPerTokenHighres())
//       .add(await ousd.nonRebasingSupply());
//     await expect(calculatedTotalSupply).to.approxEqual(
//       await ousd.totalSupply()
//     );
//   });

//   it("Should mint correct amounts on non-rebasing account with previously set creditsPerToken", async () => {
//     let { ousd, dai, vault, matt, usdc, josh, mockNonRebasing } = fixture;
//     // Give contract 100 DAI from Josh
//     await dai.connect(josh).transfer(mockNonRebasing.address, daiUnits("100"));
//     await expect(mockNonRebasing).has.a.balanceOf("0", ousd);
//     const totalSupplyBefore = await ousd.totalSupply();
//     await mockNonRebasing.approveFor(
//       dai.address,
//       vault.address,
//       daiUnits("100")
//     );
//     await mockNonRebasing.mintOusd(vault.address, dai.address, daiUnits("50"));
//     await expect(await ousd.totalSupply()).to.equal(
//       totalSupplyBefore.add(ousdUnits("50"))
//     );
//     const contractCreditsBalanceOf = await ousd.creditsBalanceOf(
//       mockNonRebasing.address
//     );
//     // Transfer USDC into the Vault to simulate yield
//     await usdc.connect(matt).transfer(vault.address, usdcUnits("200"));
//     await vault.rebase();
//     // After the initial transfer and the rebase the contract address has a
//     // separate and different creditsPerToken to the global one
//     expect(
//       (await ousd.creditsBalanceOf(await josh.getAddress()))[1]
//     ).to.not.equal(contractCreditsBalanceOf[1]);
//     // Mint again
//     await mockNonRebasing.mintOusd(vault.address, dai.address, daiUnits("50"));
//     await expect(await ousd.totalSupply()).to.equal(
//       // Note 200 additional from simulated yield
//       totalSupplyBefore.add(ousdUnits("100")).add(ousdUnits("200"))
//     );
//     await expect(mockNonRebasing).has.a.balanceOf("100", ousd);

//     // Validate rebasing and non rebasing credit accounting by calculating'
//     // total supply manually
//     await expect(await ousd.nonRebasingSupply()).to.approxEqual(
//       ousdUnits("100")
//     );
//     const calculatedTotalSupply = (await ousd.rebasingCreditsHighres())
//       .mul(utils.parseUnits("1", 18))
//       .div(await ousd.rebasingCreditsPerTokenHighres())
//       .add(await ousd.nonRebasingSupply());
//     await expect(calculatedTotalSupply).to.approxEqual(
//       await ousd.totalSupply()
//     );
//   });

//   it("Should burn the correct amount for non-rebasing account", async () => {
//     let { ousd, dai, vault, matt, usdc, josh, mockNonRebasing } = fixture;
//     // Give contract 100 DAI from Josh
//     await dai.connect(josh).transfer(mockNonRebasing.address, daiUnits("100"));
//     await expect(mockNonRebasing).has.a.balanceOf("0", ousd);
//     const totalSupplyBefore = await ousd.totalSupply();
//     await mockNonRebasing.approveFor(
//       dai.address,
//       vault.address,
//       daiUnits("100")
//     );
//     await mockNonRebasing.mintOusd(vault.address, dai.address, daiUnits("50"));
//     await expect(await ousd.totalSupply()).to.equal(
//       totalSupplyBefore.add(ousdUnits("50"))
//     );
//     const contractCreditsBalanceOf = await ousd.creditsBalanceOf(
//       mockNonRebasing.address
//     );
//     // Transfer USDC into the Vault to simulate yield
//     await usdc.connect(matt).transfer(vault.address, usdcUnits("200"));
//     await vault.rebase();
//     // After the initial transfer and the rebase the contract address has a
//     // separate and different creditsPerToken to the global one
//     expect(
//       (await ousd.creditsBalanceOf(await josh.getAddress()))[1]
//     ).to.not.equal(contractCreditsBalanceOf[1]);
//     // Burn OUSD
//     await mockNonRebasing.redeemOusd(vault.address, ousdUnits("25"));
//     await expect(await ousd.totalSupply()).to.equal(
//       // Note 200 from simulated yield
//       totalSupplyBefore.add(ousdUnits("225"))
//     );
//     await expect(mockNonRebasing).has.a.balanceOf("25", ousd);

//     // Validate rebasing and non rebasing credit accounting by calculating'
//     // total supply manually
//     await expect(await ousd.nonRebasingSupply()).to.approxEqual(
//       ousdUnits("25")
//     );
//     const calculatedTotalSupply = (await ousd.rebasingCreditsHighres())
//       .mul(utils.parseUnits("1", 18))
//       .div(await ousd.rebasingCreditsPerTokenHighres())
//       .add(await ousd.nonRebasingSupply());
//     await expect(calculatedTotalSupply).to.approxEqual(
//       await ousd.totalSupply()
//     );
//   });

//   it("Should exact transfer to new contract accounts", async () => {
//     let { ousd, vault, matt, usdc, mockNonRebasing } = fixture;

//     // Add yield to so we need higher resolution
//     await usdc.connect(matt).mint(usdcUnits("9671.2345"));
//     await usdc.connect(matt).transfer(vault.address, usdcUnits("9671.2345"));
//     await vault.rebase();

//     // Helper to verify balance-exact transfers in
//     const checkTransferIn = async (amount) => {
//       const beforeReceiver = await ousd.balanceOf(mockNonRebasing.address);
//       await ousd.connect(matt).transfer(mockNonRebasing.address, amount);
//       const afterReceiver = await ousd.balanceOf(mockNonRebasing.address);
//       expect(beforeReceiver.add(amount)).to.equal(afterReceiver);
//     };

//     // Helper to verify balance-exact transfers out
//     const checkTransferOut = async (amount) => {
//       const beforeReceiver = await ousd.balanceOf(mockNonRebasing.address);
//       await mockNonRebasing.transfer(matt.address, amount);
//       const afterReceiver = await ousd.balanceOf(mockNonRebasing.address);
//       expect(beforeReceiver.sub(amount)).to.equal(afterReceiver);
//     };

//     // In
//     await checkTransferIn(1);
//     await checkTransferIn(2);
//     await checkTransferIn(5);
//     await checkTransferIn(9);
//     await checkTransferIn(100);
//     await checkTransferIn(2);
//     await checkTransferIn(5);
//     await checkTransferIn(9);

//     // Out
//     await checkTransferOut(1);
//     await checkTransferOut(2);
//     await checkTransferOut(5);
//     await checkTransferOut(9);
//     await checkTransferOut(100);
//     await checkTransferOut(2);
//     await checkTransferOut(5);
//     await checkTransferOut(9);
//   });
});
