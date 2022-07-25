const hre = require("hardhat");
const fs = require("fs");
const {fromE18} = require("../utils/decimals");
const ethers = hre.ethers;

let USDPlusOld = JSON.parse(fs.readFileSync('./deployments/polygon/UsdPlusTokenOld.json'));
let USDPlus = JSON.parse(fs.readFileSync('./deployments/polygon/UsdPlusToken.json'));

async function main() {
    let provider = new ethers.providers.JsonRpcProvider('');
    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet("", provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromE18(balance.toString()))

    let gasPrice = await provider.getGasPrice();
    console.log('Gas price: ' + gasPrice)
    let oldToken = await ethers.getContractAt(USDPlusOld.abi, USDPlusOld.address, wallet);
    let usdPlus = await ethers.getContractAt(USDPlus.abi, USDPlus.address, wallet);

    let count = await oldToken.ownerLength();

    let index = await oldToken.liquidityIndex();

    let options = { gasPrice: 70000000000, gasLimit: 850000  };

    let tx = await usdPlus.setExchanger(wallet.address, options);
    await tx.wait();
    tx = await usdPlus.setLiquidityIndex(index, options);
    await tx.wait();

    console.log('Liq index old USD+ ' + await oldToken.liquidityIndex());
    console.log('Liq index new USD+ ' + await usdPlus.liquidityIndex());
    console.log('Count owners: ' +count);
    console.log('Exchanger: ' + await usdPlus.hasRole(await usdPlus.EXCHANGER(), wallet.address));


    for (let i = 81; i < count; i++) {

        console.log('Index: ' + i);
        let client = await oldToken.ownerAt(i);
        let balanceScaled = await oldToken.scaledBalanceOf(client);
        let balanceOf = await oldToken.balanceOf(client);
        let balance = balanceScaled / 10 ** 15;

        if (balance == 0){
            continue;
        }

        console.log('Client: ' + client + " mint: " + balanceOf);
        console.log('Balance old usd+: ' + balanceOf /10 ** 6);
        console.log('Scaled old usd+: ' + balance)
        let tx = await usdPlus.mint(client, balanceOf, options)
        await tx.wait();

        let newBalance = await usdPlus.balanceOf(client)/ 10 ** 6;
        let oldBalance = balanceOf /10 ** 6;
        console.log('Balance new usd+: ' + newBalance);

        console.log('Balance eq: ' + (newBalance === oldBalance))
    }
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




