const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");

const { ethers } = require("hardhat");
// const { strategyMorphoAlpha } = require("@overnight-contracts/strategies-base/deploy/22_strategy_morpho_alpha");
// const { strategyMorphoBeta } = require("@overnight-contracts/strategies-base/deploy/24_strategy_morpho_beta");
const { strategyMorphoDirect } = require("@overnight-contracts/strategies-base/deploy/01_strategy_morpho_direct_alpha");
const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let wallet = await initWallet();
    // await transferETH(1, wallet.address);
    
    let addresses = [];
    let values = [];
    let abis = [];

    let rm = await getContract('RoleManager', 'base');
    let timelock = await getContract('AgentTimelock', 'base');
    
    let morphoDirect = await hre.ethers.getContractAt(STRATEGY_ABI, '0x26C604e786601d838f0450910C7001646aCBf99E');
    // let morphoDirect = await getContract('StrategyMorphoDirect', 'base');
    
    addProposalItem(rm, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock.address]);
    
    let newMorphoDirectImpl = "0xA21193B9a945d96445b00b84B8e7345E9084951A";

    
    addProposalItem(morphoDirect, 'upgradeTo', [newMorphoDirectImpl]);

    addProposalItem(morphoDirect, 'setParams', [strategyMorphoDirect()]);
    
    let morphoToken = await getERC20ByAddress(BASE.morphoToken, wallet.address);

    console.log("treasury morpho", (await morphoToken.balanceOf(COMMON.rewardWallet)).toString());
    console.log("direct morpho", (await morphoToken.balanceOf(morphoDirect.address)).toString());


    let dataDirect = ["0x6b89026a0000000000000000000000005400dbb270c956e8985184335a1c62aca6ce133300000000000000000000000026c604e786601d838f0450910c7001646acbf99e000000000000000000000000baa5cc21fd487b8fcc2f632f3f4e8d37262a08420000000000000000000000000000000000000000000001d896d590fce3280bd300000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000011e74f963864840dc566caaecac74da4af1bd4c2c8e988c71e934da5af352e569061301d913e900fce28e1229511b7d260765ed1d73fa04e7562f4e24f5f816b52858bd9b91d71c874b9c2175cfb2b91a5e9320fd113c64eab715150b43d1a6cddaf5058c248a3e8759a7c6143667bf7253097a31dc0a5cac00da378d2e90e5669874a330bf76787e9a3f7bb587a4606c963e7c42b2477a9940a4a85ad3f30627f8d9f4c916e673cd4cf12e0b568860aa809d1dff79618f4dc357601edb407a4d0bbf3c3436096fa6c373edb724f728bda92b7ea3089348907b8f275e67b45b29f1b8152dec8364974da79450270e66d33cccfefe3cf94080caac3a358be8bea1fe34aae2f7f7a54262354a6495e907defb8cf88f8b7788086292ade80e6d057fc333a72503fabff71a51fb4462f0cdfe418b4ce748d46df3ecd6b53ee179e45777d6aedfe0535b45419d71b32cf51494fa6cfe621f34a672e7cb6e8afa24acb618e978f3985c293038b25646583e5ef5960292c9b2fd5d3aefe71491dd11ac2cb1bd7beac11fbdaf95622ac203241d6d39190af6108393b0724f0e90d64ebeaba2369fd4e75ea1e608c5a5e7bdee5028ff48ff3ae3e270e2b6d69bc0f26e94a6eb6e394c4dc323e17a45bb099e1d4eb02f6fb38e9f1e5e71637d1ef27b2cda53a7cef925fec5f9f62ef8f63f49db1c065f29c27e98db6e1657d51fdcc691070fec0edecb170f846b65770b802148e7087aeff82d7a19e73b54a27156919ebf13d"]


    addProposalItem(morphoDirect, 'claimMerkleTreeRewards', [COMMON.rewardWallet, dataDirect, BASE.morphoChainAgnosticBundler]);
    

    

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'base');
    // await testStrategy(filename, morpho, 'base');
    await createProposal(filename, addresses, values, abis);

    console.log("treasury morpho", (await morphoToken.balanceOf(COMMON.rewardWallet)).toString());
    console.log("direct morpho", (await morphoToken.balanceOf(morphoDirect.address)).toString());




    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



