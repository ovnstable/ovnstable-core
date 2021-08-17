pragma solidity >=  0.8.0;
interface iReg {
    function sett (bytes memory _in) external;
    function gett (bytes memory _in) external returns (bytes memory _out);
}