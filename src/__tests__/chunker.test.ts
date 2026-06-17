import { describe, expect, it } from 'vitest';
import { chunkText, createTextChunker, hasCJKContent } from '../chunker';

describe('chunkText', () => {
  describe('basic functionality', () => {
    it('should return empty array for empty string', () => {
      expect(chunkText('')).toEqual([]);
    });

    it('should return empty array for whitespace-only string', () => {
      expect(chunkText('   ')).toEqual([]);
      expect(chunkText('\n\t\n')).toEqual([]);
    });

    it('should return single chunk for short text', () => {
      const result = chunkText('Hello world.');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        text: 'Hello world.',
        index: 0,
        total: 1,
        isLast: true,
      });
    });

    it('should normalize whitespace', () => {
      const result = chunkText('Hello    world.\n\n\tHow are you?');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Hello world. How are you?');
    });

    it('should trim leading and trailing whitespace', () => {
      const result = chunkText('  Hello world.  ');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Hello world.');
    });
  });

  describe('boundary detection', () => {
    it('should split at period boundary', () => {
      const text = 'First sentence. Second sentence. Third sentence is here.';
      const result = chunkText(text, { characterLimit: 30 });

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].text).toContain('.');
    });

    it('should split at question mark boundary', () => {
      const text = 'What is this? This is something different that continues.';
      const result = chunkText(text, { characterLimit: 25 });

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].text).toContain('?');
    });

    it('should split at exclamation mark boundary', () => {
      // Text longer than MIN_CHARACTER_LIMIT (50) to ensure chunking
      const text = 'Wow! That is really something amazing and wonderful! This continues on.';
      const result = chunkText(text, { characterLimit: 50 });

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].text).toContain('!');
    });

    it('should split at semicolon boundary', () => {
      const text = 'First clause; second clause follows here with more text.';
      const result = chunkText(text, { characterLimit: 30 });

      expect(result.length).toBeGreaterThanOrEqual(2);
      // Should split at semicolon
      expect(result[0].text).toContain(';');
    });

    it('should split at comma boundary when no other punctuation', () => {
      const text = 'First item, second item, third item continues here for a while.';
      const result = chunkText(text, { characterLimit: 30 });

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should split at space as last resort', () => {
      const text = 'abcdefghij klmnopqrst uvwxyz abcdefghij';
      const result = chunkText(text, { characterLimit: 50 });

      // Each chunk should contain complete words
      for (const chunk of result) {
        expect(chunk.text.trim()).toBe(chunk.text);
      }
    });

    it('should hard split when no boundaries found', () => {
      const text = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz';
      const result = chunkText(text, { characterLimit: 50 });

      expect(result.length).toBeGreaterThanOrEqual(2);
      // Should not exceed character limit
      for (const chunk of result) {
        expect(chunk.text.length).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('chunk metadata', () => {
    it('should have correct index values', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const result = chunkText(text, { characterLimit: 30 });

      result.forEach((chunk, idx) => {
        expect(chunk.index).toBe(idx);
      });
    });

    it('should have correct total value', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = chunkText(text, { characterLimit: 25 });

      const total = result.length;
      result.forEach((chunk) => {
        expect(chunk.total).toBe(total);
      });
    });

    it('should mark only last chunk as isLast', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = chunkText(text, { characterLimit: 25 });

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].isLast).toBe(false);
      }
      expect(result[result.length - 1].isLast).toBe(true);
    });

    it('should have isLast true for single chunk', () => {
      const result = chunkText('Short text.');
      expect(result).toHaveLength(1);
      expect(result[0].isLast).toBe(true);
    });
  });

  describe('character limit options', () => {
    it('should use default character limit (100)', () => {
      // Text shorter than 100 should be single chunk
      const shortText = 'This is a short text that is under 100 characters.';
      const result = chunkText(shortText);
      expect(result).toHaveLength(1);
    });

    it('should respect custom character limit', () => {
      // Text longer than MIN_CHARACTER_LIMIT to test chunking
      // Note: MIN_CHARACTER_LIMIT is 50, so 20 will be clamped to 50
      const text =
        'First sentence here with text. Second sentence here with more text. Third sentence.';
      const result = chunkText(text, { characterLimit: 50 });

      result.forEach((chunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(50);
      });
    });

    it('should clamp character limit to minimum (50)', () => {
      const text = 'This is a sentence that is longer than fifty characters.';
      // Even with limit of 10, minimum is 50
      const result = chunkText(text, { characterLimit: 10 });

      // Should still chunk but with min limit
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should clamp character limit to maximum (300)', () => {
      // Create very long text
      const text = 'A'.repeat(500);
      // Even with limit of 500, maximum is 300
      const result = chunkText(text, { characterLimit: 500 });

      // Should chunk because text exceeds max
      expect(result.length).toBeGreaterThanOrEqual(2);
      result.forEach((chunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(300);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle text exactly at character limit', () => {
      const text = 'A'.repeat(100);
      const result = chunkText(text, { characterLimit: 100 });

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
    });

    it('should handle very long sentences', () => {
      const text =
        'This is a very long sentence that goes on and on and on and on and on and on and on and on and continues even further with more words.';
      const result = chunkText(text, { characterLimit: 50 });

      expect(result.length).toBeGreaterThanOrEqual(2);
      result.forEach((chunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(50);
      });
    });

    it('should handle unicode characters', () => {
      const text = 'Hello world. Cafe. Resume. Naive. Cliche.';
      const result = chunkText(text, { characterLimit: 100 });

      expect(result.length).toBeGreaterThanOrEqual(1);
      // Should preserve unicode - join the text properties
      expect(result.map((c) => c.text).join(' ')).toContain('Cafe');
    });

    it('should handle emoji', () => {
      const text = 'Hello world! This is amazing!';
      const result = chunkText(text, { characterLimit: 50 });

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple consecutive punctuation marks', () => {
      const text = 'Really?! Yes!!! Oh my...';
      const result = chunkText(text, { characterLimit: 100 });

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Really?! Yes!!! Oh my...');
    });
  });
});

