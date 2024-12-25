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
        ["152456877230060000000000"],                   // amounts
        [                                               // proofs
            [
                "0x66d2c3685d11487a88232c1efe299c853915beb6f5665e3d89b9c40d8399f94c",
                "0x115b6fdccf91ce52e25fede8203f746c951de122b5b140094b5e56d1138911d8",
                "0x69cb2b0b5184563565119d5e0948ad89ad504f0e4964b4ca415c128cf2f1ce02",
                "0x0a2a19b5919f49bde87da97b34c96ff2d472aab9180a4cc83e517bd2a3a3c1b9",
                "0xec17d8d979502cc4c17d9a6c819258b9df718d0d6c8dce3c44ddd7b5a4fbcfd5",
                "0xd9505bce68acfbb69e2108fa6ed8eb193460e2b3b6c1800102714241088aa913",
                "0x1fccb1ee7caf5607faeb31d24e55125b59ec5acea55835e78c0da48ee78b9e2c",
                "0xebf5ac7b988e995d253f951bad50c164b87ff5dc04c8b99ec736fd9e9fb5fa2b",
                "0x10645a80af32ea7fa73c9558114ccc1d8796c123d586e964a5c6931b265c2d40",
                "0xe9538d71b259818f654f202992a27adec1833b020f9393e3c3847fb2b9d683d4",
                "0x83f21b6c8501bdd7b50b4d2171c742c50400deedfceb33f95ad156706a113d40",
                "0xb29e59e62fdfbf380bba751d41ecd53fc344222c0563cb929dc8775768477139",
                "0x26354bb4b2e2321e935130b3a5c81d86a889582c5eff953374142d96350834aa",
                "0x0035811ff0994b8c39fc98b126dd39d18574f6a36ce4b9c452203a3c07b3f1d7",
                "0xb7c591d08ca34a35d5f0631f5e442fcb5287c4c280afd4dbfdabb69a646fd41f",
                "0x95cf461a7e61137994bf50bc4ab6166da9dc06e1a9705daad9b9f0e007ed44d0"
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