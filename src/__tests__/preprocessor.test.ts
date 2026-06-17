import { describe, expect, it } from 'vitest';
import {
  numberToWords,
  preprocessText,
  replaceCurrencySymbols,
  replaceNumbersWithWords,
} from '../preprocessor';

describe('numberToWords', () => {
  describe('basic numbers', () => {
    it('should convert zero', () => {
      expect(numberToWords(0)).toBe('zero');
    });

    it('should convert single digits', () => {
      expect(numberToWords(1)).toBe('one');
      expect(numberToWords(5)).toBe('five');
      expect(numberToWords(9)).toBe('nine');
    });

    it('should convert teens', () => {
      expect(numberToWords(10)).toBe('ten');
      expect(numberToWords(11)).toBe('eleven');
      expect(numberToWords(12)).toBe('twelve');
      expect(numberToWords(13)).toBe('thirteen');
      expect(numberToWords(15)).toBe('fifteen');
      expect(numberToWords(19)).toBe('nineteen');
    });

    it('should convert tens', () => {
      expect(numberToWords(20)).toBe('twenty');
      expect(numberToWords(30)).toBe('thirty');
      expect(numberToWords(40)).toBe('forty');
      expect(numberToWords(50)).toBe('fifty');
      expect(numberToWords(60)).toBe('sixty');
      expect(numberToWords(70)).toBe('seventy');
      expect(numberToWords(80)).toBe('eighty');
      expect(numberToWords(90)).toBe('ninety');
    });

    it('should convert two-digit numbers', () => {
      expect(numberToWords(21)).toBe('twenty one');
      expect(numberToWords(42)).toBe('forty two');
      expect(numberToWords(99)).toBe('ninety nine');
    });
  });

  describe('hundreds', () => {
    it('should convert exact hundreds', () => {
      expect(numberToWords(100)).toBe('one hundred');
      expect(numberToWords(200)).toBe('two hundred');
      expect(numberToWords(500)).toBe('five hundred');
      expect(numberToWords(900)).toBe('nine hundred');
    });

    it('should convert hundreds with tens', () => {
      expect(numberToWords(110)).toBe('one hundred ten');
      expect(numberToWords(123)).toBe('one hundred twenty three');
      expect(numberToWords(456)).toBe('four hundred fifty six');
      expect(numberToWords(999)).toBe('nine hundred ninety nine');
    });

    it('should convert hundreds with only ones', () => {
      expect(numberToWords(101)).toBe('one hundred one');
      expect(numberToWords(105)).toBe('one hundred five');
      expect(numberToWords(909)).toBe('nine hundred nine');
    });
  });

  describe('thousands', () => {
    it('should convert exact thousands', () => {
      expect(numberToWords(1000)).toBe('one thousand');
      expect(numberToWords(5000)).toBe('five thousand');
      expect(numberToWords(10000)).toBe('ten thousand');
      expect(numberToWords(99000)).toBe('ninety nine thousand');
    });

    it('should convert thousands with smaller units', () => {
      expect(numberToWords(1001)).toBe('one thousand one');
      expect(numberToWords(1234)).toBe('one thousand two hundred thirty four');
      expect(numberToWords(12345)).toBe('twelve thousand three hundred forty five');
    });
  });

  describe('millions', () => {
    it('should convert exact millions', () => {
      expect(numberToWords(1000000)).toBe('one million');
      expect(numberToWords(5000000)).toBe('five million');
    });

    it('should convert millions with smaller units', () => {
      expect(numberToWords(1000001)).toBe('one million one');
      expect(numberToWords(1234567)).toBe(
        'one million two hundred thirty four thousand five hundred sixty seven'
      );
    });
  });

  describe('billions', () => {
    it('should convert billions', () => {
      expect(numberToWords(1000000000)).toBe('one billion');
      expect(numberToWords(1234567890)).toBe(
        'one billion two hundred thirty four million five hundred sixty seven thousand eight hundred ninety'
      );
    });
  });

  describe('negative numbers', () => {
    it('should convert negative numbers', () => {
      expect(numberToWords(-1)).toBe('negative one');
      expect(numberToWords(-42)).toBe('negative forty two');
      expect(numberToWords(-123)).toBe('negative one hundred twenty three');
    });
  });

  describe('decimal numbers', () => {
    it('should convert simple decimals', () => {
      expect(numberToWords(3.14)).toBe('three point one four');
    });

    it('should convert decimals with zeros', () => {
      expect(numberToWords(1.01)).toBe('one point zero one');
      expect(numberToWords(10.203)).toBe('ten point two zero three');
    });

    it('should handle negative decimals', () => {
      expect(numberToWords(-2.5)).toBe('negative two point five');
    });
  });
});

