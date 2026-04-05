// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

abstract contract IERC20 {
    // Get the account balance of another account with address _owner
    function balanceOf(address _owner) external virtual returns (uint256 balance);

    function transfer(address _to, uint256 _value) external virtual returns (bool success);

    // Allow _spender to withdraw from your account, multiple times, up to the _value amount.
    // If this function is called again it overwrites the current allowance with _value.
    // this function is required for some DEX functionality
    function approve(address _spender, uint256 _value)
    external
    virtual
    returns (bool success);

    function transferFrom(address _from, address _to, uint256 _value) external virtual returns (bool success);

    // Triggered when tokens are transferred.
    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    // Triggered whenever approve(address _spender, uint256 _value) is called.
    event Approval(
        address indexed _owner,
        address indexed _spender,
        uint256 _value
    );
}

contract BlacklistedToken is IERC20 {
    // Owner of this contract
    address public owner;
    uint256 public constant _totalSupply = 1000000;

    // Balances for each account
    mapping(address => uint256) public balances;

    // Owner of account approves the transfer of an amount to another account
    mapping(address => mapping(address => uint256)) public allowed;

    mapping(address => bool) public blacklisted;
    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert('Not owner');
        }
        _;
    }

    // Constructor
    constructor() {
        owner = msg.sender;
        balances[owner] = _totalSupply;
    }

    function blacklistAddress(address _address) external onlyOwner {
        blacklisted[_address] = true;
    }

    function unblacklistAddress(address _address) external onlyOwner {
        blacklisted[_address] = false;
    }

    // Allow _spender to withdraw from your account, multiple times, up to the _value amount.
    // If this function is called again it overwrites the current allowance with _value.
    function approve(address _spender, uint256 _amount)
    external
    override
    returns (bool success)
    {
        allowed[msg.sender][_spender] = _amount;
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _amount) external override returns (bool) {
        require(!blacklisted[_to], "Recipient is blacklisted");

        if (
            balances[_from] >= _amount &&
            allowed[_from][msg.sender] >= _amount &&
            _amount > 0 &&
            balances[_to] + _amount > balances[_to]
        ) {
            balances[_from] -= _amount;
            allowed[_from][msg.sender] -= _amount;
            balances[_to] += _amount;
            emit Transfer(_from, _to, _amount);
            return true;
        } else {
            return false;
        }
    }

    function transfer(address _to, uint256 _amount)
    external
    override
    returns (bool success)
    {
        require(!blacklisted[_to], "Recipient is blacklisted");

        if (
            balances[msg.sender] >= _amount &&
            _amount > 0 &&
            balances[_to] + _amount > balances[_to]
        ) {
            balances[msg.sender] -= _amount;
            balances[_to] += _amount;
            emit Transfer(msg.sender, _to, _amount);
            return true;
        } else {
            return false;
        }
    }

    // What is the balance of a particular account?
    function balanceOf(address _owner)
    external
    override
    view
    returns (uint256 balance)
    {
        return balances[_owner];
    }
}
