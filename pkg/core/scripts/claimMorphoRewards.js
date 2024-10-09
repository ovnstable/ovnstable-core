const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const { strategyMorphoAlpha } = require("@overnight-contracts/strategies-base/deploy/22_strategy_morpho_alpha");
const { strategyMorphoBeta } = require("@overnight-contracts/strategies-base/deploy/24_strategy_morpho_beta");
const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let wallet = await initWallet();
    // await transferETH(1, wallet.address);
    

    let morphoAlpha = await getContract('StrategyMorphoAlpha', 'base');
    let morphoBeta = await getContract('StrategyMorphoBeta', 'base');  
    
    let well = await getERC20ByAddress(BASE.well, wallet.address);
    let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);

    console.log("alpha well", (await well.balanceOf(morphoAlpha.address)).toString());
    console.log("beta well", (await well.balanceOf(morphoBeta.address)).toString());
    console.log("treasury well", (await well.balanceOf(COMMON.rewardWallet)).toString());

    console.log("alpha usdc", (await usdc.balanceOf(morphoAlpha.address)).toString());
    console.log("beta usdc", (await usdc.balanceOf(morphoBeta.address)).toString());
    console.log("treasury usdc", (await usdc.balanceOf(COMMON.rewardWallet)).toString());

    let dataAlpha = ["0x6b89026a0000000000000000000000009e3380f8b29e8f85ca19effa80fb41149417d9430000000000000000000000002e99704871c726893c94bbe7e5ba4c2bed976a86000000000000000000000000a88594d404727625a9437c3f886c7643872296ae000000000000000000000000000000000000000000003fd9052acee6e0ecf5b100000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000cda3618da2629bd5367a20a219310eaac53421738bd8fe0ee069c4509d8859851facea566791f108a28e4c43c5e0a404268ec3eee7197fa8a051b73ceb7e536a438837518d8460be54825697605d98bdaeda3ab654cb96225f22a7dc532d27e1a74c351897f8246175908045d48c0af381ca688b1203de616af2b870963b96eab819409d0331d4fb19f558a434605a33ec85f768655ebab307970f479f1e4972ba73a7729cc133a2a656b667fd3ce725fc2b09d5c5935dcb1ea5d53b82645b633c438fe255361b52ca379ee1bfddd8c6f724f3904d9dd6911be791b13964c1b68fe56a913b67eb45eec358e1d4705d976c6634e6c62eefa9fa00995c958c2f5dad19647a2ffd05dbc9e184a1d505d80cd1b849ef358fea53381189eaf4a59cb9227f1d1cfdbf0e8f7fce95e196ac631d1c3c34abe7700f7e3458914c7c6b0825eece254b7316ee14d01671672be4be72c58ba733a31fc35af4f1d7b59b2692c4accd1ad6a67bc3f47ddf68c25ebffb25b73a35029105e37da70a04b8f2777652a",
    "0x6b89026a0000000000000000000000005400dbb270c956e8985184335a1c62aca6ce13330000000000000000000000002e99704871c726893c94bbe7e5ba4c2bed976a86000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda029130000000000000000000000000000000000000000000000000000000052ab37c300000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000b6c2eceeebef82b541db7ae8eb7831bcdb17876f8b41797eecffe14288e94660a67cea24ec676f6c24304786b29d852b7c665c5f3efa0cd5cbe41679bda25a3935d4617aea5621f0162bcd220d430c3236883f61e000f773e42380aeb4235f1935cf18a609666109e79d083d02159a7a251df25576360db598feb072b5b9a6bf10a40c3c22346bbaf4ce0da89bfeeb1d44e5d1563c572f02ea3e9a086d4bc1247b6c4e6f28749b01cfc7d74a74b4803549e6eb2f077de8c11130029ef61bcc19c72f3dc6947c6ce1c3731140c07142be748c60d98cd3d13cf7c0e45a847fa37f2f41a2b338004af011f39c96fa0d3bd9feea556a72d70b89de6f684cc2ac55da3fd46f37bdf43772ffc1dc3736a0d0d6737f5866c4221c5e3eecf44e81de2c42fc540c469ccee802e66d5e2138d9fd1f50d2819df2fba9f1ebf549c8967827697d49a78bf5bb0899bef206895ed8de1b5ec2d746b5e48dfd4047a01a00664e341"]

    let dataBeta = ["0x6b89026a0000000000000000000000005400dbb270c956e8985184335a1c62aca6ce1333000000000000000000000000e1d2e5d59f8802b0249ea12d9ac94249d6bff17c000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000009522bc7000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000be251b0c2ed1c7ca890d0a2f632f3fe46ad25e6c35b6e1fd3b2307f37ea7576e9c9b16d786fda5f26f1e76f0361953fa080d162153f536db4a8ac286b69a92bb64c1a9c0e7da0950ef9f7cc4b81481a7722bae43b33e8a211cc3b8fbae5f3f28d00feec6ba1f488814a00917df08b30618869653dabadf72b920c942725462af042caefa463f6cca66f540df71fdbcb21338c22ec003031403907a31ef659fa1669688c5627086f09a253a5a52ed1d6f3c9ceea09564d2d3ce6a24c2e35987b65bdccce1391d9f2c8f8fb80722fc794f5b4f71ed8a653f100d6c958591646a9148939bb11439dcb48cb9c4d4ca1317c8fb32b7f3fc34d7c0a770444a6d2d433a74756fc4e79171a8c8f1077d218283c9fd1c765d7e29c02e1a6a44cc218e67b7167b036b179c60e19dcb8ba3fd3350c2680272b4513baa8c18b1a7636673054d8171b88484e4b5afd10033a6ffeb502eba972af3d7d6773d8e9d7712dc4bd0a5a"]
    // addProposalItem(morphoAlpha, 'claimMerkleTreeRewards', [COMMON.rewardWallet, dataAlpha, BASE.morphoChainAgnosticBundler]);
    // addProposalItem(morphoBeta, 'claimMerkleTreeRewards', [COMMON.rewardWallet, dataBeta, BASE.morphoChainAgnosticBundler]);
    
    await morphoAlpha.connect(wallet).claimMerkleTreeRewards(COMMON.rewardWallet, dataAlpha, BASE.morphoChainAgnosticBundler);
    await morphoBeta.connect(wallet).claimMerkleTreeRewards(COMMON.rewardWallet, dataBeta, BASE.morphoChainAgnosticBundler);

    console.log("alpha well", (await well.balanceOf(morphoAlpha.address)).toString());
    console.log("beta well", (await well.balanceOf(morphoBeta.address)).toString());
    console.log("treasury well", (await well.balanceOf(COMMON.rewardWallet)).toString());

    console.log("alpha usdc", (await usdc.balanceOf(morphoAlpha.address)).toString());
    console.log("beta usdc", (await usdc.balanceOf(morphoBeta.address)).toString());
    console.log("treasury usdc", (await usdc.balanceOf(COMMON.rewardWallet)).toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

