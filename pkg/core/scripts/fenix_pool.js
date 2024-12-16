const { getContract, initWallet, getERC20ByAddress, transferAsset, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { toAsset } = require("@overnight-contracts/common/utils/decimals");
const { BLAST } = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const hre = require("hardhat");

async function main() {

    
    
    let timelock = await getContract('AgentTimelock');

    

    let iterations = 1;

    let poolAddress = '0x6a1de1841c5c3712e3bc7c75ce3d57dedec6915f';

    let wallet = await initWallet();

    await transferETH(1, wallet.address);
    await transferETH(1, timelock.address);

    
    console.log("#1");

    let pm = await getContract('PortfolioManager', 'blast');
    console.log("#2, pm address: ", pm.address);

    let fenixSwap = await getContract('FenixSwap', 'blast'); // пока не задеплоен
    console.log("#3");

    let exchange = await getContract('Exchange', 'blast');
    console.log("#4, exchange address: ", exchange.address);

    // let usdPlus = await getContract(BLAST.usdPlus, 'blast');
    let usdPlus = await getERC20ByAddress('0x4fee793d435c6d2c10c135983bb9d6d4fc7b9bbd', wallet.address)
    console.log("#5");

    let usdb = await getERC20ByAddress('0x4300000000000000000000000000000000000003', wallet.address)
    console.log("#6");
    

    let pool = await hre.ethers.getContractAt("ICLPoolFenix", poolAddress);



    console.log("#7");

    await transferAsset(BLAST.usdb, wallet.address, toAsset(100));
    console.log("#8");


    let gas = {
        gasLimit: 20000000,
        maxFeePerGas: "38000000",
        maxPriorityFeePerGas: "1300000",
    }

    for (let i = 0; i < iterations; i++) {
        console.log("-----iteration ", i, "-----");
        let usdbBalance = await usdb.balanceOf(wallet.address);
        console.log("USDB balance: ", usdbBalance.toString());

        await (await usdb.approve(exchange.address, usdbBalance, gas)).wait();
        console.log("USDB approved to exchange");

        console.log("usdb.address: ", usdb.address)

        await (await exchange.mint(
            { 
                asset: usdb.address, 
                amount: usdbBalance, 
                referral: ""
            }, 
            gas
        )).wait(); 
        // await (await exchange.mint(usdb.address, usdbBalance, gas)).wait(); 
        console.log("USD+ minted and received USDB invested in CASH-strategies");

        let usdPlusBalance = await usdPlus.balanceOf(wallet.address);
        console.log("USD+ balance: ", usdPlusBalance.toString());
        
        await (await usdPlus.approve(fenixSwap.address, usdPlusBalance, gas)).wait();
        console.log("USD+ approved to fenixSwap");


        
        globalState = await pool.globalState();




        console.log("Ratio before swap:  ", globalState[0].toString());





        let usdPlusBalance2 = await usdPlus.balanceOf(wallet.address);
        console.log("USD+ balance BEFORE SWAP: ", usdPlusBalance2.toString());
        let usdbBalance2 = await usdb.balanceOf(wallet.address);
        console.log("USDB balance BEFORE SWAP: ", usdbBalance2.toString());

        // await fenixSwap.grantRole(Roles.DEFAULT_ADMIN_ROLE, wallet.address);
        // await fenixSwap.grantRole(Roles.PORTFOLIO_AGENT_ROLE, wallet.address);
        // console.log("PORTFOLIO_AGENT_ROLE granted")


        await (await fenixSwap.swap(poolAddress, usdPlusBalance, 0n, false, gas)).wait();
        

        let usdPlusBalance3 = await usdPlus.balanceOf(wallet.address);
        console.log("USD+ balance AFTER SWAP: ", usdPlusBalance3.toString());
        let usdbBalance3 = await usdb.balanceOf(wallet.address);
        console.log("USDB balance AFTER SWAP: ", usdbBalance3.toString());



        globalState = await pool.globalState()
        console.log("Ratio after swap:   ", globalState[0].toString());


        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [timelock.address],
            // params: ["0x086dFe298907DFf27BD593BD85208D57e0155c94"],
            // params: ["0x211A7B36a186eF2AB3F59F4e6c5B0505378Ad0D1"],
             
        });

        const timelockAccount = await hre.ethers.getSigner(timelock.address);
        
        console.log("hardhat_impersonateAccount DONE")

        await (await pm.connect(timelockAccount).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), timelockAccount.address));

        console.log("PORTFOLIO_AGENT_ROLE granted")

        await (await pm.connect(timelockAccount).balance(gas)).wait();

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [timelock.address],
        });



        globalState = await pool.globalState()
        console.log("Ratio after balance:", globalState[0].toString());

        console.log("Вот и всё, ребята :)")

        // console.log("waiting for 5 seconds...");
        // await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between iterations
    }

    // let balanceFinish = await sAsset.balanceOf(wallet.address);
    // console.log("balanceFinish " + balanceFinish.toString());
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

