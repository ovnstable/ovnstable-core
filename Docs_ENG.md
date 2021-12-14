# System Core

Overnight - DeFi protocol based on USD+ token, stablecoin with daily rewards.

### UsdPlusToken (USD+)

Main token of protocol. ERC20. Rebased Stablecoin. Use a liquidity index reflecting the current ratio of the number of issued 
USD+ tokens to the volume of assets on the `Vault`, expressed in USDC. Internally, balances are stored in RAY (using `WadRayMath`), 
which allows you not to worry about the accuracy of working with balances when mint / redeem / balanceOf. The liquidity index is 
adjusted when the payment process is started on `Exchange.payout()` on behalf of `Exchange`. Access to `mint()` and `redeem()` 
is only available to `Exchange`.

### Exchange 

The main entry point for clients.
  
Contains three methods available for external invocation without access modifiers:
- buy - allows the client to transfer USDC and receive USD+. The received USDC transfer to the `PortfolioManager`, 
  where the received assets deposited to the specified strategies. May start the process of redistributing rewards `payout()` 
  if it has not been executed for a specified period of time.
- redeem - allows the client to exchange their USD+ back to USDC. If necessary, the `PortfolioManager` launch process
  to withdraw from stratagies the amount of USDC required for the return takes place. On the level of collateral below the critical threshold 
  give to the client ability to receive a proportional share of assets from the `Vault`. May start the process of redistributing rewards 
  `payout()` if it has not been executed within the specified period of time.
- payout - allows you to start the calculation and payment of rewards for all USD+ holders. The income is received by strategies, after which 
  the liquidity index on the `UsdPlusToken` is adjusted in relation to the volume of assets on the `Vault`.

### Portfolio

Contains information about assets and thier weights in portfolio.
The `assetWeights` are weights which define the target asset volumes on the `Vault`.
The `assetInfos` are asset information which contains a link to a `PriceGetter` where you can get the USDC equivalent value for the corresponding asset.

### Balancer

Contains logic for balancing. Based on information from `MarkToMarket` about the current asset allocation and the need to make adjustments
builds a set of necessary actions for the exchange of assets among pairs to achieve the target volumes of assets specified in the `Portfolio`.

### Mark2Market

Provides the functionality of obtaining information about the current assets on the `Vault` and their value in USDC.
Information about the value of each asset in USDC is obtained from the corresponding `PriceGetter`.

Has the following public methods:
- assetPrices - getting a pivot table for the value of current assets and the total value of assets in USDC on `Vault`
- totalUsdcPrice - total value of assets in USDC on `Vault`
- assetPricesForBalance - method for internal needs, prepares information about the difference between the current volume of assets and the target

### RewardManager

Contains the logic how to receive rewards from the protocols in which the assets are located.

### Vault

Is the holder of all assets. Allows `PortfolioManaget` to perform actions with assets on its own behalf. Supports work only with ERC20 tokens.

### PortfolioManager

Contains logic for asset management.
Decides on portfolio balancing. When starting the balancing process, it receives a set of actions from the `Balancer`, allowing to achieve
target indicators for the volume of assets on the `Vault`. Performs the specified actions on the `TokenExchange` on its own behalf, disposing of the` Vault` assets.

### Connectors

Connectors to the protocols in which the assets are deposit/staked/locked.
Contains stake/unstake logic specific to each of the protocols.

### PriceGetter

A set of contracts containing the logic of obtaining the value in USDC during the sale/purchase of the corresponding asset.

### TokenExchange

A set of contracts containing the logic of exchanging pairs of assets with each other. Contains one public method `execute` which make the exchange.


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
