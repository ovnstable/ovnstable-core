const hre = require("hardhat");
const fs = require("fs");
const {fromE18, fromUSDC} = require("../utils/decimals");
const axios = require("axios");
const {MerkleTree} = require("../utils/merkleTree");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let StrategyBalancer = JSON.parse(fs.readFileSync('./deployments/localhost/StrategyBalancer.json'));

async function main() {

    let strategyBalancer = await ethers.getContractAt(StrategyBalancer.abi, StrategyBalancer.address );

    let balanceUsdc = 0;

    // get balance and merkleProof for bal
    let responseBal = await axios.get('https://raw.githubusercontent.com/balancer-labs/bal-mining-scripts/master/reports/90/__polygon_0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3.json');

    let balanceBal;
    let elementBal;
    let elementsBal = [];
    Object.keys(responseBal.data).forEach(function(key) {
        let balance = responseBal.data[key].replace('.', '').replace(/^0+/, '') + '0000000000';
        let element = encodeElement(key, balance);
        if (key === '0xfA8Bb3CED390eDB598000A118491d990304df550') {
            balanceBal = balance;
            elementBal = element;
            console.log(balanceBal);
            console.log(elementBal);
        }
        elementsBal.push(element);
    });

    let merkleTreeBal = new MerkleTree(elementsBal);
    let merkleProofBal = await merkleTreeBal.getHexProof(elementBal);
    console.log(merkleProofBal);

    // get balance and merkleProof for tUsd
    let responseTUsd = await axios.get('https://raw.githubusercontent.com/balancer-labs/bal-mining-scripts/master/reports/90/__polygon_0x2e1ad108ff1d8c782fcbbb89aad783ac49586756.json');

    let balanceTUsd;
    let elementTUsd;
    let elementsTUsd = [];
    Object.keys(responseTUsd.data).forEach(function(key) {
        let balance = responseTUsd.data[key].replace('.', '').replace(/^0+/, '') + '0000000000';
        let element = encodeElement(key, balance);
        if (key === '0xfA8Bb3CED390eDB598000A118491d990304df550') {
            balanceTUsd = balance;
            elementTUsd = element;
            console.log(balanceTUsd);
            console.log(elementTUsd);
        }
        elementsTUsd.push(element);
    });

    let merkleTreeTUsd = new MerkleTree(elementsTUsd);
    let merkleProofTUsd = await merkleTreeTUsd.getHexProof(elementTUsd);
    console.log(merkleProofTUsd);

    // verify claim
    // await strategyBalancer.verifyClaim(balanceBal, 0, balanceTUsd, merkleProofBal, [], merkleProofTUsd);
    await strategyBalancer.claimRewardsTest(balanceBal, 0, balanceTUsd, merkleProofBal, [], merkleProofTUsd);
}

function encodeElement(address, balance) {
    return ethers.utils.solidityKeccak256(['address', 'uint'], [address, balance]);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

