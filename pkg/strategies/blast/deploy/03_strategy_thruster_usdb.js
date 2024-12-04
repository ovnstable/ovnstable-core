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

    let wallet = await initWallet();

    // await transferETH(10, wallet.address);

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save, {
            factoryOptions: {
                signer: wallet
            },
            gasPrice: 4221834
        });
    });

    await settingSection(strategyName, async (strategy) => {
        await (await strategy.setParams(await getParams(), {gasPrice: 4221834})).wait();
    }, wallet);
};

async function getParams() {
    return {
        pool: '0x147e7416d5988b097b3a1859efecc2c5e04fdf96',
        tickRange: [-1, 0],
        binSearchIterations: 20,
        swapSimulatorAddress: "0x0777Cdf187782832c9D98c0aB73cCdc19D271B54", 
        npmAddress: '0x434575eaea081b735c985fa9bf63cd7b87e227f9', 

        hyperTokenAddress: BLAST.hyper,
        thrustTokenAddress: BLAST.thrust,
        wethTokenAddress: BLAST.weth,

        poolUsdbWeth: '0xf00DA13d2960Cf113edCef6e3f30D92E52906537',
        poolWethHyper: '0xE16fbfcFB800E358De6c3210e86b5f23Fc0f2598',
        poolWethThrust: '0x878C963776F374412C896e4B2a3DB84A36614c7C',

        rewardSwapSlippageBP: 50,
        nfpBooster: '0xAd21b2055974075Ab3E126AC5bF8d7Ee3Fcd848a'
    };
}

module.exports.tags = [strategyName];
module.exports.getParams = getParams;
