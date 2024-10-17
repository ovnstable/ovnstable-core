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
    // console.log("beta well", (await well.balanceOf(morphoBeta.address)).toString());
    console.log("treasury well", (await well.balanceOf(COMMON.rewardWallet)).toString());

    console.log("alpha usdc", (await usdc.balanceOf(morphoAlpha.address)).toString());
    // console.log("beta usdc", (await usdc.balanceOf(morphoBeta.address)).toString());
    console.log("treasury usdc", (await usdc.balanceOf(COMMON.rewardWallet)).toString());

    let dataAlpha = ["0x6b89026a0000000000000000000000009e3380f8b29e8f85ca19effa80fb41149417d9430000000000000000000000002e99704871c726893c94bbe7e5ba4c2bed976a86000000000000000000000000a88594d404727625a9437c3f886c7643872296ae000000000000000000000000000000000000000000030b0df9e8274d4152444700000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000ee635f0b5ee6018fd22a1e7f1c40be8205f25182fdf48efd649390780fa72538ad2c98b22a2169ef0c47fc67a98d40d6491abaf0200f6eb280c3aa726d0887abacbaa60ecae6b1da2f0c0b737a2b6f900a92bff339c474a23f9da3935f9933620533ba09b0b9a517b297829a7ffe948be54e105f4468fa8220c8b1969922af681959db497a28bc4efc67c03c6bb6bbbf1d31767947b7b92a875bb0ff58b99d11ee5d7f993e204258577a965e67a487ff1f0160fa09db879ccf67a3527fadbaaba2d6c6b91925c4f4d0883a81ac965d7abb8349b074612a806ddf54d1ebefefd44965e807684e247c0adbaeaa38f1ebad14136a1d7251c42de5e611c0efaef3d618ff50e2538947db200ed115ec8c8858211f8c1fdb43f602aa20d5c5a8894efed7048c8df0ec111e2e19d5d45355210944b7ab1e60d3cba7ba48758805ffb4121b9f1d42aa8b7b682194c1e58a43e4bb0de90f2532c440a3c558b486865967782a481bb8eeb2e3caeb03c17fd38862d618a5f63211dfc0f7d04bee5fca7b029011ccc8f00b4b772ad92c8941798184d0bc59841c863c8d9bfa037b7eac7780983f99924953a0f557506d02d3e2987fc496b5d4c0e338c7de988992c9d13ca15f5"]

    // let dataBeta = ["0x6b89026a0000000000000000000000005400dbb270c956e8985184335a1c62aca6ce1333000000000000000000000000e1d2e5d59f8802b0249ea12d9ac94249d6bff17c000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000009522bc7000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000be251b0c2ed1c7ca890d0a2f632f3fe46ad25e6c35b6e1fd3b2307f37ea7576e9c9b16d786fda5f26f1e76f0361953fa080d162153f536db4a8ac286b69a92bb64c1a9c0e7da0950ef9f7cc4b81481a7722bae43b33e8a211cc3b8fbae5f3f28d00feec6ba1f488814a00917df08b30618869653dabadf72b920c942725462af042caefa463f6cca66f540df71fdbcb21338c22ec003031403907a31ef659fa1669688c5627086f09a253a5a52ed1d6f3c9ceea09564d2d3ce6a24c2e35987b65bdccce1391d9f2c8f8fb80722fc794f5b4f71ed8a653f100d6c958591646a9148939bb11439dcb48cb9c4d4ca1317c8fb32b7f3fc34d7c0a770444a6d2d433a74756fc4e79171a8c8f1077d218283c9fd1c765d7e29c02e1a6a44cc218e67b7167b036b179c60e19dcb8ba3fd3350c2680272b4513baa8c18b1a7636673054d8171b88484e4b5afd10033a6ffeb502eba972af3d7d6773d8e9d7712dc4bd0a5a"]
    // addProposalItem(morphoAlpha, 'claimMerkleTreeRewards', [COMMON.rewardWallet, dataAlpha, BASE.morphoChainAgnosticBundler]);
    // addProposalItem(morphoBeta, 'claimMerkleTreeRewards', [COMMON.rewardWallet, dataBeta, BASE.morphoChainAgnosticBundler]);
    
    await morphoAlpha.connect(wallet).claimMerkleTreeRewards(COMMON.rewardWallet, dataAlpha, BASE.morphoChainAgnosticBundler);
    // await morphoBeta.connect(wallet).claimMerkleTreeRewards(COMMON.rewardWallet, dataBeta, BASE.morphoChainAgnosticBundler);

    console.log("alpha well", (await well.balanceOf(morphoAlpha.address)).toString());
    // console.log("beta well", (await well.balanceOf(morphoBeta.address)).toString());
    console.log("treasury well", (await well.balanceOf(COMMON.rewardWallet)).toString());

    console.log("alpha usdc", (await usdc.balanceOf(morphoAlpha.address)).toString());
    // console.log("beta usdc", (await usdc.balanceOf(morphoBeta.address)).toString());
    console.log("treasury usdc", (await usdc.balanceOf(COMMON.rewardWallet)).toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

