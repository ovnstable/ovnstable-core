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

let strategyName = 'StrategyFenixSwap';

// 0xBa6b468e6672514f3c59D5D8B8731B1956BA5D22 - proxy
// 0xa3d9A772005B3a00a568aeB87e47B54E8Aa56D31 - imp

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let wallet = await initWallet();

    await transferETH(10, wallet.address);

    console.log("DEBUG: Деплоим стратегию")

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save, {
            factoryOptions: {
                signer: wallet
            },
            gasPrice: 4221834
        });
    });

    console.log("DEBUG: Деплой стратегии выполнен (ну, скорее всего)")

    console.log("DEBUG: Сеттим значения")

    await settingSection(strategyName, async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
        await (await strategy.setStrategyName('FenixSwap')).wait();
    }, wallet);

    console.log("DEBUG: Вроде как засеттили значения")
};

async function getParams() {
    return {
        pool: '0x6a1de1841c5c3712e3bc7c75ce3d57dedec6915f',
        tickRange: [-1, 0],
        binSearchIterations: 20,
        swapSimulatorAddress: '0xD34063601f4f512bAB89c0c0bF8aa947cAa55885', // SwapSimulatorFenix address 
        npmAddress: '0x8881b3fb762d1d50e6172f621f107e24299aa1cd', 

        fnxTokenAddress: '0x52f847356b38720b55ee18cb3e094ca11c85a192',

        // Fenix's pools for reward swaping
        poolFnxUsdb: '0x52f847356b38720b55ee18cb3e094ca11c85a192',
        poolUsdbUsdPlus: '0x52f847356b38720b55ee18cb3e094ca11c85a192',

        rewardSwapSlippageBP: 50
    };
}

module.exports.tags = [strategyName];
module.exports.getParams = getParams;


// ОСТАНОВКА: добавить в SwapSimulator логгирование в метод swap