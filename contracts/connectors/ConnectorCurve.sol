pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";

import "./curve/interfaces/iCurvePool.sol";
import "./curve/interfaces/iCurveToken.sol";
import "../OwnableExt.sol";

contract ConnectorCurve is IConnector , OwnableExt{

    address USDC;

    function setUSDC (address _usdc) public onlyOwner {
        USDC = _usdc;
    }
    function stake (address _asset, address _pool,uint256 _amount, address _beneficiar )  public override {
      iCurvePool  pool = iCurvePool(_pool);

        for (uint i=0; i<3; i++ ) {
            
            if (pool.underlying_coins(i) == _asset) {
                uint256 [3] memory amounts;
                iCurveToken(_asset).approve(address(pool), _amount);
                amounts[uint(i)] = _amount;
                uint LPTok = pool.calc_token_amount (amounts, true );
                uint retAmount = pool.add_liquidity(amounts, 
                                                    LPTok, 
                                                    true);
                iCurveToken(pool.lp_token()).transfer(_beneficiar, retAmount);
            }
        }
    }

    function unstake (address _asset, address _pool, uint256 _amount, address _beneficiar )  public override returns (uint256) {
     iCurvePool   pool = iCurvePool(_pool);
        for (uint256 i=0; i<3; i++ ) {    
            if (pool.underlying_coins(i) == _asset) {
                uint256 [3] memory amounts;
                iCurveToken(pool.lp_token()).approve(address(pool), _amount);
                amounts[uint(i)] = _amount;
                uint LPTok = pool.calc_token_amount (amounts, false );

                uint [3] memory retAmount = pool.remove_liquidity(LPTok ,
                                                                amounts, 
                                                                true);
                IERC20(pool.coins(i)).transfer(_beneficiar, retAmount[i]);
                return retAmount[i];
            }
        }
    }

    function getPriceOffer (address _asset,  address _pool) external override view returns (uint256) {
        iCurvePool  pool = iCurvePool(_pool);
        return pool.get_virtual_price();

    }

    function getPriceLiq (address _asset, address _pool, uint256 _balance) external view override returns (uint256) {
        iCurvePool  pool = iCurvePool(_pool);
        uint256 N_COINS = 3;
        for (uint256 i=0; i<N_COINS; i++) {
            address ai = pool.coins(i);
            if (ai == USDC) {

                for (uint256  j=0; j<3; j++) {
                address aj = pool.coins(j);
                    
                    if (aj == _asset) {
                        return pool.get_dy(int128(uint128(j)), int128(uint128(i)), _balance);
                    }
                }
            }
        }
        revert ("can't find addresses of coins");
    }


}