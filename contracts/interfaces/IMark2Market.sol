// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;


interface IMark2Market   {

    function m2m () external view returns (int128[] memory actChanges) ;

    function changeBal (address _active, int128 _balance) external ;

}