describe('replaceNumbersWithWords', () => {
  it('should replace single numbers', () => {
    expect(replaceNumbersWithWords('I have 5 apples')).toBe('I have five apples');
  });

  it('should replace multiple numbers', () => {
    expect(replaceNumbersWithWords('I have 3 apples and 7 oranges')).toBe(
      'I have three apples and seven oranges'
    );
  });

  it('should handle numbers with commas', () => {
    expect(replaceNumbersWithWords('The price is 1,234 dollars')).toBe(
      'The price is one thousand two hundred thirty four dollars'
    );
  });

  it('should handle decimal numbers', () => {
    expect(replaceNumbersWithWords('Pi is approximately 3.14159')).toBe(
      'Pi is approximately three point one four one five nine'
    );
  });

  it('should handle numbers with commas and decimals', () => {
    expect(replaceNumbersWithWords('The value is 1,234.56')).toBe(
      'The value is one thousand two hundred thirty four point five six'
    );
  });

  it('should preserve text without numbers', () => {
    expect(replaceNumbersWithWords('Hello world')).toBe('Hello world');
  });

  it('should handle zero', () => {
    expect(replaceNumbersWithWords('The value is 0')).toBe('The value is zero');
  });
});

describe('replaceCurrencySymbols', () => {
  describe('dollar sign', () => {
    it('should replace dollar symbol with amount', () => {
      expect(replaceCurrencySymbols('The price is $100')).toBe('The price is 100 dollars');
    });

    it('should handle amounts with commas', () => {
      expect(replaceCurrencySymbols('Cost: $1,234')).toBe('Cost: 1234 dollars');
    });

    it('should handle amounts with decimals', () => {
      expect(replaceCurrencySymbols('Price: $99.99')).toBe('Price: 99.99 dollars');
    });

    it('should replace standalone dollar symbol', () => {
      expect(replaceCurrencySymbols('The currency is $ symbol')).toBe(
        'The currency is dollars symbol'
      );
    });
  });

  describe('euro sign', () => {
    it('should replace euro symbol with amount', () => {
      expect(replaceCurrencySymbols('The price is \u20AC50')).toBe('The price is 50 euros');
    });

    it('should replace standalone euro symbol', () => {
      expect(replaceCurrencySymbols('Price in \u20AC')).toBe('Price in euros');
    });
  });

  describe('pound sign', () => {
    it('should replace pound symbol with amount', () => {
      expect(replaceCurrencySymbols('The price is \u00A375')).toBe('The price is 75 pounds');
    });
  });

  describe('yen sign', () => {
    it('should replace yen symbol with amount', () => {
      expect(replaceCurrencySymbols('The price is \u00A51,000')).toBe('The price is 1000 yen');
    });
  });

  describe('rupee sign', () => {
    it('should replace rupee symbol with amount', () => {
      expect(replaceCurrencySymbols('The price is \u20B9500')).toBe('The price is 500 rupees');
    });
  });

  describe('multiple currencies', () => {
    it('should handle multiple currency symbols', () => {
      expect(replaceCurrencySymbols('$100 or \u20AC80')).toBe('100 dollars or 80 euros');
    });

    it('should preserve text without currency symbols', () => {
      expect(replaceCurrencySymbols('Hello world')).toBe('Hello world');
    });
  });
});

describe('preprocessText', () => {
  describe('basic functionality', () => {
    it('should trim text', () => {
      expect(preprocessText('  Hello world  ')).toBe('Hello world');
    });

    it('should normalize whitespace by default', () => {
      expect(preprocessText('Hello    world\n\nHow are you?')).toBe('Hello world How are you?');
    });

    it('should preserve whitespace when option is false', () => {
      const result = preprocessText('Hello  world', { normalizeWhitespace: false });
      expect(result).toBe('Hello  world');
    });
  });

  describe('currency conversion', () => {
    it('should not convert currency by default', () => {
      expect(preprocessText('The price is $100')).toBe('The price is $100');
    });

    it('should convert currency when option is true', () => {
      expect(preprocessText('The price is $100', { convertCurrency: true })).toBe(
        'The price is 100 dollars'
      );
    });
  });

  describe('number conversion', () => {
    it('should not convert numbers by default', () => {
      expect(preprocessText('I have 5 apples')).toBe('I have 5 apples');
    });

    it('should convert numbers when option is true', () => {
      expect(preprocessText('I have 5 apples', { convertNumbers: true })).toBe(
        'I have five apples'
      );
    });
  });

  describe('combined options', () => {
    it('should apply currency then number conversion', () => {
      const result = preprocessText('The price is $100', {
        convertCurrency: true,
        convertNumbers: true,
      });
      expect(result).toBe('The price is one hundred dollars');
    });

    it('should apply all transformations', () => {
      const result = preprocessText('  The   price is $50  ', {
        convertCurrency: true,
        convertNumbers: true,
        normalizeWhitespace: true,
      });
      expect(result).toBe('The price is fifty dollars');
    });

    it('should handle complex text', () => {
      const result = preprocessText('I have $25 and \u20AC30 to spend on 3 items.', {
        convertCurrency: true,
        convertNumbers: true,
      });
      expect(result).toBe('I have twenty five dollars and thirty euros to spend on three items.');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(preprocessText('')).toBe('');
    });

    it('should handle whitespace-only string', () => {
      expect(preprocessText('   ')).toBe('');
    });

    it('should handle text with no transformations needed', () => {
      expect(preprocessText('Hello world')).toBe('Hello world');
    });
  });
});
