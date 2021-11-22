const Exchange = artifacts.require("Exchange");
const USDCtest = artifacts.require("USDCtest");
const Ovn = artifacts.require("OvernightToken");
const Mark2Market = artifacts.require("Mark2Market");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("mark2Market",  function (accounts) {


    it("Method: buy", async function () {
        const exchange = await Exchange.deployed();
        const ovn = await Ovn.deployed();
        const usdc = await USDCtest.at('0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
        const m2m = await Mark2Market.deployed();
        const account = accounts[0];
        let balanceUSDCBefore = await usdc.balanceOf(account);
        sumUSDC = 10*10**6;
        sumOvn = 10**10**18
        await usdc.approve(Exchange.address, sumUSDC);
        await exchange.buy(usdc.address, sumUSDC)

        let balanceOVN = await ovn.balanceOf(account);
        let balanceUSDC = await usdc.balanceOf(account);

        assert.equal(sumOvn, balanceOVN.toNumber())
        assert.equal(balanceUSDCBefore.toNumber()-sumUSDC, balanceUSDC);
    });


    it("Method: m2m Actives prices", async function () {

  
        const m2m = await Mark2Market.deployed();
        await m2m.tstPrice(1);
        console.log(await m2m.activesPrices());
        assert.equal(false);
       
    });

});
