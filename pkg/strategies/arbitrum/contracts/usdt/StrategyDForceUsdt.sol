// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/DForce.sol";
import "@overnight-contracts/connectors/contracts/stuff/Dodo.sol";

contract StrategyDForceUsdt is Strategy {

    // --- structs

    struct StrategyParams {
        address usdt;
        address iUsdt;
        address dForceRewardDistributor;
        address df;
    }

    // --- params

    IERC20 public usdt;
    IToken public iUsdt;
    IRewardDistributor public dForceRewardDistributor;
    IERC20 public df;

    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        require(params.usdt != address(0), 'usdt is empty');
        require(params.iUsdt != address(0), 'iUsdt is empty');
        require(params.dForceRewardDistributor != address(0), 'dForceRewardDistributor is empty');
        require(params.df != address(0), 'df is empty');

        usdt = IERC20(params.usdt);
        iUsdt = IToken(params.iUsdt);
        dForceRewardDistributor = IRewardDistributor(params.dForceRewardDistributor);
        df = IERC20(params.df);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        uint256 usdtBalance = usdt.balanceOf(address(this));
        usdt.approve(address(iUsdt), usdtBalance);
        iUsdt.mint(address(this), usdtBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        iUsdt.redeemUnderlying(address(this), _amount);
        return usdt.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        iUsdt.redeem(address(this), iUsdt.balanceOf(address(this)));
        return usdt.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdt.balanceOf(address(this)) + iUsdt.balanceOf(address(this)) * iUsdt.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (iUsdt.balanceOf(address(this)) > 0) {
            address[] memory holders = new address[](1);
            holders[0] = address(this);

            address[] memory suppliedITokens = new address[](1);
            suppliedITokens[0] = address(iUsdt);

            address[] memory borrowedITokens;

            dForceRewardDistributor.claimRewards(holders, suppliedITokens, borrowedITokens);
        }

        // sell rewards
        uint256 totalUsdt;

        uint256 dfBalance = df.balanceOf(address(this));
        if (dfBalance > 0) {
            bytes[] memory sequence = new bytes[](1);
            sequence[0] = "0x00";

            DodoLibrary.SingleSwapStruct memory dfUsxSwapParams = DodoLibrary.SingleSwapStruct(
                address(0xA867241cDC8d3b0C07C85cC06F25a0cD3b5474d8),
                address(0xe05dd51e4eB5636f4f0E8e7Fbe82eA31a2ecef16),
                address(df),
                address(0x641441c631e2F909700d2f41FD87F0aA6A6b4EDb),
                dfBalance,
                address(0x8aB2D334cE64B50BE9Ab04184f7ccBa2A6bb6391),
                address(0x19E5910F61882Ff6605b576922507F1E1A0302FE),
                address(0xe05dd51e4eB5636f4f0E8e7Fbe82eA31a2ecef16),
                0,
                sequence,
                abi.encode(address(0x6c1c420C04F4D563d6588a97693aF902b87Be5f1), 10000000000000000)
            );

            uint256 usxAmount = DodoLibrary.singleSwap(dfUsxSwapParams);
            if (usxAmount > 0) {
                DodoLibrary.SingleSwapStruct memory usxUsdcSwapParams = DodoLibrary.SingleSwapStruct(
                    address(0xA867241cDC8d3b0C07C85cC06F25a0cD3b5474d8),
                    address(0xe05dd51e4eB5636f4f0E8e7Fbe82eA31a2ecef16),
                    address(0x641441c631e2F909700d2f41FD87F0aA6A6b4EDb),
                    address(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8),
                    usxAmount,
                    address(0x8aB2D334cE64B50BE9Ab04184f7ccBa2A6bb6391),
                    address(0x9340e3296121507318874ce9C04AFb4492aF0284),
                    address(0xe05dd51e4eB5636f4f0E8e7Fbe82eA31a2ecef16),
                    0,
                    sequence,
                    abi.encode(address(0x6c1c420C04F4D563d6588a97693aF902b87Be5f1), 0)
                );

                uint256 usdcAmount = DodoLibrary.singleSwap(usxUsdcSwapParams);
                if (usdcAmount > 0) {
                    DodoLibrary.SingleSwapStruct memory usdcUsdtSwapParams = DodoLibrary.SingleSwapStruct(
                        address(0xA867241cDC8d3b0C07C85cC06F25a0cD3b5474d8),
                        address(0xe05dd51e4eB5636f4f0E8e7Fbe82eA31a2ecef16),
                        address(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8),
                        address(usdt),
                        usdcAmount,
                        address(0xd5a7E197bacE1F3B26E2760321d6ce06Ad07281a),
                        address(0xe4B2Dfc82977dd2DCE7E8d37895a6A8F50CbB4fB),
                        address(0xe05dd51e4eB5636f4f0E8e7Fbe82eA31a2ecef16),
                        1,
                        sequence,
                        abi.encode(address(0x6c1c420C04F4D563d6588a97693aF902b87Be5f1), 0)
                    );

                    totalUsdt += DodoLibrary.singleSwap(usdcUsdtSwapParams);
                }
            }
        }

        // send rewards
        if (totalUsdt > 0) {
            usdt.transfer(_to, totalUsdt);
        }

        return totalUsdt;
    }

}