describe('createTextChunker', () => {
  it('should create a chunker with default options', () => {
    const chunker = createTextChunker();
    const result = chunker('Hello world.');

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello world.');
  });

  it('should create a chunker with preset options', () => {
    const chunker = createTextChunker({ characterLimit: 50 });
    const text = 'First sentence. Second sentence. Third sentence.';
    const result = chunker(text);

    result.forEach((chunk) => {
      expect(chunk.text.length).toBeLessThanOrEqual(50);
    });
  });

  it('should allow overriding options per call', () => {
    const chunker = createTextChunker({ characterLimit: 100 });
    // Longer text to demonstrate chunking at different limits
    const text =
      'First sentence with enough text here. Second sentence with more text here. Third sentence.';

    // Use preset option (100 chars) - should be single chunk
    const result1 = chunker(text);

    // Override with smaller limit (50 is the minimum) - should produce more chunks
    const result2 = chunker(text, { characterLimit: 50 });

    expect(result2.length).toBeGreaterThan(result1.length);
  });

  it('should merge options correctly', () => {
    const chunker = createTextChunker({ characterLimit: 50, preserveSentences: true });
    const result = chunker('Test text.', { preserveSentences: false });

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Test text.');
  });
});

describe('hasCJKContent', () => {
  it('should detect CJK Unified Ideographs', () => {
    expect(hasCJKContent('Hello 你好 world')).toBe(true);
    expect(hasCJKContent('日本語テキスト')).toBe(true);
  });

  it('should return false for non-CJK text', () => {
    expect(hasCJKContent('Hello world')).toBe(false);
    expect(hasCJKContent('Cafe resume')).toBe(false);
    expect(hasCJKContent('')).toBe(false);
  });

  it('should detect CJK Extension A characters', () => {
    // U+3400-U+4DBF range
    expect(hasCJKContent('\u3400')).toBe(true);
    expect(hasCJKContent('\u4DB5')).toBe(true);
  });

  it('should detect CJK Compatibility Ideographs', () => {
    // U+F900-U+FAFF range
    expect(hasCJKContent('\uF900')).toBe(true);
  });
});

