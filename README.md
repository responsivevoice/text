<p align="center">
  <img src="https://cdn.responsivevoice.org/assets/logo-128.svg" width="128" height="128" alt="ResponsiveVoice logo">
</p>

<h1 align="center">@responsivevoice/text</h1>

<p align="center">
  <a href="https://github.com/responsivevoice/text/actions/workflows/ci.yml"><img src="https://github.com/responsivevoice/text/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  Text processing utilities for ResponsiveVoice TTS — chunking, duration estimation, and hashing.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@responsivevoice/text"><img src="https://img.shields.io/npm/v/@responsivevoice/text.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@responsivevoice/text"><img src="https://img.shields.io/npm/dm/@responsivevoice/text.svg" alt="npm downloads"></a>
  <a href="https://github.com/responsivevoice/text"><img src="https://img.shields.io/badge/GitHub-text-181717?logo=github&logoColor=white" alt="GitHub"></a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT">
</p>

---

> **Internal package** — published as a dependency of [`@responsivevoice/core`](https://github.com/responsivevoice/core). You usually do not install this directly.

## Installation

```bash
npm install @responsivevoice/text
```

## Usage

```typescript
import {
  chunkText,
  getEstimatedTimeLength,
  djb2Hash,
} from '@responsivevoice/text';

const chunks = chunkText('Long text to split for TTS...', {
  characterLimit: 100,
});
const durationMs = getEstimatedTimeLength('Hello, how are you today?');
const hash = djb2Hash('Hello world');
```

## API

| Export                           | Description                                                |
| -------------------------------- | ---------------------------------------------------------- |
| `chunkText`                      | Split text into chunks respecting sentence/word boundaries |
| `createTextChunker`              | Create a reusable chunker with configured options          |
| `hasCJKContent`                  | Detect CJK characters for language-aware chunking          |
| `getEstimatedTimeLength`         | Estimate speech duration in ms (with text preprocessing)   |
| `getEstimatedTimeLengthWithRate` | Estimate duration adjusted for speech rate                 |
| `djb2Hash`                       | Fast DJB2 string hash                                      |

## License

MIT

---

**Other language SDKs:** [Python](https://github.com/responsivevoice/sdk-python) · [Go](https://github.com/responsivevoice/sdk-go) · [PHP](https://github.com/responsivevoice/sdk-php) · [Java](https://github.com/responsivevoice/sdk-java)

**AI coding agents:** install the [ResponsiveVoice skill](https://github.com/responsivevoice/skills) — `npx skills add responsivevoice/skills`
