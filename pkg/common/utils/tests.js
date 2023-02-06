const dotenv = require('dotenv');
dotenv.config();

const { expect } = require('chai');
const hre = require("hardhat");

const fs = require("fs-extra")

const { node_url, blockNumber } = require("../utils/network");
const {ethers} = require("hardhat");
const {transferETH, getDevWallet, getERC20} = require("./script-utils");

let isTestAssetsCompleted = false;

function greatLess(value, expected, delta) {
    let maxValue = expected.plus(delta);
    let minValue = expected.minus(delta);

    expect(value.gte(minValue)).to.equal(true);
    expect(value.lte(maxValue)).to.equal(true);
}

async function resetHardhat(network) {
    let block = blockNumber(network);
    if (block == 0) {
        const provider = new ethers.providers.JsonRpcProvider(node_url(network));
        block = await provider.getBlockNumber() - 31;
    }

    await hre.network.provider.request({
        method: "hardhat_reset",
        params: [
            {
                forking: {
                    jsonRpcUrl: node_url(network),
                    blockNumber: block,
                },
            },
        ],
    });

    console.log('execute: hardhat_reset');
}

async function prepareArtifacts(){
    const srcDir = `./artifacts-external`;
    const destDir = `./artifacts`;

    await fs.copy(srcDir, destDir, function (err) {
        if (err) {
            console.log('An error occurred while copying the folder.')
            return console.error(err)
        }
    });
}

async function createRandomWallet(){
    let wallet = ethers.Wallet.createRandom().connect(ethers.provider);
    await transferETH(1, wallet.address);
    return  wallet;
}


async function getTestAssets(to){

    let network = process.env.ETH_NETWORK;

    if (isTestAssetsCompleted){
        return;
    }

    if (network === "BSC") {
        await getBusd(to);
    }else if (network === "OPTIMISM"){
        await getUsdcOptimism(to);
    }else {
        throw new Error('Need implement function getTestAssets for network: ' + network);
    }

    isTestAssetsCompleted = true;

}
async function getUsdcOptimism(to){

    let holder = '0x489f866c0698c8d6879f5c0f527bc8281046042d';


    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [holder],
    });

    await transferETH(1, holder);

    const signerWithAddress = await hre.ethers.getSigner(holder);
    let busd = await getERC20("usdc");

    await busd.connect(signerWithAddress).transfer(to, await busd.balanceOf(signerWithAddress.address));
}

async function getBusd(to){


    let holder = '0x5a52e96bacdabb82fd05763e25335261b270efcb';


    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [holder],
    });

    await transferETH(1, holder);

    const signerWithAddress = await hre.ethers.getSigner(holder);
    let busd = await getERC20("busd");

    await busd.connect(signerWithAddress).transfer(to, await busd.balanceOf(signerWithAddress.address));
}


module.exports = {
    greatLess: greatLess,
    resetHardhat: resetHardhat,
    prepareArtifacts: prepareArtifacts,
    createRandomWallet: createRandomWallet,
    getTestAssets: getTestAssets
}