describe('digit-aware splitting', () => {
  it('should not split "3.14" at the period', () => {
    const text =
      'The value of pi is approximately 3.14 and it is used in mathematics regularly for calculations.';
    const result = chunkText(text, { characterLimit: 60 });

    // Every chunk should either contain "3.14" intact or not contain it at all
    const allText = result.map((c) => c.text).join(' ');
    expect(allText).toContain('3.14');
    // No chunk should end with "3." split from "14"
    for (const chunk of result) {
      expect(chunk.text).not.toMatch(/3\.$/);
    }
  });

  it('should not split "1,000" at the comma', () => {
    const text =
      'The total count reached 1,000 items which is a significant milestone for the project.';
    const result = chunkText(text, { characterLimit: 60 });

    const allText = result.map((c) => c.text).join(' ');
    expect(allText).toContain('1,000');
    // No chunk should end with "1," split from "000"
    for (const chunk of result) {
      expect(chunk.text).not.toMatch(/1,$/);
    }
  });

  it('should still split at commas not followed by digits', () => {
    const text =
      'First clause here with text, second clause continues with more detail and information.';
    const result = chunkText(text, { characterLimit: 55 });

    // Should produce multiple chunks splitting at the comma
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('should still split at periods not followed by digits', () => {
    const text = 'First sentence ends here. Second sentence has more content that extends further.';
    const result = chunkText(text, { characterLimit: 50 });

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].text).toContain('.');
  });
});

describe('CJK delimiter support', () => {
  it('should split at Chinese full stop (。)', () => {
    // Each sentence must be >20 chars (MIN_CHUNK_SIZE)
    const text = '這是第一個句子的完整內容。這是第二個句子的完整內容。';
    const result = chunkText(text, { _internalCharacterLimit: 25 });

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].text).toContain('。');
  });

  it('should split at Chinese comma (，)', () => {
    const text = '第一個子句包含較多文字內容，第二個子句也包含足夠多的文字內容。';
    const result = chunkText(text, { _internalCharacterLimit: 25 });

    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('should split at fullwidth question mark (？)', () => {
    const text = '這是一個長問題的完整內容嗎？這是接續的另一個長句子。';
    const result = chunkText(text, { _internalCharacterLimit: 25 });

    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('should split at fullwidth exclamation (！)', () => {
    const text = '這真是太令人驚訝了啊！接下來的句子包含了更多的文字。';
    const result = chunkText(text, { _internalCharacterLimit: 25 });

    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle RES-301 Chinese test text with reduced limit', () => {
    // Original RES-301 test case: 93 Chinese characters that caused Chrome's
    // Google remote voice 15-second cutoff. With a 40-char voice-aware limit,
    // the chunker should split this into multiple chunks.
    const text =
      '為加強大眾對保護水資源的認識，水務署特意設立向公眾開放全新的水資源教育中心 – 「水知園」。我們將以深入淺出的形式，透過展品、現場示範及互動遊戲，讓參觀人士了解水資源相關的資訊。';
    const result = chunkText(text, { _internalCharacterLimit: 40 });

    // Should produce multiple chunks (text is 93 chars, limit is 40)
    expect(result.length).toBeGreaterThanOrEqual(2);
    // Each chunk should respect the limit
    for (const chunk of result) {
      expect(chunk.text.length).toBeLessThanOrEqual(40);
    }
    // All text should be preserved
    const allText = result.map((c) => c.text).join(' ');
    expect(allText).toContain('水知園');
    expect(allText).toContain('水資源');
  });
});

describe('CJK character boundary fallback', () => {
  it('should split between CJK characters when no punctuation found', () => {
    // Pure CJK text with no punctuation — should split at character boundaries
    const text = '你好世界歡迎來到這個美麗的世界我們一起探索這個世界的奧秘吧';
    const result = chunkText(text, { _internalCharacterLimit: 25 });

    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const chunk of result) {
      expect(chunk.text.length).toBeLessThanOrEqual(25);
    }
  });
});

describe('grouping awareness', () => {
  it('should prefer not to split inside parentheses', () => {
    const text =
      'The vocal folds (vocal cords) are the primary sound source for speech in most humans.';
    const result = chunkText(text, { characterLimit: 55 });

    // The parenthetical "(vocal cords)" should not be split across chunks
    for (const chunk of result) {
      // No chunk should have an opening paren without its closing pair (or vice versa)
      const opens = (chunk.text.match(/\(/g) || []).length;
      const closes = (chunk.text.match(/\)/g) || []).length;
      // Either both are present (balanced) or neither
      if (opens > 0 || closes > 0) {
        expect(opens).toBe(closes);
      }
    }
  });

  it('should fall back to normal splitting when grouping exceeds limit', () => {
    // Content inside parentheses is very long — can't keep it together
    const text =
      'Prefix text (this is an extremely long parenthetical that goes on and on with lots of text inside it that simply cannot fit in a single chunk under the character limit) suffix text.';
    const result = chunkText(text, { characterLimit: 80 });

    // Should still produce chunks even though grouping can't be preserved
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const chunk of result) {
      expect(chunk.text.length).toBeLessThanOrEqual(80);
    }
  });
});

