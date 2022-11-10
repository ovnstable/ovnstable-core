const {ethers} = require("hardhat");

let {DEFAULT, POLYGON} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const polygonPL = await ethers.getContract("PolygonPayoutListener");
    const exchange = await ethers.getContract("Exchange");
    const usdPlus = await ethers.getContract("UsdPlusToken");

    await (await polygonPL.setExchanger(exchange.address)).wait();

    let dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';
    let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e';

    let params = {
        usdPlus: usdPlus.address,
        dyst: dystToken,
        wmatic: POLYGON.wMatic,
        dystRouter: dystRouter
    }

    await (await polygonPL.setParams(params)).wait();

    let syncPools = [

        // dystopia usdPlus pools
        "0x421a018cc5839c4c0300afb21c725776dc389b1a", // USD+/USDC
        "0x6c51df2275af37c407148e913b5396896e7e8e9e", // USD+/USDC
        "0x291e289c39cbaf5ee158028d086d76ffa141cfda", // USD+/CLAM
        "0x08c170fd3441b4501c2d0a5beb99ab1387bd820b", // USD+/SYN
        "0xb160d25619c9311dff390c8208e49c39cf026f74", // USD+/FRAX
        "0x28d7286b8567f0e8a11fdcb282d46cc3701b5cd9", // USD+/loopONE

        // mesh usdPlus pools
        "0x68b7cEd0dBA382a0eC705d6d97608B7bA3CD8C55",  // USDC/USD+

        // QuickSwap usdPlus pools
        "0x901Debb34469e89FeCA591f5E5336984151fEc39",  // USD+/WETH
        "0x91F670270B86C80Ec92bB6B5914E6532cA967bFB",  // WMATIC/USD+
        "0x143b882e58fd8c543da98c7d84063a5ae34925da"   // USD+/PBIRB
    ]

    await (await polygonPL.setSyncPools(syncPools)).wait();

    let skimPools = [
        '0x1a5feba5d5846b3b840312bd04d76ddaa6220170', // USD+/WMATIC
        '0xcf107443b87d9f9a6db946d02cb5df5ef5299c95', // USD+/WETH
        '0x5a272ad79cbd3c874879e3fec5753c2127f77583', // USD+/TETY
        '0xb8e91631f348dd1f47cb46f162df458a556c6f1e', // USD+/SPHERE
        '0x6f2fed287e47590b7702f9d331344c7dacbacfe5', // USD+/stMATIC
    ];

    let bribes= [
        '0x266a4e94640160b8d897e0491e8c16b99f1c08d5',
        '0x9a1e885a6d584053827277cb4e4df1231e5a2ad5',
        '0x87a35da30de63746b863ab36161d946042c5ee75',
        '0x28b85d89ad308ba82a40da0700ed913c8a078fb1',
        '0x71b963a6bddc317e5a35a3072af8da7236fdb37d',
    ];
    await (await polygonPL.setSkimPools(skimPools, bribes)).wait();

    await (await polygonPL.setSushiBentoBox('0x0319000133d3AdA02600f0875d2cf03D442C3367')).wait();

    await (await polygonPL.setSushiWallet('0x850a57630A2012B2494779fBc86bBc24F2a7baeF')).wait();

    await (await polygonPL.setDystopiaWallet('0x20D61737f972EEcB0aF5f0a85ab358Cd083Dd56a')).wait();

    console.log('PolygonPayoutListener done');

};

module.exports.tags = ['SettingPolygonPayoutListener'];

