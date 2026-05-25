// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NINRegistry {
    address public admin;

    struct Identity {
        bytes32 hashNIN;
        string ipfsCid;
        bool exists;
    }

    mapping(address => Identity) private identities;
    mapping(address => mapping(address => uint256)) public accessGrants;

    event IdentityRegistered(address indexed user, bytes32 hashNIN);
    event AccessGranted(address indexed user, address indexed verifier, uint256 expiry);
    event AccessLogged(address indexed verifier, address indexed user, bool result, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // Oracle API registers a user
    function registerIdentity(address _user, bytes32 _hashNIN, string memory _ipfsCid) external onlyAdmin {
        identities[_user] = Identity({
            hashNIN: _hashNIN,
            ipfsCid: _ipfsCid,
            exists: true
        });

        emit IdentityRegistered(_user, _hashNIN);
    }

    // Citizen grants access to a Verifier
    function grantAccess(address _verifier, uint256 _durationInSeconds) external {
        require(identities[msg.sender].exists, "No identity found");
        uint256 expiry = block.timestamp + _durationInSeconds;
        accessGrants[msg.sender][_verifier] = expiry;
        
        emit AccessGranted(msg.sender, _verifier, expiry);
    }

    // Verifier fetches CID (if they have access)
    function verifyIdentity(address _user) external view returns (string memory) {
        require(identities[_user].exists, "User not found");
        require(accessGrants[_user][msg.sender] >= block.timestamp, "Access expired or denied");
        
        return identities[_user].ipfsCid;
    }

    // Verifier logs the result of the biometric match
    function logAccess(address _user, bool _matchResult) external {
        require(accessGrants[_user][msg.sender] >= block.timestamp, "Access expired or denied");
        emit AccessLogged(msg.sender, _user, _matchResult, block.timestamp);
    }
}