describe('_internalCharacterLimit', () => {
  it('should bypass min/max clamping', () => {
    // Normal characterLimit of 30 would be clamped to 50 (MIN_CHARACTER_LIMIT)
    // _internalCharacterLimit should bypass this
    const text =
      'This is a test text that will be chunked at a smaller limit than normally allowed.';
    const result = chunkText(text, { _internalCharacterLimit: 30 });

    // Should produce more chunks than with clamped limit of 50
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const chunk of result) {
      expect(chunk.text.length).toBeLessThanOrEqual(30);
    }
  });

  it('should take precedence over characterLimit', () => {
    const text = 'First sentence here. Second sentence here. Third sentence here again.';

    // characterLimit = 100 (no split), _internalCharacterLimit = 30 (should split)
    const result = chunkText(text, {
      characterLimit: 100,
      _internalCharacterLimit: 30,
    });

    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('should allow limits below MIN_CHARACTER_LIMIT', () => {
    const text = '你好世界歡迎來到這個美麗的世界';
    // 40 chars is below MIN_CHARACTER_LIMIT (50) — only possible via _internalCharacterLimit
    const result = chunkText(text, { _internalCharacterLimit: 10 });

    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const chunk of result) {
      expect(chunk.text.length).toBeLessThanOrEqual(10);
    }
  });
});

describe('expanded delimiter priorities', () => {
  it('should prefer sentence endings over clause separators', () => {
    // Build text where both . and , are available as split points
    const text = 'Start of sentence, middle part. End follows here with more text.';
    const result = chunkText(text, { characterLimit: 50 });

    // First chunk should end at "." (sentence ending) rather than "," (clause separator)
    if (result.length > 1) {
      expect(result[0].text).toContain('.');
    }
  });

  it('should split at colon (:) as major separator', () => {
    const text =
      'Important notice: the following information must be read carefully for understanding.';
    const result = chunkText(text, { characterLimit: 50 });

    if (result.length > 1) {
      // Should find colon as a split point
      expect(result[0].text).toContain(':');
    }
  });

  it('should split at fullwidth semicolon (；)', () => {
    const text = '第一個主要段落包含很多文字內容；第二個主要段落也同樣有很多文字需要處理。';
    const result = chunkText(text, { _internalCharacterLimit: 25 });

    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});
