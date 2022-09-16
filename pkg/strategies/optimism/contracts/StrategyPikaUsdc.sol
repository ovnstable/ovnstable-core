// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";

import "@overnight-contracts/connectors/contracts/stuff/Pika.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

contract StrategyPikaUsdc is Strategy {

    IERC20 public usdcToken;
    IERC20 public opToken;
    PikaPerpV3 public pika;
    VaultFeeReward public pikaFeeReward;
    VaultTokenReward public pikaTokenReward;

    ISwapRouter public uniswapV3Router;
    uint24 public poolFee;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdcToken;
        address opToken;
        address pika;
        address pikaFeeReward;
        address pikaTokenReward;
        address uniswapV3Router;
        uint24 poolFee;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdcToken = IERC20(params.usdcToken);
        opToken = IERC20(params.opToken);
        pika = PikaPerpV3(params.pika);
        pikaFeeReward = VaultFeeReward(params.pikaFeeReward);
        pikaTokenReward = VaultTokenReward(params.pikaTokenReward);
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFee = params.poolFee;

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        require(_asset == address(usdcToken), "Some token not compatible");

        usdcToken.approve(address(pika), _amount);

        // Pika expects a value + 1e2 declaims for USDC
        pika.stake(_amount * 1e2, address(this));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        PikaPerpV3.Stake memory stake = pika.getStake(address(this));

        // 1) amount + 1e2 = pika fix
        // 2) 1e4 = improved accuracy for operations
        // 3) + 1 routing fix
        uint256 shares = ((_amount * 1e6) / stake.amount * uint256(stake.shares)) / 1e4 + 1;
        pika.redeem(address(this), shares, address(this));

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 shares = pika.getShare(address(this));
        if (shares == 0) {
            return 0;
        }

        pika.redeem(address(this), shares, address(this));
        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        PikaPerpV3.Stake memory stake = pika.getStake(address(this));
        return uint256(stake.amount) / 1e2;
    }

    function liquidationValue() external view override returns (uint256) {
        PikaPerpV3.Stake memory stake = pika.getStake(address(this));
        uint256 amount = (uint256(stake.amount) / 1e2);
        if (amount > 0) {
            return amount - 1; // When unstake value Pika rounds sum to down => Always 20 000 000 > 19 999 999
        } else {
            return 0;
        }
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        uint256 shares = pika.getShare(address(this));
        if (shares == 0) {
            return 0;
        }

        uint256 balanceUSDC = usdcToken.balanceOf(address(this));

        // claim OP
        pikaFeeReward.claimReward();

        // claim USDC
        pikaTokenReward.getReward();

        uint256 totalUsdc = usdcToken.balanceOf(address(this)) - balanceUSDC;
        // calc reward USDC value

        uint256 opBalance = opToken.balanceOf(address(this));
        if (opBalance > 0) {

            uint256 opUsdc = UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(opToken),
                address(usdcToken),
                poolFee,
                address(this),
                opBalance,
                0
            );
            totalUsdc += opUsdc;
        }

        if (totalUsdc > 0) {
            usdcToken.transfer(_beneficiary, totalUsdc);
        }

        return totalUsdc;
    }

}
