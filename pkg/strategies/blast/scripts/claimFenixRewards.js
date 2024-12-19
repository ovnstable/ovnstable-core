const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const path = require('path');

const {BASE, COMMON, BLAST} = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    
    let fenixSwap = await getContract('StrategyFenixSwap', 'blast'); 

    // for TESTING

    // let timelock = await getContract('AgentTimelock');
    // hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545');

    // await hre.network.provider.request({
    //     method: "hardhat_impersonateAccount",
    //     params: [timelock.address],
    // });

    // const timelockAccount = await hre.ethers.getSigner(timelock.address);

    // await (await fenixSwap.connect(timelockAccount).grantRole('0xd67ad422505496469a1adf6cdf9e5ee92ac5d33992843c9ecc4b2f6d6cde9137', '0x8df424e487De4218B347e1798efA11A078fecE90')).wait();
    // await (await fenixSwap.connect(timelockAccount).grantRole('0x0000000000000000000000000000000000000000000000000000000000000000', '0x8df424e487De4218B347e1798efA11A078fecE90')).wait();
    // await (await fenixSwap.connect(timelockAccount).grantRole('0x90c2aa7471c04182221f68e80c07ab1e5946e4c63f8693e14ca40385d529f051', '0x8df424e487De4218B347e1798efA11A078fecE90')).wait();

    await fenixSwap.claimMerkleTreeRewards(
        BLAST.distributor,
        ["0xa09A8e94FBaAC9261af8f34d810D96b923B559D2"], // users
        ["0x52f847356b38720B55ee18Cb3e094ca11C85A192"], // tokens
        ["10090295269090000000000"],                    // amounts
        [                                               // proofs
            [
                "0xcca731f8d7cd127139b6c3f4373cc98398f6db0e5613ef55cf44108b17900dc0",
                "0xdeae3246ed8a20c6f80085f41d7a19810420735411850253c594f2f929080e66",
                "0x79b8c8b66500b74e295e0c304d67456b6212b8c020cbe75fd9f64e30b23a1ca2",
                "0x340520fd6cebae4ac1ea93badd4c5cdbc828b9e75038e3c76b900f5b5d8bc982",
                "0x732c92daf57619e9d256bb70d7ee3692f28fc0cfec75164a6f1c8b54b68a4b42",
                "0x46d63ea686c9699aedbeef9552bcdae14fd52aacf3e8e2c65c6af989948391d8",
                "0xf2bb55634a00ad3e80b8d9e346ff3ac722aec1114ed7a392bf18554e39372d39",
                "0x1b3d68060c499dbe0ff1924969daaad8dbdb1ab326c85f156db7c168ba3e35e5",
                "0x22cadbe2f803e4e8757080e4b00d37ce2e2f69a1de389d73cf07b0209b9dfb6d",
                "0xb5464abda8b849d4139ddea21355bd4ac73aabb12baf3ce9fd08ea0f05ef3556",
                "0x9eba70bcf23231aff1fb81b99d7655927f5c60066af2e7aa9cef3dc12d42e7e2",
                "0xa9b52b1cb9cb8fe75f5e7e7e7a3bbc9889a9aaba139bfec4c64da712cbbf0c13",
                "0xf9627b80eb6264260858357fe79da8fdef050871bc0c9437f7a3922b0de65bce",
                "0x6e540842cc6efe63eb6eaa6e95a812a16a4729c1ac63747c21a8819829b1934b",
                "0xb035384089e249db4e73bc51700adc78749b72de23436434518af89913bd053d",
                "0x776987f54641217b80b6c96c7141cceac51da56e4d720cad2dc581e8846bb82b"
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