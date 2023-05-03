const dotenv = require('dotenv');
dotenv.config();

const {expect} = require('chai');
const hre = require("hardhat");

const fs = require("fs-extra")

const {node_url, blockNumber} = require("../utils/network");
const {ethers} = require("hardhat");
const {transferETH, getDevWallet, getERC20, transferAsset, execTimelock, getContract} = require("./script-utils");
const HedgeExchangerABI = require("./abi/HedgeExchanger.json");
const StakerABI = require("./abi/Staker.json");
const {Roles} = require("./roles");
const {ARBITRUM, OPTIMISM, BSC, DEFAULT} = require("./assets");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

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


async function impersonatingEtsGrantRole(hedgeExchangerAddress, ownerAddress, strategyAddress) {

    console.log('Execute: [impersonatingEtsGrantRole]');
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ownerAddress],
    });
    const owner = await ethers.getSigner(ownerAddress);
    let hedgeExchanger = await ethers.getContractAt(HedgeExchangerABI, hedgeExchangerAddress);
    await hedgeExchanger.connect(owner).grantRole(Roles.WHITELIST_ROLE, strategyAddress);
    await hedgeExchanger.connect(owner).grantRole(Roles.FREE_RIDER_ROLE, strategyAddress);
    if (process.env.STAND === 'arbitrum') {
        await hedgeExchanger.connect(owner).setBlockGetter(ZERO_ADDRESS);
    }
    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [ownerAddress],
    });
}

async function impersonatingStaker(stakerAddress, ownerAddress, strategyAddress, pair, gauge) {

    console.log('Execute: [impersonatingStaker]');
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ownerAddress],
    });

    await transferETH(1, ownerAddress);
    const owner = await ethers.getSigner(ownerAddress);
    let staker = await ethers.getContractAt(StakerABI, stakerAddress);
    await staker.connect(owner).whitelistStrategy(strategyAddress, pair, gauge);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [ownerAddress],
    });
}

async function prepareArtifacts() {
    const srcDir = `./artifacts-external`;
    const destDir = `./artifacts`;

    await fs.copy(srcDir, destDir, function (err) {
        if (err) {
            console.log('An error occurred while copying the folder.')
            return console.error(err)
        }
    });
}

async function createRandomWallet() {
    let wallet = ethers.Wallet.createRandom().connect(ethers.provider);
    await transferETH(1, wallet.address);
    return wallet;
}


async function getTestAssets(to) {

    let stand = process.env.STAND;

    if (isTestAssetsCompleted) {
        return;
    }

    if (stand === "optimism_dai") {
        await transferAsset(OPTIMISM.dai, to);
    } else if (stand === "arbitrum_dai") {
        await transferAsset(ARBITRUM.dai, to);
    } else if (stand === "bsc_usdt") {
        await transferAsset(BSC.usdt, to);
    } else {
        await transferAsset(DEFAULT.usdc, to);
    }

    isTestAssetsCompleted = true;

}

async function prepareEnvironment(){

    if (process.env.STAND.includes('arbitrum')){

        await execTimelock(async (timelock)=>{
            let exchange = await getContract('Exchange', 'arbitrum');
            await exchange.connect(timelock).setBlockGetter(ZERO_ADDRESS);
            console.log('[Test] exchange.setBlockGetter(zero)');
        });
    }

}

module.exports = {
    greatLess: greatLess,
    resetHardhat: resetHardhat,
    prepareEnvironment: prepareEnvironment,
    prepareArtifacts: prepareArtifacts,
    createRandomWallet: createRandomWallet,
    getTestAssets: getTestAssets,
    impersonatingEtsGrantRole: impersonatingEtsGrantRole,
    impersonatingStaker: impersonatingStaker
}
