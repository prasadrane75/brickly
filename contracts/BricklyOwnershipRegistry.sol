// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BricklyOwnershipRegistry
/// @notice Demo-ready registry for recording ownership proofs and transfer events
/// for fractional property interests. This contract is intentionally minimal and
/// is designed for test networks only in Phase 3.
contract BricklyOwnershipRegistry {
    address public owner;

    struct OwnershipPosition {
        bytes32 propertyId;
        address holder;
        uint256 sharesOwned;
        bytes32 metadataHash;
        uint256 updatedAt;
    }

    mapping(bytes32 => mapping(address => OwnershipPosition)) private positions;

    event OwnershipRecorded(
        bytes32 indexed propertyId,
        address indexed holder,
        uint256 sharesOwned,
        bytes32 metadataHash
    );

    event TransferRecorded(
        bytes32 indexed propertyId,
        address indexed from,
        address indexed to,
        uint256 sharesTransferred,
        bytes32 metadataHash
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function recordOwnership(
        bytes32 propertyId,
        address holder,
        uint256 sharesOwned,
        bytes32 metadataHash
    ) external onlyOwner {
        positions[propertyId][holder] = OwnershipPosition({
            propertyId: propertyId,
            holder: holder,
            sharesOwned: sharesOwned,
            metadataHash: metadataHash,
            updatedAt: block.timestamp
        });

        emit OwnershipRecorded(propertyId, holder, sharesOwned, metadataHash);
    }

    function recordTransfer(
        bytes32 propertyId,
        address from,
        address to,
        uint256 sharesTransferred,
        bytes32 metadataHash
    ) external onlyOwner {
        OwnershipPosition storage fromPosition = positions[propertyId][from];
        require(fromPosition.sharesOwned >= sharesTransferred, "INSUFFICIENT_SHARES");

        fromPosition.sharesOwned -= sharesTransferred;
        fromPosition.updatedAt = block.timestamp;

        OwnershipPosition storage toPosition = positions[propertyId][to];
        toPosition.propertyId = propertyId;
        toPosition.holder = to;
        toPosition.sharesOwned += sharesTransferred;
        toPosition.metadataHash = metadataHash;
        toPosition.updatedAt = block.timestamp;

        emit TransferRecorded(propertyId, from, to, sharesTransferred, metadataHash);
    }

    function getPosition(bytes32 propertyId, address holder)
        external
        view
        returns (OwnershipPosition memory)
    {
        return positions[propertyId][holder];
    }
}
