const hre = require('hardhat')
const { getContract, showM2M, execTimelock } = require('@overnight-contracts/common/utils/script-utils')
const {
  createProposal,
  testProposal,
  testUsdPlus,
  testStrategy,
} = require('@overnight-contracts/common/utils/governance')
const { Roles } = require('@overnight-contracts/common/utils/roles')

const path = require('path')
const { prepareEnvironment } = require('@overnight-contracts/common/utils/tests')
const { strategySiloUsdc } = require('@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc')
const { strategySiloUsdcWbtc } = require('@overnight-contracts/strategies-arbitrum/deploy/40_strategy_silo_wbtc')
const { strategySiloUsdcArb } = require('@overnight-contracts/strategies-arbitrum/deploy/41_strategy_silo_arb')
const {
  strategySiloUsdtWbtc,
} = require('@overnight-contracts/strategies-arbitrum/deploy/usdt/06_strategy_silo_usdt_wbtc')
const {
  strategySiloUsdtArb,
} = require('@overnight-contracts/strategies-arbitrum/deploy/usdt/07_strategy_silo_usdt_arb')
const { strategySiloEth } = require('@overnight-contracts/strategies-arbitrum/deploy/eth/06_strategy_silo_eth')
let filename = path.basename(__filename)
filename = filename.substring(0, filename.indexOf('.js'))

async function main() {
  let addresses = []
  let values = []
  let abis = []

  let StrategySiloUsdc = await getContract('StrategySiloUsdc', 'arbitrum')
  let StrategySiloUsdcArb = await getContract('StrategySiloUsdcArb', 'arbitrum')
  let StrategySiloUsdcWbtc = await getContract('StrategySiloUsdcWbtc', 'arbitrum')

  let StrategySiloUsdtArb = await getContract('StrategySiloUsdtArb', 'arbitrum_usdt')
  let StrategySiloUsdtWbtc = await getContract('StrategySiloUsdtWbtc', 'arbitrum_usdt')

  let StrategySiloEth = await getContract('StrategySiloEth', 'arbitrum_eth')

  // StrategySiloUsdc
  addProposalItem(StrategySiloUsdc, 'upgradeTo', ['0x0D56CE2C7ad6b17c4c414940Ac765372b691d0b2'])
  addProposalItem(StrategySiloUsdc, 'setParams', [await strategySiloUsdc()])
  addProposalItem(StrategySiloUsdcArb, 'upgradeTo', ['0x0D56CE2C7ad6b17c4c414940Ac765372b691d0b2'])
  addProposalItem(StrategySiloUsdcArb, 'setParams', [await strategySiloUsdcArb()])
  addProposalItem(StrategySiloUsdcWbtc, 'upgradeTo', ['0x0D56CE2C7ad6b17c4c414940Ac765372b691d0b2'])
  addProposalItem(StrategySiloUsdcWbtc, 'setParams', [await strategySiloUsdcWbtc()])

  // StrategySiloUsdtUsdc
  addProposalItem(StrategySiloUsdtArb, 'upgradeTo', ['0x5Ef6E22E2F058983896B5912DE004Bb1F20132f3'])
  addProposalItem(StrategySiloUsdtArb, 'setParams', [await strategySiloUsdtArb()])
  addProposalItem(StrategySiloUsdtWbtc, 'upgradeTo', ['0x5Ef6E22E2F058983896B5912DE004Bb1F20132f3'])
  addProposalItem(StrategySiloUsdtWbtc, 'setParams', [await strategySiloUsdtWbtc()])

  // StrategySiloEth
  addProposalItem(StrategySiloEth, 'upgradeTo', ['0xf6152518eCfaAE08D2034fa7F57cA8290Df5449d'])
  addProposalItem(StrategySiloEth, 'setParams', [await strategySiloEth()])

  //   await testProposal(addresses, values, abis)

  //   await testStrategy(filename, StrategySiloUsdc, 'arbitrum')
  //   await testStrategy(filename, StrategySiloUsdcArb, 'arbitrum')
  //   await testStrategy(filename, StrategySiloUsdcWbtc, 'arbitrum')

  //   await testStrategy(filename, StrategySiloUsdtArb, 'arbitrum_usdt')
  //   await testStrategy(filename, StrategySiloUsdtWbtc, 'arbitrum_usdt')
  //   await testStrategy(filename, StrategySiloEth, 'arbitrum_eth')

  // await testUsdPlus(filename, 'arbitrum');
  // await testUsdPlus(filename, 'arbitrum_usdt');
  // await testUsdPlus(filename, 'arbitrum_eth');

  await createProposal(filename, addresses, values, abis)

  function addProposalItem(contract, methodName, params) {
    addresses.push(contract.address)
    values.push(0)
    abis.push(contract.interface.encodeFunctionData(methodName, params))
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
