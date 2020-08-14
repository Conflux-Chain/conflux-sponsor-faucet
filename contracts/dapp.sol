pragma solidity 0.5.11;

contract dapp {
    mapping(address=>uint256) public record;

    function set(address key, uint256 val) public {
        record[key] = val;
    }
}