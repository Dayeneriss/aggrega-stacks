# Aggrega-Stacks: DEX Aggregator on Stacks

A decentralized exchange (DEX) aggregator built on the Stacks blockchain, designed to provide users with the best trading rates by routing trades through multiple DEXs.

## Technical Overview

### Smart Contract Architecture

The system implements a modular architecture with the following key components:

1. **Router Contract (`router.clar`)**
   - Entry point for all swap operations
   - Handles trade execution and routing
   - Implements slippage protection
   - Manages transaction flow

2. **Route Manager Contract (`route-manager.clar`)**
   - Manages available trading routes
   - Implements path-finding algorithms
   - Optimizes routes for best rates
   - Handles multi-hop trades

3. **Liquidity Manager Contract (`liquidity-manager.clar`)**
   - Tracks liquidity across DEXs
   - Updates and verifies liquidity states
   - Implements liquidity checks
   - Manages liquidity thresholds

4. **Price Manager Contract (`price-manager.clar`)**
   - Manages price feeds
   - Implements price calculation logic
   - Handles price updates
   - Provides price verification

5. **Fee Manager Contract (`fee-manager.clar`)**
   - Manages protocol fees
   - Handles fee distribution
   - Implements fee calculations
   - Controls fee parameters

6. **Governance Contract (`governance.clar`)**
   - Manages protocol administration
   - Handles contract upgrades
   - Controls admin permissions
   - Implements emergency functions

### Security Features

- **Access Control**: Strict permission management for administrative functions
- **Price Protection**: Guards against price manipulation and stale prices
- **Slippage Control**: Configurable slippage tolerance for trades
- **Emergency Shutdown**: Ability to pause the system in case of emergencies
- **Input Validation**: Comprehensive validation for all contract inputs

### Testing Framework

The project includes extensive testing:

1. **Unit Tests**
   - Individual contract functionality testing
   - Function-level validation
   - Edge case handling

2. **Integration Tests**
   - Cross-contract interaction testing
   - Complete trade flow validation
   - System-wide functionality

3. **Error Scenario Tests**
   - Validation of error handling
   - Edge case management
   - Security boundary testing

4. **Performance Tests**
   - System behavior under load
   - Concurrent operation handling
   - Resource utilization testing

5. **Market Simulation Tests**
   - Real-world scenario testing
   - Market volatility handling
   - Complex trading patterns

## Development

### Prerequisites

- Clarinet
- Node.js >= 14
- Git

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Dayeneriss/aggrega-stacks.git
   cd aggrega-stacks/contracts
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests:
   ```bash
   clarinet test
   ```

### Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

  ## Structure

contracts/
├── .gitignore        # Fichiers à ignorer par Git
├── README.md         # Documentation du projet
├── src/             
│   ├── clarity/      # Contrats Clarity
│   └── interfaces/   # Interfaces TypeScript
└── tests/
    ├── unit/         # Tests unitaires
    ├── integration/  # Tests d'intégration
    ├── performance/  # Tests de performance
    └── simulation/   # Tests de simulation

## License

This project is licensed under the MIT License - see the LICENSE file for details.
