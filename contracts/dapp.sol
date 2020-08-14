pragma solidity 0.5.11;
import "@openzeppelin/contracts/math/SafeMath.sol";

contract dapp {
    using SafeMath for uint256;
    mapping(address=>uint256) public record;

    function add(address key, uint256 val) public {
        record[key].add(val);
    }
}