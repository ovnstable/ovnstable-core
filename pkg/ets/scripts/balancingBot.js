const hre = require("hardhat");
const Web3 = require('web3');
const fetch = require('node-fetch');
const ethers2 = hre.ethers;
const fs = require("fs");
const { ethers } = require("hardhat");
const BigNumber = require('bignumber.js');
let provider;
let strategyJSON = JSON.parse(fs.readFileSync('./deployments/polygon/StrategyUsdPlusWmatic.json'));

function sleep(milliseconds) {
    var start = new Date().getTime();
    while (true){
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
}

async function main() {

    provider = new ethers.providers.JsonRpcProvider(process.env.ETH_NODE_URI_POLYGON);
    let wallet = await new ethers2.Wallet(process.env.PK_POLYGON, provider); 
    let strategy = await ethers2.getContractAt(strategyJSON.abi, strategyJSON.address, wallet);
    
    while (true) {
        sleep(5000);

        let items = await strategy.balances();
        let borrowWmatic = items[0][1].toString();
        let poolWmatic = items[2][1].toString();

        console.log(borrowWmatic);
        console.log(poolWmatic);
    
        let a = new BigNumber(borrowWmatic);
        let b = new BigNumber(poolWmatic);
        if (a < b) {
            let buf = a;
            a = b;
            b = buf;
        }
    
        if (a.multipliedBy(9996).div(1000) > b) {
            let gasPrice;
            try {
                gasPrice = await provider.getGasPrice();
            } catch (e) {
                console.log("timeout alchemy error");
                continue;
            }

            let scaledGasPrice = Math.floor(parseInt(gasPrice.toString())*3/2);
            if (scaledGasPrice < 10000000000) {
                scaledGasPrice += 10000000000;
            }
            scaledGasPrice = scaledGasPrice.toString();
            let gasLimit = '20000000';

            console.log("Balancing..");
            try {
                let tx = await (await strategy.balance({gasPrice: scaledGasPrice, gasLimit: gasLimit})).wait();
            } catch (e) {
                console.log("Balancing failed");
                console.log(e);
            }

            console.log("Balancing done");
            items = await strategy.balances();
            borrowWmatic = items[0][1].toString();
            poolWmatic = items[2][1].toString();
            console.log(borrowWmatic);
            console.log(poolWmatic);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




