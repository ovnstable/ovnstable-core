const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const path = require('path');

const {BASE, COMMON, BLAST} = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    
    let fenixSwap = await getContract('StrategyFenixSwap', 'blast'); 

    await fenixSwap.claimMerkleTreeRewards(
        BLAST.distributor,
        ["0xa09A8e94FBaAC9261af8f34d810D96b923B559D2"], // users
        ["0x52f847356b38720B55ee18Cb3e094ca11C85A192"], // tokens
        ["99460822648030000000000"],                    // amounts
        [                                               // proofs
            [
                "0x486e6b567c832ef44fddab7bee6d1bbd3802f641801e1076349a346c9ce9d452",
                "0x4704c8d2d32ae036b676fcefc156a90e3d80c463261d4f6241d1fd833e3eda75",
                "0x8f3c4fa45d4dce0051092046f3814647c28bfd6a23f29aee1d84aa35680a4e1a",
                "0x6e51cc5de0f24895ce100a963de2d140b94e4bd632d953626b78cbcd1cc2b932",
                "0x5ef0656eb20c4bec517f37fd6fc0f6ec8ec7bd3a3abbb4855215b447164d808c",
                "0x1be342af23bb70e388168d604d1336fe273c87874c38463b0bdd25382b0b56ac",
                "0xe3c0e4c61a2d02cfd828e2c3374f35a20bde0006ba79c3e825542304dde48c6f",
                "0x7f37ced169cabe0a900abacd417132912a9d854654fa86177731ec17943e822c",
                "0x00ae0068b94cb999644069222e5843f689c50cb313dd13a51d7f547f617cc17e",
                "0xe7ed5803019edfdfe1e036d6841c384bbc7673557f993a89c06dd7de8340453a",
                "0xbd5020973637e01d41c982fdea907cbe9761e41a71f58e27ae5ce32fe1d49719",
                "0x17f2f1c91cacb6e51c6ce7f59cc1c5d745e2ac04ef32fc66278d33ccba7c1a61",
                "0x76fa51b1845c8121043dcb291175b28c49c2a39c58352dfe3595f3f9e648c7ef",
                "0xa053f9ce478540e89931f9ea44dda9a951cf4715bf7ce655193049369157ae90",
                "0x1957a1b8561106c78b45105511ebbbac3367f5eb0cd393b1aae60f87815193aa",
                "0xf4fc88a53f7431cd0c1c9fb6490a9eb571c59e971610678c089523afe553f1bb"
            ]
        ]
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });