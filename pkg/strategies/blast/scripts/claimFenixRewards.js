const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const path = require('path');

const {BASE, COMMON, BLAST} = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let fenixSwap = await getContract('StrategyFenixSwap', 'localhost'); 
    let gas = {
        gasLimit: 20000000,
        // maxFeePerGas: "38000000",
        // maxPriorityFeePerGas: "1300000",
    }

    // await transferETH(10, "0x086dFe298907DFf27BD593BD85208D57e0155c94");

    let usdb = await getERC20ByAddress(BLAST.usdb);
    let amountFrom = await usdb.balanceOf(fenixSwap.address);
    console.log("DEBUG: amountFrom =", amountFrom.toString());

    await fenixSwap.claimMerkl(
        ["0xa09A8e94FBaAC9261af8f34d810D96b923B559D2"], // users
        ["0x52f847356b38720B55ee18Cb3e094ca11C85A192"], // tokens
        ["729918395319760000000000"],                   // amounts
        [                                               // proofs
            [
                "0xbe8f6ac0447efdeadd0b00199ac8f4a00635a6ddc8b9cbcf056d12060a374e6c",
                "0x54fa3236bfca25f394d2a215da35dff3e5a797effe2688f3a5c558704a82f67c",
                "0x322fe8113104ed1db2d9d549c243d80c86f2b902611e3cc1c1e248a26a2a9646",
                "0x76e7d1deb4574ce6ab767157c31f5966ca0cd83bc8cd1a02ebfdaddede0a1bf0",
                "0x647dd170b2ec9cd937ae1157fbb54197dd56c5666eba4a65f8c358ed6fbbae99",
                "0x176ec048fa48ff6fc3845a1f14db59f8feaa714af3d7726a4af91dc457ec4fbb",
                "0x87507c56149ca0837beb19f4c645e7fe8b0e3ae6af173da310a5beeae4b58c4b",
                "0xb2495cf0fb1e1f1152b081ae4c70c7eb88e8d78bbcbb3157eb2b4ab947170906",
                "0x6b25ff911929ea5dd489792350be840d7a4bb08e8b5f5a8f88471dff0be1c540",
                "0x18db72de8756d4673c1c3b5fabd9f2050440bad57d681fe68c610a17f3d88bc6",
                "0x968e2791404f12e392a6499b7637bfea33cbdca284e249a99b9a463b969dff94",
                "0x0df4e42371b9a7b3b0d67269250d628d103ffd28e6cb11166b6d3332dc7ed369",
                "0xb61aeaa68c19b4daa395139a4d6b367b61e0a695ffcdea92fe641557a9ca1327",
                "0x519b5e126c170d1563b14059d30ce2ef705c196d987f701e9be906a63a1cc19d",
                "0x82039488904769e7a346464de1a7a7a688b361e2ea365ab988d73b4041d135d2",
                "0x039d172f6e9f9e9ccd4040edc8d3f63b1974d6f582cbc712bd77c21dc807f1a5",
                "0xdb9d3e7454ffc3a327e091142b781724a9c377e5371f1edc422f5996ad96e145"
            ]
        ]
    , gas);

    let amountTo = await usdb.balanceOf(fenixSwap.address);
    console.log("DEBUG: amountTo =", amountTo.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });