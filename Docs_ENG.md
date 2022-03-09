# System Core

Overnight - DeFi protocol based on USD+ token, stablecoin with daily rewards.

### UsdPlusToken (USD+)

Main token of protocol. ERC20. Rebased Stablecoin. Use a liquidity index reflecting the current ratio of the number of issued 
USD+ tokens to the volume of assets on strategies (`Strategy`), expressed in USDC. Internally, balances are stored in RAY (using `WadRayMath`), 
which allows you not to worry about the accuracy of working with balances when mint / redeem / balanceOf. The liquidity index is 
adjusted when the payment process is started on `Exchange.payout()` on behalf of `Exchange`. Access to `mint()` and `redeem()` 
is only available to `Exchange`.

The external function `exchange()` make it possible to get current `Exchange` address for making buy/redeem.

### Exchange 

The main entry point for clients. Not an asset holder.
  
Contains three methods available for external invocation without access modifiers:
- `buy` - allows the client to transfer USDC and receive USD+. The received USDC transfer to the `PortfolioManager`, 
  where the received assets deposited to the specified strategies.
- `redeem` - allows the client to exchange their USD+ back to USDC. If necessary, the `PortfolioManager` launch process
  to withdraw from strategies the amount of USDC required for the return takes place. On the level of collateral below the critical threshold 
  give to the client ability to receive a proportional share of assets from the `Vault`.
- `payout` - allows you to start the calculation and payment of rewards for all USD+ holders. The income is received by strategies, after which 
  the liquidity index on the `UsdPlusToken` is adjusted in relation to the volume of assets on strategies (`Strategy`).

###PortfolioManager

Contains the logic for the distribution of assets between strategies.
Hold information about the target weights `strategyWeights` for the strategies.
If necessary, performs the asset reallocation process using the `balance` method.
Not an asset holder.

Contains three methods available only for the `EXCHANGER` role:
- `deposit` - receives assets and places them in `cashStrategy` until the limit is reached. If the limit is exceeded, then it
  starts balancing for distributing assets to all strategies according to target weights
- `withdraw` - withdraws assets from strategies to return to the client. If there are enough assets in `cashStrategy`, then use them, otherwise
  starts balancing with the withdrawal of the required amount of assets from the strategies
- `claimAndBalance` - starts collecting (claiming) rewards for strategies with subsequent balancing of the portfolio to target values

There are also management methods available for the `ADMIN` role:
- `balance` - start balancing assets between strategies to match the given target values
- `setStrategyWeights` - setting target values for strategies
- `setCashStrategy` - assigns which strategy to use as `cashStrategy` - which is a buffer for assets,
  preventing permanent balancing

###Mark2Market

Provides functionality for obtaining information about current assets managed by strategies and their value in USDC.
Information about the value of each asset in USDC is provided by the strategies themselves.

Has the following public methods:
- `strategyAssets` - getting a pivot table for the value of current assets managed by strategies
- `totalNetAssets` - total value of assets managed by all strategies at USDC equivalent
- `totalLiquidationAssets` - potential amount of USDC, which can be obtained with a full withdrawal of assets from all strategies

### Connectors

Connectors to the protocols in which the assets are deposit/staked/locked.
Contain the logic for the interaction of strategies with external protocols.

### Strategies

A set of contracts containing an asset management strategy. They are **asset holders**.

Extend `Strategy` - the parent contract with the basic logic and interface for management through `PortfolioManager`.
They have several public methods available for the `PORTFOLIO_MANAGER` role:
- `stake` - method for depositing assets into the strategy to manage them
- `unstake` - method for withdrawing assets from the strategy. Allows to make a partial or full withdrawal of assets
- `netAssetValue` - current amount of assets under management in USDC equivalent
- `liquidationValue` - the current potential amount of assets in USDC equivalent, which can be obtained on a full withdrawal
- `claimRewards` - start collecting (claiming) rewards, if it is provided by the strategy


# Governance

A system module that contains the logic for organizing a DAO.

### OvnGovernor

The main contract that contains the control logic.
Allows to make proposals for changes in the protocol, controls the voting process.

Based on the code from: openzeppelin

### GovToken (OVN)

Governance token that allows holders to participate in governance.

Based on the code from: openzeppelin

### TimelockController

Implements proposals that have been successfully voted on by OvnGovernor.
Is the owner of all other contracts in the system.

Based on the code from: openzeppelin
