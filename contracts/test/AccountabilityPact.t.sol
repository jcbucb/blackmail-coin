// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AccountabilityPact} from "../src/AccountabilityPact.sol";

/// @dev Minimal ERC20 mock for testing
contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract AccountabilityPactTest is Test {
    AccountabilityPact pact;
    MockUSDC usdc;

    address oracle = makeAddr("oracle");
    address creator = makeAddr("creator");
    address penaltyRecipient = makeAddr("penaltyRecipient");
    address stranger = makeAddr("stranger");

    uint256 constant STAKE = 100e6; // 100 USDC
    uint256 constant TARGET = 5; // 5 runs
    uint256 deadline;

    // Default goal params
    AccountabilityPact.GoalType constant GOAL_TYPE = AccountabilityPact.GoalType.RunCount;

    function setUp() public {
        usdc = new MockUSDC();
        pact = new AccountabilityPact(address(usdc), oracle);

        deadline = block.timestamp + 30 days;

        // Fund creator and approve contract
        usdc.mint(creator, 1000e6);
        vm.prank(creator);
        usdc.approve(address(pact), type(uint256).max);
    }

    // ──────────────────────────────────────────────
    // createPact
    // ──────────────────────────────────────────────

    function test_createPact_success() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);

        assertEq(id, 0);
        assertEq(pact.pactCount(), 1);
        assertEq(usdc.balanceOf(address(pact)), STAKE);
        assertEq(usdc.balanceOf(creator), 1000e6 - STAKE);

        AccountabilityPact.Pact memory p = pact.getPact(0);
        assertEq(p.creator, creator);
        assertEq(uint8(p.goalType), uint8(GOAL_TYPE));
        assertEq(p.targetValue, TARGET);
        assertEq(p.deadline, deadline);
        assertEq(p.stakeAmount, STAKE);
        assertEq(p.penaltyRecipient, penaltyRecipient);
        assertEq(uint8(p.status), uint8(AccountabilityPact.PactStatus.Active));
        assertEq(p.createdAt, block.timestamp);
    }

    function test_createPact_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit AccountabilityPact.PactCreated(0, creator, GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);

        vm.prank(creator);
        pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);
    }

    function test_createPact_incrementsCount() public {
        vm.startPrank(creator);
        pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);
        pact.createPact(GOAL_TYPE, TARGET, deadline + 1 days, STAKE, penaltyRecipient);
        vm.stopPrank();

        assertEq(pact.pactCount(), 2);
        assertEq(pact.getPact(0).creator, creator);
        assertEq(pact.getPact(1).creator, creator);
    }

    function test_createPact_revert_deadlineTooSoon() public {
        uint256 badDeadline = block.timestamp + 23 hours;
        vm.prank(creator);
        vm.expectRevert("Deadline min 1 day out");
        pact.createPact(GOAL_TYPE, TARGET, badDeadline, STAKE, penaltyRecipient);
    }

    function test_createPact_revert_zeroStake() public {
        vm.prank(creator);
        vm.expectRevert("Stake must be > 0");
        pact.createPact(GOAL_TYPE, TARGET, deadline, 0, penaltyRecipient);
    }

    function test_createPact_revert_zeroTarget() public {
        vm.prank(creator);
        vm.expectRevert("Target must be > 0");
        pact.createPact(GOAL_TYPE, 0, deadline, STAKE, penaltyRecipient);
    }

    function test_createPact_revert_selfPenalty() public {
        vm.prank(creator);
        vm.expectRevert("Cannot be own penalty recipient");
        pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, creator);
    }

    function test_createPact_revert_zeroPenaltyRecipient() public {
        vm.prank(creator);
        vm.expectRevert("Invalid penalty recipient");
        pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, address(0));
    }

    function test_createPact_allGoalTypes() public {
        vm.startPrank(creator);
        pact.createPact(AccountabilityPact.GoalType.RunCount, 5, deadline, STAKE, penaltyRecipient);
        pact.createPact(AccountabilityPact.GoalType.RunDistance, 50000, deadline, STAKE, penaltyRecipient);
        pact.createPact(AccountabilityPact.GoalType.RideCount, 10, deadline, STAKE, penaltyRecipient);
        pact.createPact(AccountabilityPact.GoalType.RideDistance, 200000, deadline, STAKE, penaltyRecipient);
        pact.createPact(AccountabilityPact.GoalType.AnyActivityCount, 20, deadline, STAKE, penaltyRecipient);
        vm.stopPrank();

        assertEq(pact.pactCount(), 5);
    }

    // ──────────────────────────────────────────────
    // resolve — goal met
    // ──────────────────────────────────────────────

    function test_resolve_goalMet_refundsCreator() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);

        vm.warp(deadline);

        uint256 creatorBalanceBefore = usdc.balanceOf(creator);

        vm.prank(oracle);
        pact.resolve(id, TARGET); // exactly meets target

        assertEq(uint8(pact.getPact(id).status), uint8(AccountabilityPact.PactStatus.Resolved));
        assertEq(usdc.balanceOf(creator), creatorBalanceBefore + STAKE);
        assertEq(usdc.balanceOf(address(pact)), 0);
    }

    function test_resolve_goalExceeded_refundsCreator() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);

        vm.warp(deadline);

        vm.prank(oracle);
        pact.resolve(id, TARGET + 100); // exceeds target

        assertEq(usdc.balanceOf(creator), 1000e6); // fully refunded
    }

    // ──────────────────────────────────────────────
    // resolve — goal missed
    // ──────────────────────────────────────────────

    function test_resolve_goalMissed_sendsToPenalty() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);

        vm.warp(deadline);

        vm.prank(oracle);
        pact.resolve(id, TARGET - 1); // one short

        assertEq(uint8(pact.getPact(id).status), uint8(AccountabilityPact.PactStatus.Resolved));
        assertEq(usdc.balanceOf(penaltyRecipient), STAKE);
        assertEq(usdc.balanceOf(creator), 1000e6 - STAKE);
    }

    function test_resolve_zeroActual_sendsToPenalty() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);

        vm.warp(deadline);

        vm.prank(oracle);
        pact.resolve(id, 0);

        assertEq(usdc.balanceOf(penaltyRecipient), STAKE);
    }

    function test_resolve_emitsEvent() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);
        vm.warp(deadline);

        vm.expectEmit(true, false, false, true);
        emit AccountabilityPact.PactResolved(id, true, TARGET);

        vm.prank(oracle);
        pact.resolve(id, TARGET);
    }

    // ──────────────────────────────────────────────
    // resolve — reverts
    // ──────────────────────────────────────────────

    function test_resolve_revert_notOracle() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);
        vm.warp(deadline);

        vm.prank(stranger);
        vm.expectRevert("Only oracle");
        pact.resolve(id, TARGET);
    }

    function test_resolve_revert_deadlineNotReached_goalNotMet() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);

        // Can't penalize before deadline
        vm.prank(oracle);
        vm.expectRevert("Deadline not reached");
        pact.resolve(id, TARGET - 1);
    }

    function test_resolve_earlyIfGoalMet() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);

        // Can resolve early if goal is met
        vm.prank(oracle);
        pact.resolve(id, TARGET);

        (,,,,,,AccountabilityPact.PactStatus status,) = pact.pacts(id);
        assertEq(uint8(status), uint8(AccountabilityPact.PactStatus.Resolved));
        assertEq(usdc.balanceOf(creator), 1000e6);
    }

    function test_resolve_revert_alreadyResolved() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);
        vm.warp(deadline);

        vm.prank(oracle);
        pact.resolve(id, TARGET);

        vm.prank(oracle);
        vm.expectRevert("Pact not active");
        pact.resolve(id, TARGET);
    }

    function test_resolve_revert_nonexistentPact() public {
        vm.warp(deadline);
        vm.prank(oracle);
        vm.expectRevert("Pact does not exist");
        pact.resolve(999, TARGET);
    }

    // ──────────────────────────────────────────────
    // claimExpired
    // ──────────────────────────────────────────────

    function test_claimExpired_refundsCreator() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);

        vm.warp(deadline + 7 days);

        uint256 creatorBalanceBefore = usdc.balanceOf(creator);

        vm.prank(stranger); // anyone can trigger
        pact.claimExpired(id);

        assertEq(uint8(pact.getPact(id).status), uint8(AccountabilityPact.PactStatus.Expired));
        assertEq(usdc.balanceOf(creator), creatorBalanceBefore + STAKE);
        assertEq(usdc.balanceOf(address(pact)), 0);
    }

    function test_claimExpired_emitsEvent() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);
        vm.warp(deadline + 7 days);

        vm.expectEmit(true, false, false, false);
        emit AccountabilityPact.PactExpired(id);

        pact.claimExpired(id);
    }

    function test_claimExpired_revert_gracePeriodNotOver() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);

        vm.warp(deadline + 7 days - 1);

        vm.expectRevert("Grace period not over");
        pact.claimExpired(id);
    }

    function test_claimExpired_revert_alreadyExpired() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);
        vm.warp(deadline + 7 days);
        pact.claimExpired(id);

        vm.expectRevert("Pact not active");
        pact.claimExpired(id);
    }

    function test_claimExpired_revert_alreadyResolved() public {
        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);
        vm.warp(deadline);
        vm.prank(oracle);
        pact.resolve(id, TARGET);

        vm.warp(deadline + 7 days);
        vm.expectRevert("Pact not active");
        pact.claimExpired(id);
    }

    function test_claimExpired_revert_nonexistentPact() public {
        vm.warp(deadline + 7 days);
        vm.expectRevert("Pact does not exist");
        pact.claimExpired(999);
    }

    // ──────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────

    function test_constructor_setsAddresses() public view {
        assertEq(address(pact.USDC()), address(usdc));
        assertEq(pact.ORACLE(), oracle);
    }

    function test_constructor_revert_zeroUsdc() public {
        vm.expectRevert("Invalid USDC address");
        new AccountabilityPact(address(0), oracle);
    }

    function test_constructor_revert_zeroOracle() public {
        vm.expectRevert("Invalid oracle address");
        new AccountabilityPact(address(usdc), address(0));
    }

    // ──────────────────────────────────────────────
    // Fuzz
    // ──────────────────────────────────────────────

    function testFuzz_resolve_goalMetBoundary(uint256 actual) public {
        vm.assume(actual >= TARGET && actual <= type(uint128).max);

        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);
        vm.warp(deadline);

        vm.prank(oracle);
        pact.resolve(id, actual);

        assertEq(usdc.balanceOf(creator), 1000e6); // stake returned
    }

    function testFuzz_resolve_goalMissedBoundary(uint256 actual) public {
        vm.assume(actual < TARGET);

        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, STAKE, penaltyRecipient);
        vm.warp(deadline);

        vm.prank(oracle);
        pact.resolve(id, actual);

        assertEq(usdc.balanceOf(penaltyRecipient), STAKE);
    }

    function testFuzz_createPact_stakeAmounts(uint256 stake) public {
        vm.assume(stake > 0 && stake <= 1000e6);

        vm.prank(creator);
        uint256 id = pact.createPact(GOAL_TYPE, TARGET, deadline, stake, penaltyRecipient);

        assertEq(pact.getPact(id).stakeAmount, stake);
        assertEq(usdc.balanceOf(address(pact)), stake);
    }
}
