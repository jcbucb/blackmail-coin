// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AccountabilityPact {
    enum GoalType {
        RunCount,
        RunDistance,
        RideCount,
        RideDistance,
        AnyActivityCount
    }

    enum PactStatus {
        Active,
        Resolved,
        Expired
    }

    struct Pact {
        address creator;
        GoalType goalType;
        uint256 targetValue;
        uint256 deadline;
        uint256 stakeAmount;
        address penaltyRecipient;
        PactStatus status;
        uint256 createdAt;
    }

    IERC20 public immutable USDC;
    address public immutable ORACLE;
    uint256 public pactCount;

    uint256 public constant GRACE_PERIOD = 7 days;

    mapping(uint256 => Pact) public pacts;

    event PactCreated(
        uint256 indexed pactId,
        address indexed creator,
        GoalType goalType,
        uint256 targetValue,
        uint256 deadline,
        uint256 stakeAmount,
        address penaltyRecipient
    );
    event PactResolved(uint256 indexed pactId, bool goalMet, uint256 actualValue);
    event PactExpired(uint256 indexed pactId);

    constructor(address _usdc, address _oracle) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_oracle != address(0), "Invalid oracle address");
        USDC = IERC20(_usdc);
        ORACLE = _oracle;
    }

    modifier onlyOracle() {
        _checkOracle();
        _;
    }

    function _checkOracle() internal view {
        require(msg.sender == ORACLE, "Only oracle");
    }

    function createPact(
        GoalType goalType,
        uint256 targetValue,
        uint256 deadline,
        uint256 stakeAmount,
        address penaltyRecipient
    ) external returns (uint256) {
        require(deadline >= block.timestamp + 1 days, "Deadline min 1 day out");
        require(stakeAmount > 0, "Stake must be > 0");
        require(targetValue > 0, "Target must be > 0");
        require(penaltyRecipient != msg.sender, "Cannot be own penalty recipient");
        require(penaltyRecipient != address(0), "Invalid penalty recipient");

        require(USDC.transferFrom(msg.sender, address(this), stakeAmount), "USDC transfer failed");

        uint256 pactId = pactCount++;
        pacts[pactId] = Pact({
            creator: msg.sender,
            goalType: goalType,
            targetValue: targetValue,
            deadline: deadline,
            stakeAmount: stakeAmount,
            penaltyRecipient: penaltyRecipient,
            status: PactStatus.Active,
            createdAt: block.timestamp
        });

        emit PactCreated(pactId, msg.sender, goalType, targetValue, deadline, stakeAmount, penaltyRecipient);

        return pactId;
    }

    function resolve(uint256 pactId, uint256 actualValue) external onlyOracle {
        Pact storage pact = pacts[pactId];
        require(pact.creator != address(0), "Pact does not exist");
        require(pact.status == PactStatus.Active, "Pact not active");

        bool goalMet = actualValue >= pact.targetValue;

        // Can resolve early only if goal is met; penalty requires deadline to pass
        require(goalMet || block.timestamp >= pact.deadline, "Deadline not reached");

        pact.status = PactStatus.Resolved;

        address recipient = goalMet ? pact.creator : pact.penaltyRecipient;

        require(USDC.transfer(recipient, pact.stakeAmount), "USDC transfer failed");

        emit PactResolved(pactId, goalMet, actualValue);
    }

    function claimExpired(uint256 pactId) external {
        Pact storage pact = pacts[pactId];
        require(pact.creator != address(0), "Pact does not exist");
        require(pact.status == PactStatus.Active, "Pact not active");
        require(block.timestamp >= pact.deadline + GRACE_PERIOD, "Grace period not over");

        pact.status = PactStatus.Expired;

        require(USDC.transfer(pact.creator, pact.stakeAmount), "USDC transfer failed");

        emit PactExpired(pactId);
    }

    function getPact(uint256 pactId) external view returns (Pact memory) {
        return pacts[pactId];
    }
}
