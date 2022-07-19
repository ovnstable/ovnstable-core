const hre = require("hardhat");
const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const ethers = hre.ethers;


async function main() {

    let price = await getPrice();

    let governor = await getContract('OvnGovernor', 'polygon');
    let strategy1 = await getContract('StrategyDystopiaUsdcUsdt', 'polygon');
    let strategy2 = await getContract('StrategyDystopiaUsdcDai', 'polygon');

    let addresses = [];
    let values = [];
    let abis = [];


    let {POLYGON} = require('@overnight-contracts/common/utils/assets');
    let {core} = require('@overnight-contracts/common/utils/core');

    let dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';
    let dystPair = '0x4570da74232c1A784E77c2a260F85cdDA8e7d47B'; //sAMM-USDC/USDT
    let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
    let gauge = '0x7c9716266795a04ae1fbbd017dc2585fbf78076d'; //aka MasterChef
    let penToken = '0x9008D70A5282a936552593f410AbcBcE2F891A97';
    let userProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
    let penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';
    let swapper = '0x019D17272687904F855D235dbBA7fD9268088Ea5';


    addresses.push(strategy1.address);
    values.push(0);
    abis.push(strategy1.interface.encodeFunctionData('upgradeTo', ['0xe7b9B24f09cb9039F13a4660f29453549702Bca6']));

    addresses.push(strategy1.address);
    values.push(0);
    abis.push(strategy1.interface.encodeFunctionData('setParams', [
        gauge,
        dystPair,
        dystRouter,
        POLYGON.balancerVault,
        POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
        POLYGON.oracleChainlinkUsdc,
        POLYGON.oracleChainlinkUsdt,
        userProxy,
        penLens,
        swapper
    ]));

    addresses.push(strategy2.address);
    values.push(0);
    abis.push(strategy2.interface.encodeFunctionData('upgradeTo', ['0xF586C5047967DA9f62A8A308119F0811d4b356Be']));

    dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';
    dystPair = '0xFec23508fE4b5d10A3eb0D83b9947CAa56F39463'; //sAMM-USDC/DAI
    dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
    gauge = '0x9c3Afbc9D0540168C6D4f3dA0F48FeBA6a3A7d2a'; //aka MasterChef
    penToken = '0x9008D70A5282a936552593f410AbcBcE2F891A97';
    userProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
    penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';
    swapper = '0x019D17272687904F855D235dbBA7fD9268088Ea5';

    addresses.push(strategy2.address);
    values.push(0);
    abis.push(strategy2.interface.encodeFunctionData('setParams', [
        gauge,
        dystPair,
        dystRouter,
        POLYGON.balancerVault,
        POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
        POLYGON.oracleChainlinkUsdc,
        POLYGON.oracleChainlinkDai,
        userProxy,
        penLens,
        swapper
    ]));

    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id(abis.toString()),
        price
    );
    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event === 'ProposalCreated').args.proposalId;
    console.log('Proposal id ' + proposalId)
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

