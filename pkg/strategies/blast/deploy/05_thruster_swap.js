const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BLAST} = require('@overnight-contracts/common/utils/assets');
const {
    deploySection, 
    settingSection, 
    getContract, 
    initWallet, 
    transferETH, 
    execTimelock
} = require("@overnight-contracts/common/utils/script-utils");
const { Roles } = require('@overnight-contracts/common/utils/roles');

let strategyName = 'StrategyThrusterSwap';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    // let timelock = await getContract('AgentTimelock');
    // console.log("timelockAccount is", timelock.address)

    

    // let wallet = await initWallet();

    // await transferETH(10, timelock.address);
    // await transferETH(10, wallet.address);

    // hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545');

    // await hre.network.provider.request({
    //     method: "hardhat_impersonateAccount",
    //     params: [timelock.address],
    // });

    // const timelockAccount = await hre.ethers.getSigner(timelock.address);
    
    // await (await strategy.connect(timelockAccount).grantRole('0x0000000000000000000000000000000000000000000000000000000000000000', '0xe12e06d810f08b7703d5266081f8023acd21ce9d'));

    // await hre.network.provider.request({
    //     method: "hardhat_stopImpersonatingAccount",
    //     params: [timelock.address],
    // });


    // await transferETH(10, "0xe12e06d810f08b7703d5266081f8023acd21ce9d");

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    let strategy = await getContract(strategyName, 'blast');
    
    console.log("Setting...")

    await settingSection(strategyName, async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });

    
    // console.log(getParams())
    // await (await strategy.setParams(await getParams())).wait();
    console.log("Set!")
};

// hh deploy --tags StrategyThrusterSwap --impl --verify --network blast 

async function getParams() {
    return {
        pool: '0x147e7416d5988b097b3a1859efecc2c5e04fdf96',
        swapSimulatorAddress: "0x4c8d2730C5094587c6EccCdE971B9046A7e36525", 
        npmAddress: '0x434575eaea081b735c985fa9bf63cd7b87e227f9', 
        nfpBooster: '0xAd21b2055974075Ab3E126AC5bF8d7Ee3Fcd848a',

        poolUsdbWeth: '0xf00DA13d2960Cf113edCef6e3f30D92E52906537',
        poolWethHyper: '0xE16fbfcFB800E358De6c3210e86b5f23Fc0f2598',
        poolWethThrust: '0x878C963776F374412C896e4B2a3DB84A36614c7C',

        hyperTokenAddress: BLAST.hyper,
        thrustTokenAddress: BLAST.thrust,
        wethTokenAddress: BLAST.weth,

        lowerTick: -1,
        upperTick: 0,
        binSearchIterations: 20,
        rewardSwapSlippageBP: 500,
        liquidityDecreaseDeviationBP: 500
    };
}

module.exports.tags = [strategyName];
module.exports.getStrategyFenixSwapParams = getParams;