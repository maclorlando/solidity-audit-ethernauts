# 🛡️ Smart Contract Audit & Ethernaut Challenge Solutions

This project showcases a **static analysis, cleanup, and audit process** applied to a suite of Solidity smart contracts, along with solutions to selected **Ethernaut** security challenges from OpenZeppelin.

It demonstrates measurable improvements in code quality, security, readability, and test coverage — supported by unit tests, mutation testing, static analysis reports, and exploitation scripts.

---

## 📋 Summary

✅ Ran **Solhint** and **Slither** static analysis tools on the contracts.  
✅ Fixed relevant warnings and errors.  
✅ Justified or documented acceptable warnings (false positives or tradeoffs).  
✅ Achieved **100% unit test coverage** and significant **mutation testing score**.  
✅ Wrote and executed tests demonstrating real-world security exploits (Ethernaut).  
✅ Applied consistent formatting with **Prettier**.

---

## 🛠️ Tools Used

- [Solhint](https://protofire.github.io/solhint/) — Solidity linter
- [Slither](https://github.com/crytic/slither) — Static analysis
- Hardhat — Development, deployment & testing
- [SuMo](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator) — Mutation testing
- Prettier — Code formatting
- Chai & Mocha — Testing libraries

---

## 🚀 Results

### ✅ Solhint Static Analysis
npx solhint "contracts/**/*.sol"

- ✅ **0 errors**
- ⚠️ **85 warnings**
  - Relevant warnings fixed.
  - Documented acceptable warnings for clarity & development efficiency.

---

### ✅ Fixes Applied
- Converted all 'single quotes' to "double quotes" per Solhint rules.
- Increased maximum line length to 130 in `.solhint.json`.
- Ensured visibility modifiers and variable casing met Solidity conventions.
- Re-ran Prettier with Solidity plugin for consistent formatting.

---

### ⚠️ Justified Ignored Warnings
| Rule                | Reason |
|----------------------|-----------------------------------------------|
| `no-global-import`   | Simplifies rapid development & readability. |
| `gas-custom-errors`  | Kept `require()` for clarity & debugging ease. |
| `reason-string`      | Longer strings improve error clarity during dev. |

---

## 🧪 Unit Testing & Coverage

### 🔬 Coverage Report (solidity-coverage)

| Contract       | Statements | Branches | Functions | Lines |
|----------------|------------|----------|-----------|-------|
| Forge.sol      | 100%       | 100%     | 100%      | 100%  |
| My1155.sol     | 100%       | 88.89%   | 100%      | 100%  |
| MyToken.sol    | 100%       | 81.25%   | 100%      | 100%  |
| TokenSale.sol  | 100%       | 95%      | 100%      | 100%  |
| **All Files**  | 100%       | 89.02%   | 100%      | 100%  |

- ✅ **96 passing tests**

---

## 🧬 Mutation Testing (SuMo)

| Metric                | Value |
|------------------------|-------|
| Mutants Generated      | 329 |
| Mutants Killed         | 231 |
| Live Mutants Remaining | 80 |
| Stillborn Mutants      | 18 |
| ✅ Mutation Score       | **74.28%** |

Artifacts included in `/results/`:
- [`mutations.json`](./results/mutations.json)
- [`sumo-log.txt`](./results/sumo-log.txt)
- [`index.html`](./results/index.html)

Remaining live mutants were deprioritized as rare or edge cases for clarity & scope.

---

## 🧪 Slither Static Analysis

Ran Slither on the 4 main contracts (`MyToken.sol`, `TokenSale.sol`, `My1155.sol`, `Forge.sol`) with remappings for OpenZeppelin.

slither contracts/MyToken.sol --solc-remaps @openzeppelin=./node_modules/@openzeppelin

### ⚠️ Documented Tradeoffs / False Positives:
- Unchecked `transfer()` & `transferFrom()` — OpenZeppelin reverts by default.
- Missing zero-address checks — acceptable in controlled deployment.
- Constants not marked as `constant` — intentional for testing flexibility.
- Solidity version (`^0.8.20`) — safe in context, thoroughly tested.
- Naming convention deviations — deliberate for readability & clarity.

Full report: [`slither-report.txt`](./slither-report.txt)

---

## 🎮 Ethernaut Challenge Solutions

Includes Solidity contracts & Hardhat tests demonstrating solutions to **Ethernaut** smart contract security challenges.

### Challenges Solved
| Level   | Name       | Exploit Summary                              |
|---------|------------|-----------------------------------------------|
| Level 1 | Fallback   | Become owner via fallback & withdraw funds. |
| Level 2 | Fallout    | Claim ownership by calling misnamed constructor `Fal1out`. |
| Level 3 | CoinFlip   | Predict randomness using `blockhash` to win repeatedly. |

See test files in `/test/`:
- [`Fallback.test.ts`](./test/Fallback.test.ts)
- [`Fallout.test.ts`](./test/Fallout.test.ts)
- [`CoinFlip.test.ts`](./test/CoinFlip.test.ts)

---

## 📄 Contracts Audited

| Contract         | Description                                       |
|------------------|---------------------------------------------------|
| `My1155.sol`     | ERC1155 multi-token contract                      |
| `Forge.sol`      | Crafting logic with ERC1155                       |
| `MyNFT.sol`      | ERC721 NFT contract                               |
| `MyToken.sol`    | ERC20 token contract                              |
| `Staker.sol`     | NFT staking with ERC20 rewards                    |
| `TokenSale.sol`  | Token sale with refund mechanism                  |
| `CoinFlip.sol`   | Vulnerable contract for randomness manipulation   |
| `Fallback.sol`   | Vulnerable contract for fallback function exploit |
| `Fallout.sol`    | Vulnerable contract for constructor misuse        |


---

## 📜 License

MIT

---