# Aggrega-Stacks Smart Contracts

Smart contracts for the Aggrega-Stacks DEX aggregator built on the Stacks blockchain.

## Overview

This project implements a decentralized exchange (DEX) aggregator on the Stacks blockchain using Clarity smart contracts. It provides optimal routing across multiple DEXs to ensure the best trading rates for users.

## Contract Architecture

The system consists of several key contracts:

- **Router**: Main entry point for token swaps
- **Route Manager**: Handles routing logic and path optimization
- **Liquidity Manager**: Tracks and manages liquidity across DEXs
- **Price Manager**: Manages price feeds and calculations
- **Fee Manager**: Handles fee collection and distribution
- **Governance**: Manages system administration and upgrades

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run tests:
   ```bash
   clarinet test
   ```

## Testing

The project includes comprehensive test suites:

- Unit Tests: Individual contract functionality
- Integration Tests: Cross-contract interactions
- Error Scenario Tests: Error handling and edge cases
- Performance Tests: System behavior under load
- Market Simulation Tests: Real-world scenario testing

## Security

- All contracts implement proper access controls
- Critical functions are protected by governance
- Emergency shutdown mechanism is available
- Comprehensive error handling for all operations

## License

MIT License
