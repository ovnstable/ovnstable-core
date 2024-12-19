const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const path = require('path');

const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let timelock = await getContract('AgentTimelock');
    let fenixSwap = await getContract('StrategyFenixSwap', 'blast'); 

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [timelock.address],
    });

    const timelockAccount = await hre.ethers.getSigner(timelock.address);

    let data = [
        "0x71ee95c0000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a09a8e94fbaac9261af8f34d810d96b923b559d2000000000000000000000000000000000000000000000000000000000000000100000000000000000000000052f847356b38720b55ee18cb3e094ca11c85a192000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000018ad44d9b4df8d0cc0000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001081708659ca2d7f84a47f16763ffc7f4e14c5dc1687ad20de6ea43427130877ac77dba36a71bfb1928999702517bf420a6223e0ffc54ebf94930b6a220a6417d7fe4828bb2018e80edc261bd57fa1f18d8749ef94140e6bca498ffc253c0831e9e95e1b759c4bbd3739fc10bfffb04274bc62155b2441bb7ac2f1b4603c59c34c46f20f6c1fb8efe41797780ed4d183536c0d852105ca57ddcafe1e05fc1ec665a11929a6bcb45582308983b123aca3bc39a51a1e9c564bce754244d2bf0b6294353afedfdeaacf1de7577b44931481a1e8b412c48d01750cf54b3d267701c565cd40c5b884a51baf694b1a5b231213c5eddb9d4e6f689c69dca3b6cceed37e247db5930afa139cc031a263968df48353376ce4bb7a56416a80b23ab76bfea2a33e8a5b0d22a11d0dc9a266025c1078de10025fbf9a1495aa7a74afa4815b056d4c552c614ba3b8674c7ce2a4c5f8d2f1c471336d271f29056f5c7b3282b4e72dedd1fd41009f21b703059e577053f6c79395028d83b4b22ef6d142a049ffed3ed05f96f0e1634e8ff3a2ee30727b68ff969c0fd384725bfe361d0b5df2a97d8f95eae0dec250a985dd47b28b22c7ee78202fd5ff3fbd475785b38563f75fb2400621b10f18da0487d6dfe3f24c49eb14f25874a53a0e6458f14be9e6e21b23e385bb78d315b1beb465a2e5e417f3c6eec6bfe8f154d3ba85de5da8b151149bd0"
    ]
   


    await fenixSwap.connect(timelockAccount).claimMerkleTreeRewards(BLAST.voter, [],
        [
           [],
           []
        ],
        [
          "tokenId": "0",
          "bribes": [],
          "tokens": []
        ],
        "merkl_": {
          "users": [
            "0xc72d8fe6ef41bc873936e0d29b8b221e3394c5f2"
          ],
          "tokens": [
            "0x52f847356b38720b55ee18cb3e094ca11c85a192"
          ],
          "amounts": [
            "8582516870000000000"
          ],
          "proofs": [
            [
              "0x3bc99a64307f252e1fa90c2383c187b2222693f49aee69ef188c33d629fe65f3",
              "0xe39f4bb7f61bcf2086078374edaef3e1794b39e0864b255348f596f83ded5a1b",
              "0xc1394ef0907364f64a697ef3d57930c34b4e58c1633e6056ea516e3b87014aa2",
              "0xd696ea6aa7d6d022921f2ee8a2a79711ff301ef8d83880c6451294446570b5d9",
              "0x90a388cbd71bd4600dedc945c84cb5776a5e640670311fd2926ea2c3477926d5",
              "0xad76ca2ae9a1b178a96ff9ca23d0015eb9f2903cc9e6fdd11a797f18cf0eb20a",
              "0x5685a343c50a3ed88e418062dafe3bc3be5b434275fab34203c3e41ad76dc8db",
              "0x4aed5bbce3f100a923452da7a815d5b92debf8291d5a328f1544a702b5e6dec8",
              "0xb8679256b9ae213989be7b9c81231db34e169798f2554f76f03953883ddc1264",
              "0x27fdd21ea391d2620bf4d018993e73f6f93ea653af4a88e43c5613e1a154f513",
              "0x11580a716ba06e66c4ee36a0f94bf87a2cb5a27f84548878f1fdfe66cd5b332c",
              "0xe152eb7db3a15b144ea74039cd50778ad298da1f2bac3986e44b525b0bd0b13f",
              "0x7ad4159e70796481e6ebfd39a079128f26b0bf9e5e21dbf2c8dd520c660b4dc3",
              "0x6d5305379875f6635b2032f5dd33ea67420aa62916ad7963e632a63ef4b157c2",
              "0xb0fa24f14d16033044fa9202bab89b580884d8e18bfb907fa1211347635fae02",
              "0xa8242665337f51d16cab4cbe615942156834ad4f8dbb4d2cb8e87a7a4afb7b3d"
            ]
          ]
        },
        "splitMerklAidrop_": {
          "inPureTokens": false,
          "amount": "0",
          "withPermanentLock": true,
          "managedTokenIdForAttach": "0",
          "proofs": []
        },
        "aggregateCreateLock_": {
          "percentageToLock": "0",
          "lockDuration": "0",
          "to": "0x0000000000000000000000000000000000000000",
          "shouldBoosted": false,
          "withPermanentLock": true,
          "managedTokenIdForAttach": "1"
        }
      });
    
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

