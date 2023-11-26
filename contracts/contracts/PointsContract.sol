// SPDX-License-Identifier: PHUNKY
pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Points is Pausable, AccessControl, ReentrancyGuard {

    bytes32 public constant POINTS_MANAGER_ROLE = keccak256("POINTS_MANAGER_ROLE");

    // ========================================
    // ∬      Points are worth nothing        ∬
    // ========================================
    // ∬   SALES           |   100 Poins      ∬
    // ∬   AUCTION BIDS    |   42 Points      ∬
    // ∬   DONATIONS       |   1/0.0001 eth   ∬
    // ========================================

    uint256 public multiplier;

    mapping(address => uint256) public points;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(POINTS_MANAGER_ROLE, msg.sender);

        multiplier = 1;
    }

    function addPoints(address user, uint256 amount) external onlyRole(POINTS_MANAGER_ROLE) whenNotPaused {
        _addPoints(user, amount);
    }

    function removePoints(address user, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(points[user] >= amount, "Insufficient points");
        points[user] -= amount;
    }

    function transferPoints(address to, uint256 amount) external whenNotPaused nonReentrant {
        require(points[msg.sender] >= amount, "Insufficient points");
        points[msg.sender] -= amount;
        _addPoints(to, amount);
    }

    function drainPoints(address user) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        points[user] = 0;
    }

    function _addPoints(address user, uint256 amount) internal {
        uint pointsAwarded = amount * multiplier;
        points[user] += pointsAwarded;
    }

    function changeMultiplier(uint newMultiplier) public onlyRole(DEFAULT_ADMIN_ROLE) {
        multiplier = newMultiplier;
    }

    function grantManager(address manager) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(POINTS_MANAGER_ROLE, manager);
    }

    function revokeManager(address manager) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(POINTS_MANAGER_ROLE, manager);
    }
}