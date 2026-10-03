# History of flush() Call on Forwarder.sol Line 72

## Question
When was line 72 in Forwarder.sol introduced, where we call the flush function when we receive funds?

## Answer

**Line 72** in `contracts/Forwarder.sol`, which contains `flush();` within the `fallback()` function, was **modified** on:

**Date:** January 7, 2021 at 17:23:59 PST  
**Commit:** c5ae39ad15345ee5f1ed90e89bfbda18b84f605d  
**Author:** Mark Toda <mtoda@bitgo.com>  
**Commit Message:** Fix ForwarderDeposited event data  
**Ticket:** BG-28248

### Important Note
The functionality of calling `flush()` when receiving funds has been present **since the initial commit** (fb24dd6), but the **calling mechanism changed** in commit c5ae39ad from `this.flush()` (external call) to `flush()` (internal call).

## Context

This line is part of the `fallback()` function that gets called when the contract receives a call with data that doesn't match any other function signature:

```solidity
fallback() external payable {
    flush();
}
```

Note: There's also a `receive()` function that calls `flush()` when plain Ether is sent without any data.

## Complete History

### Original Implementation (Initial Commit - August 3, 2020)
The `fallback()` function with a call to flush was present from the very first commit:

**Date:** August 3, 2020 at 12:08:47 PST  
**Commit:** fb24dd6ac2fb3c70dad0266995dd4d4b5605bcae  
**Author:** Mark Toda <mtoda@bitgo.com>

```solidity
fallback() external payable {
    this.flush();  // External call using 'this.'
}
```

### Current Implementation (Commit c5ae39ad - January 7, 2021)
The commit changed the calling mechanism:

```solidity
fallback() external payable {
    flush();  // Internal call without 'this.'
}
```

## Why the Change Was Made

The change was made to fix an issue with the `ForwarderDeposited` event. The problem was:

1. When `flush()` was marked as `external`, it could only be called externally
2. Calling `this.flush()` from within the contract forced an external CALL operation
3. External CALLs change the `msg.sender` to the calling contract's address
4. This meant the event always showed the forwarder itself as the sender, not the actual original sender

### Technical Details

The execution flow in a proxy-based architecture:
- When funds were sent to the forwarder: A (sender) → B (proxy) → DELEGATECALL to C (implementation's fallback()/receive())
- With external call: The fallback/receive() then triggered: B (proxy) → external CALL to B's flush() 
- This external CALL changed `msg.sender` from A to B (the proxy address)

The fix:
1. Changed `flush()` from `external` to `public` so it can be called both externally and internally
2. Removed the `this.` syntax to make internal calls instead of external calls
3. Internal calls preserve the original `msg.sender`, fixing the event emission

## Summary

The functionality of calling `flush()` when receiving funds through the `fallback()` function was **originally introduced on August 3, 2020** in the initial commit (fb24dd6) by Mark Toda. 

However, the **current form of the call** on line 72 was **modified on January 7, 2021** (commit c5ae39ad) by the same author. This change modified the calling convention from an external call (`this.flush()`) to an internal call (`flush()`) to properly preserve the original sender's address in the emitted `ForwarderDeposited` events.
