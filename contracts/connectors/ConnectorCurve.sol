pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";

import "./curve/interfaces/iCurvePool.sol";
import "./curve/interfaces/iCurveToken.sol";
import "../OwnableExt.sol";

contract ConnectorCurve is IConnector, OwnableExt {
    address USDC;
    iCurvePool pool;

    function setUSDC(address _usdc, address _pool) public onlyOwner {
        require(_usdc != address(0), "Zero address not allowed");
        require(_pool != address(0), "Zero address not allowed");
        USDC = _usdc;
        pool = iCurvePool(_pool);
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

                // try pool.calc_token_amount(amounts, false) returns (uint256 lpTok) {
                //     // uint256 lpTok = pool.calc_token_amount(amounts, false);

                //     try pool.calc_withdraw_one_coin(lpTok, int128(uint128(i))) returns (
                //         uint256 withdrAmount
                //     ) {
                //         require(
                //             withdrAmount <= onConnectorLpTokenAmount,
                //             string(
                //                 abi.encodePacked(
                //                     "Not enought lpToken own ",
                //                     " _amount ",
                //                     uint2str(_amount),
                //                     " lpTok ",
                //                     uint2str(lpTok),
                //                     " onConnectorLpTokenAmount ",
                //                     uint2str(onConnectorLpTokenAmount),
                //                     " withdrAmount ",
                //                     uint2str(withdrAmount),
                //                     " lpToken ",
                //                     toAsciiString(pool.lp_token())
                //                 )
                //             )
                //         );

                //         try iCurveToken(pool.lp_token()).approve(address(pool), lpTok) {
                //             try
                //                 pool.remove_liquidity_one_coin(lpTok, int128(uint128(i)), 0)
                //             returns (uint256 retAmount) {
                //                 // IERC20(_asset).transfer(_beneficiar, retAmount);
                //                 // iCurveToken(pool.lp_token()).transfer(
                //                 //     _beneficiar,
                //                 //     iCurveToken(pool.lp_token()).balanceOf(address(this))
                //                 // );

                //                 try IERC20(_asset).transfer(_beneficiar, retAmount) {
                //                     try
                //                         iCurveToken(pool.lp_token()).transfer(
                //                             _beneficiar,
                //                             iCurveToken(pool.lp_token()).balanceOf(address(this))
                //                         )
                //                     {
                //                         return retAmount;
                //                     } catch Error(string memory reason) {
                //                         revert(reason);
                //                     } catch {
                //                         revert("iCurveToken(pool.lp_token()).transfer");
                //                     }
                //                 } catch Error(string memory reason) {
                //                     revert(reason);
                //                 } catch {
                //                     revert("IERC20(_asset).transfer");
                //                 }
                //             } catch Error(string memory reason) {
                //                 revert(reason);
                //             } catch {
                //                 revert(
                //                     string(
                //                         abi.encodePacked(
                //                             "pool.remove_liquidity_one_coin ",
                //                             " _amount ",
                //                             uint2str(_amount),
                //                             " lpTok ",
                //                             uint2str(lpTok),
                //                             " withdrAmount ",
                //                             uint2str(withdrAmount),
                //                             " balanceLpTok ",
                //                             uint2str(
                //                                 iCurveToken(pool.lp_token()).balanceOf(
                //                                     address(this)
                //                                 )
                //                             )
                //                         )
                //                     )
                //                 );
                //             }
                //         } catch Error(string memory reason) {
                //             revert(reason);
                //         } catch {
                //             // revert("iCurveToken(pool.lp_token()).approve");
                //             revert(
                //                 string(
                //                     abi.encodePacked(
                //                         "piCurveToken(pool.lp_token()).approve ",
                //                         " _amount ",
                //                         uint2str(_amount)
                //                     )
                //                 )
                //             );
                //         }
                //     } catch Error(string memory reason) {
                //         revert(reason);
                //     } catch {
                //         // revert("pool.calc_withdraw_one_coin");
                //         revert(
                //             string(
                //                 abi.encodePacked(
                //                     "pool.calc_withdraw_one_coin ",
                //                     " _amount ",
                //                     uint2str(_amount)
                //                 )
                //             )
                //         );
                //     }
                // } catch Error(string memory reason) {
                //     revert(reason);
                // } catch {
                //     // revert("pool.calc_token_amount");
                //     revert(
                //         string(
                //             abi.encodePacked(
                //                 "pool.calc_token_amount ",
                //                 " _amount ",
                //                 uint2str(_amount)
                //             )
                //         )
                //     );
                // }

                uint256 lpTok = pool.calc_token_amount(amounts, false);
                // _one_coin для возврата конкретной монеты (_assest)
                uint256 withdrAmount = pool.calc_withdraw_one_coin(lpTok, int128(uint128(i)));
                require(
                    withdrAmount <= onConnectorLpTokenAmount,
                    string(
                        abi.encodePacked(
                            "Not enought lpToken own ",
                            " _amount ",
                            uint2str(_amount),
                            " lpTok ",
                            uint2str(lpTok),
                            " onConnectorLpTokenAmount ",
                            uint2str(onConnectorLpTokenAmount),
                            " withdrAmount ",
                            uint2str(withdrAmount)
                            // ,
                            // " lpToken ",
                            // toAsciiString(pool.lp_token())
                        )
                    )
                );

                iCurveToken(pool.lp_token()).approve(address(pool), lpTok);

                //TODO: use withdrAmount?
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

    // //TODO: remove
    // function toAsciiString(address x) internal pure returns (string memory) {
    //     bytes memory s = new bytes(40);
    //     for (uint i = 0; i < 20; i++) {
    //         bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8 * (19 - i)))));
    //         bytes1 hi = bytes1(uint8(b) / 16);
    //         bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
    //         s[2 * i] = char(hi);
    //         s[2 * i + 1] = char(lo);
    //     }
    //     return string(s);
    // }

    // //TODO: remove
    // function char(bytes1 b) internal pure returns (bytes1 c) {
    //     if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
    //     else return bytes1(uint8(b) + 0x57);
    // }
}