STRATEGY_ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "previousAdmin",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "newAdmin",
          "type": "address"
        }
      ],
      "name": "AdminChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "beacon",
          "type": "address"
        }
      ],
      "name": "BeaconUpgraded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "version",
          "type": "uint8"
        }
      ],
      "name": "Initialized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "value",
          "type": "address"
        }
      ],
      "name": "PortfolioManagerUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "Reward",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "previousAdminRole",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "newAdminRole",
          "type": "bytes32"
        }
      ],
      "name": "RoleAdminChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleRevoked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "swapSlippageBP",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "navSlippageBP",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stakeSlippageBP",
          "type": "uint256"
        }
      ],
      "name": "SlippagesUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "Stake",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "StrategyUpdatedFee",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "StrategyUpdatedLimit",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "StrategyUpdatedParams",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "StrategyUpdatedTreasury",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amountReceived",
          "type": "uint256"
        }
      ],
      "name": "Unstake",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "implementation",
          "type": "address"
        }
      ],
      "name": "Upgraded",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "DEFAULT_ADMIN_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "PORTFOLIO_AGENT_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "PORTFOLIO_MANAGER",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "balance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_beneficiary",
          "type": "address"
        },
        {
          "internalType": "bytes[]",
          "name": "data",
          "type": "bytes[]"
        },
        {
          "internalType": "address",
          "name": "chainAgnosticBundler",
          "type": "address"
        }
      ],
      "name": "claimMerkleTreeRewards",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_to",
          "type": "address"
        }
      ],
      "name": "claimRewards",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "fee",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        }
      ],
      "name": "getRoleAdmin",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "grantRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "hasRole",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "limit",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "liquidationValue",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "marketId",
      "outputs": [
        {
          "internalType": "Id",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "marketParams",
      "outputs": [
        {
          "internalType": "address",
          "name": "loanToken",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "collateralToken",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "oracle",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "irm",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "lltv",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "morpho",
      "outputs": [
        {
          "internalType": "contract IMorpho",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "morphoToken",
      "outputs": [
        {
          "internalType": "contract IERC20",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "navSlippageBP",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "netAssetValue",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "portfolioManager",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "proxiableUUID",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "renounceRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "revokeRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "roleManager",
      "outputs": [
        {
          "internalType": "contract IRoleManager",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_fee",
          "type": "uint256"
        }
      ],
      "name": "setFee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_limit",
          "type": "uint256"
        }
      ],
      "name": "setLimit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "usdc",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "morpho",
              "type": "address"
            },
            {
              "internalType": "Id",
              "name": "marketId",
              "type": "bytes32"
            },
            {
              "components": [
                {
                  "internalType": "address",
                  "name": "loanToken",
                  "type": "address"
                },
                {
                  "internalType": "address",
                  "name": "collateralToken",
                  "type": "address"
                },
                {
                  "internalType": "address",
                  "name": "oracle",
                  "type": "address"
                },
                {
                  "internalType": "address",
                  "name": "irm",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "lltv",
                  "type": "uint256"
                }
              ],
              "internalType": "struct MarketParams",
              "name": "marketParams",
              "type": "tuple"
            },
            {
              "internalType": "address",
              "name": "treasury",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "fee",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "limit",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "wellToken",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "morphoToken",
              "type": "address"
            }
          ],
          "internalType": "struct StrategyMorphoDirect.StrategyParams",
          "name": "params",
          "type": "tuple"
        }
      ],
      "name": "setParams",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_swapSlippageBP",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_navSlippageBP",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stakeSlippageBP",
          "type": "uint256"
        }
      ],
      "name": "setSlippages",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        }
      ],
      "name": "setStrategyName",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_portfolioManager",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_roleManager",
          "type": "address"
        }
      ],
      "name": "setStrategyParams",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_treasury",
          "type": "address"
        }
      ],
      "name": "setTreasury",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_asset",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "stake",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "stakeSlippageBP",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "swapSlippageBP",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_asset",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_beneficiary",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "_targetIsZero",
          "type": "bool"
        }
      ],
      "name": "unstake",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newImplementation",
          "type": "address"
        }
      ],
      "name": "upgradeTo",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newImplementation",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "upgradeToAndCall",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "usdcToken",
      "outputs": [
        {
          "internalType": "contract IERC20",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "wellToken",
      "outputs": [
        {
          "internalType": "contract IERC20",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]