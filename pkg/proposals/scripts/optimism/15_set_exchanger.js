const hre = require("hardhat");
const {getContract, showM2M, execTimelock, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {ethers} = require("hardhat");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));


let EXCHANGER_ABI =     {
    "inputs": [
        {
            "internalType": "address",
            "name": "_strategy",
            "type": "address"
        }
    ],
    "name": "setStrategy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let gammaOp = await getContract('StrategyEtsGamma', 'optimism');
    let betaOp = await getContract('StrategyEtsBeta', 'optimism');

    let gammaOpParams =  {
        asset: OPTIMISM.usdc,
        rebaseToken: '0xa78BE2fD2A7357961D950A235fF52Ce0b8f31201',
        hedgeExchanger: '0x625BF97ED7701957Db8123767Ac1c6302F0b2119',
    }

    addresses.push(gammaOp.address);
    values.push(0);
    abis.push(gammaOp.interface.encodeFunctionData('setParams', [gammaOpParams]));


    let betaOpParams =  {
        asset: OPTIMISM.usdc,
        rebaseToken: '0x8b9e8868695e1b3156359f31335D6Bbc83CB0D4b',
        hedgeExchanger: '0xCa32f8Ffa4C6C12De7f98c461e618C7AfeC1B800',
    }


    addresses.push(betaOp.address);
    values.push(0);
    abis.push(betaOp.interface.encodeFunctionData('setParams', [betaOpParams]));


    let exchanger = await ethers.getContractAt([EXCHANGER_ABI], betaOpParams.hedgeExchanger, await initWallet());

    addresses.push(exchanger.address);
    values.push(0);
    abis.push(exchanger.interface.encodeFunctionData('setStrategy', ["0xd547FFB583934425d84829b8C73A3Cacb4Efd5f2"]));
    //
    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    //
    // await testStrategy(filename,betaOp, 'optimism');
    // await testStrategy(filename,gammaOp, 'optimism');
    // await testUsdPlus(filename, 'optimism');
    //
    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

