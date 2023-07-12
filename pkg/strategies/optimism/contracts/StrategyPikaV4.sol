// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";

import "@overnight-contracts/connectors/contracts/stuff/Pika.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

contract StrategyPikaV4 is Strategy {

    IERC20 public usdc;
    IERC20 public op;
    PikaPerpV4 public pika;
    VaultFeeReward public pikaFeeReward;
    VaultTokenReward public pikaTokenReward;

    ISwapRouter public uniswapV3Router;
    uint24 public poolFee;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address op;
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
        usdc = IERC20(params.usdc);
        op = IERC20(params.op);
        pika = PikaPerpV4(params.pika);
        pikaFeeReward = VaultFeeReward(params.pikaFeeReward);
        pikaTokenReward = VaultTokenReward(params.pikaTokenReward);
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFee = params.poolFee;

        usdc.approve(address(pika), type(uint256).max);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        // Pika expects a value + 1e2 declaims for USDC
        pika.stake(_amount * 1e2, address(this));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        PikaPerpV4.Stake memory stake = pika.getStake(address(this));

        // 1) amount + 1e2 = pika fix
        // 2) 1e4 = improved accuracy for operations
        // 3) + 1 routing fix
        uint256 shares = ((_amount * 1e6) / stake.amount * uint256(stake.shares)) / 1e4 + 1;
        pika.redeem(address(this), shares, address(this));

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 shares = pika.getShare(address(this));
        if (shares == 0) {
            return 0;
        }

        pika.redeem(address(this), shares, address(this));
        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _total(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _total(false);
    }

    function _total(bool nav) internal view returns (uint256){
        PikaPerpV4.Stake memory stake = pika.getStake(address(this));
        PikaPerpV4.Vault memory vault = pika.getVault();

        uint256 stakedUsdc;
        if(nav){
            stakedUsdc = (uint256(stake.amount) / 1e2);
        }else{
            stakedUsdc = (stake.shares * vault.balance / pika.getTotalShare()) / 1e2;
        }

        uint256 balanceUsdc = usdc.balanceOf(address(this));
        return balanceUsdc + stakedUsdc;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        uint256 shares = pika.getShare(address(this));
        if (shares == 0) {
            return 0;
        }

        uint256 balanceUsdc = usdc.balanceOf(address(this));

        // claim USDC
        pikaFeeReward.claimReward(address(this));

        // claim OP
        pikaTokenReward.getReward();

        uint256 totalUsdc = usdc.balanceOf(address(this)) - balanceUsdc;

        uint256 opBalance = op.balanceOf(address(this));
        if (opBalance > 0) {

            uint256 opUsdc = UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(op),
                address(usdc),
                poolFee,
                address(this),
                opBalance,
                0
            );
            totalUsdc += opUsdc;
        }

        if (totalUsdc > 0) {
            usdc.transfer(_beneficiary, totalUsdc);
        }

        return totalUsdc;
    }

}
