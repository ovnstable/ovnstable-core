pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";

import "./curve/interfaces/iCurvePool.sol";
import "./curve/interfaces/iCurveToken.sol";
import "../OwnableExt.sol";

contract ConnectorCurve is IConnector, OwnableExt {
    iCurvePool public pool;

    event UpdatedPool(address pool);

    function setPool(address _pool) public onlyOwner {
        require(_pool != address(0), "Zero address not allowed");
        pool = iCurvePool(_pool);
        emit UpdatedPool(_pool);
    }

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override {
        uint256[3] memory amounts;
        for (uint256 i = 0; i < 3; i++) {
            address coin = pool.coins(i);
            if (coin == _asset) {
                iCurveToken(_asset).approve(address(pool), _amount);
                // номер позиции в массиве (amounts) определяет какой актив (_asset) и в каком количестве (_amount)
                // на стороне керва будет застейкано
                amounts[uint256(i)] = _amount;
                uint256 lpTok = pool.calc_token_amount(amounts, true);
                //TODO: процентажи кудато вынести, slipage
                uint256 retAmount = pool.add_liquidity(amounts, (lpTok * 99) / 100, false);
                iCurveToken(pool.lp_token()).transfer(_beneficiar, retAmount);
                // actList.changeBal(_asset, -int128(uint128(_amount)));

                // actList.changeBal(pool.lp_token(), int128(uint128(retAmount)));

                return;
            } else {
                amounts[i] = 0;
            }
        }
        revert("can't find active for staking in pool");
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override returns (uint256) {
        uint256[3] memory amounts;
        for (uint256 i = 0; i < 3; i++) {
            address coin = pool.coins(i);

            if (coin == _asset) {
                amounts[i] = _amount;

                uint256 onConnectorLpTokenAmount = iCurveToken(pool.lp_token()).balanceOf(
                    address(this)
                );

                uint256 lpTok = pool.calc_token_amount(amounts, false);
                // _one_coin для возврата конкретной монеты (_assest)
                uint256 withdrawAmount = pool.calc_withdraw_one_coin(lpTok, int128(uint128(i)));
                if(withdrawAmount > onConnectorLpTokenAmount)
                {
                    revert(string(
                        abi.encodePacked(
                            "Not enough lpToken own ",
                            " _amount: ",
                            uint2str(_amount),
                            " lpTok: ",
                            uint2str(lpTok),
                            " onConnectorLpTokenAmount: ",
                            uint2str(onConnectorLpTokenAmount),
                            " withdrawAmount: ",
                            uint2str(withdrawAmount)
                        )
                    ));
                }

                iCurveToken(pool.lp_token()).approve(address(pool), lpTok);

                //TODO: use withdrawAmount?
                uint256 retAmount = pool.remove_liquidity_one_coin(lpTok, int128(uint128(i)), 0);

                IERC20(_asset).transfer(_beneficiar, retAmount);
                iCurveToken(pool.lp_token()).transfer(
                    _beneficiar,
                    iCurveToken(pool.lp_token()).balanceOf(address(this))
                );
                return retAmount; // amounts[i];
            } else {
                amounts[i] = 0;
            }
        }
        revert("can't find active for withdraw from pool");
    }

    //TODO: remove
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k - 1;
            bstr[k] = bytes1(uint8(48 + (_i % 10)));
            _i /= 10;
        }
        return string(bstr);
    }
}
