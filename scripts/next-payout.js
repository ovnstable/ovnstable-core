const hre = require("hardhat");
const fs = require("fs");
const {fromWmatic, toUSDC, fromOvn} = require("../utils/decimals");
const ethers = hre.ethers;

let PM = JSON.parse(fs.readFileSync('./deployments/polygon_dev/Portfolio.json'));
let M2M = JSON.parse(fs.readFileSync('./deployments/polygon_dev/Mark2Market.json'));
let EX = JSON.parse(fs.readFileSync('./deployments/polygon_dev/Exchange.json'));

async function main() {

    let mark2Market = await ethers.getContractAt(M2M.abi, M2M.address);

    let newVar = await mark2Market.assetPricesView();

    for (let i = 0; i < newVar.length; i++) {
        let element = newVar[i];
        console.log('Element: ' + element)
    }
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




