// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/IMark2Market.sol";
import "./interfaces/IStrategy.sol";
import "./Portfolio.sol";
import "./Vault.sol";

contract StrategyBalancer is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ---  fields

    Vault public vault;
    IMark2Market public mark2market;
    Portfolio public portfolio;
    IERC20 public usdc;

    // --- structs

    struct Order {
        bool stake;
        address strategy;
        uint256 amount;
    }

    // ---  events

    event VaultUpdated(address vault);
    event Mark2MarketUpdated(address mark2market);
    event PortfolioUpdated(address portfolio);
    event TokensUpdated(address usdc);

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}

    // ---  setters

    function setVault(address _vault) external onlyAdmin {
        require(_vault != address(0), "Zero address not allowed");
        vault = Vault(_vault);
        emit VaultUpdated(_vault);
    }

    function setMark2Market(address _mark2market) external onlyAdmin {
        require(_mark2market != address(0), "Zero address not allowed");
        mark2market = IMark2Market(_mark2market);
        emit Mark2MarketUpdated(_mark2market);
    }

    function setPortfolio(address _portfolio) external onlyAdmin {
        require(_portfolio != address(0), "Zero address not allowed");
        portfolio = Portfolio(_portfolio);
        emit PortfolioUpdated(_portfolio);
    }

    function setTokens(address _usdc) external onlyAdmin {
        require(_usdc != address(0), "Zero address not allowed");
        usdc = IERC20(_usdc);
        emit TokensUpdated(_usdc);
    }

    // ---  logic

    function balance() public {
        // Same to zero withdrawal balance
        balance(IERC20(address(0)), 0);
    }

    function claimRewards() public {
        Portfolio.StrategyWeight[] memory strategies = portfolio.getAllStrategyWeights();

        for (uint8 i; i < strategies.length; i++) {
            IStrategy(strategies[i].strategy).claimRewards(address(vault));
        }
    }

    function balance(IERC20 withdrawToken, uint256 withdrawAmount) public {

        Portfolio.StrategyWeight[] memory strategies = portfolio.getAllStrategyWeights();

        // 1. calc total USDC equivalent
        uint256 totalUsdc = usdc.balanceOf(address(vault));
        for (uint8 i; i < strategies.length; i++) {
            IStrategy(strategies[i].strategy).netAssetValue(address(vault));
        }

        if (address(withdrawToken) == address(usdc)) {
            require(totalUsdc >= withdrawAmount, "Trying withdraw more than liquidity available");
            // it make to move to vault extra USDC to withdraw
            totalUsdc = totalUsdc - withdrawAmount;
        }

        // 3. calc diffs for strategies liquidity
        Order[] memory stakeOrders = new Order[](strategies.length);
        uint8 stakeOrdersCount = 0;
        for (uint8 i; i < strategies.length; i++) {
            uint256 targetLiquidity = (totalUsdc * strategies[i].targetWeight) / portfolio.TOTAL_WEIGHT();
            uint256 currentLiquidity = IStrategy(strategies[i].strategy).netAssetValue(address(vault));
            if (targetLiquidity == currentLiquidity) {
                // skip already at target strategies
                continue;
            }

            if (targetLiquidity < currentLiquidity) {
                // unstake now
                IStrategy(strategies[i].strategy).unstake(
                    address(usdc),
                    currentLiquidity - targetLiquidity,
                    address(vault)
                );
            } else {
                // save to stake later
                stakeOrders[stakeOrdersCount] = Order(
                    true,
                    strategies[i].strategy,
                    targetLiquidity - currentLiquidity
                );
                stakeOrdersCount++;
            }
        }

        // 4.  make staking
        for (uint8 i; i < stakeOrdersCount; i++) {

            IStrategy(stakeOrders[i].strategy).stake(
                address(usdc),
                stakeOrders[i].amount,
                address(vault)
            );
        }

    }


}
