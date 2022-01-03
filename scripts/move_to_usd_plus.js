const hre = require("hardhat");
const fs = require("fs");
const {fromWmatic} = require("../utils/decimals");
const ethers = hre.ethers;

let USDPlusOld = JSON.parse(fs.readFileSync('./deployments/polygon/UsdPlusTokenOld.json'));
let USDPlus = JSON.parse(fs.readFileSync('./deployments/polygon/UsdPlusToken.json'));

async function main() {

    let provider = new ethers.providers.JsonRpcProvider('');
    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet("", provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromWmatic(balance))

    let oldToken = await ethers.getContractAt(USDPlus.abi, USDPlus.address, wallet);
    let usdPlus = await ethers.getContractAt(USDPlusOld.abi, USDPlusOld.address, wallet);

    let count = await oldToken.ownerLength();

    let index = await oldToken.liquidityIndex();
    await usdPlus.setExchanger(wallet.address);
    await usdPlus.setLiquidityIndex(index);

    for (let i = 0; i < count; i++) {

        let client = await oldToken.ownerAt(i);
        let balanceScaled = await oldToken.scaledBalanceOf(i);
        let balance = balanceScaled / 10 ** 6;

        if (balance == 0){
            continue;
        }

        let tx = await usdPlus.mint(client, balanceScaled)
        await tx.wait();

        console.log('Client: ' + client);
        console.log('Balance old usd+: ' + balance);
        console.log('Balance new usd+: ' + await usdPlus.balanceOf(client)/ 10 ** 6);
    }
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




