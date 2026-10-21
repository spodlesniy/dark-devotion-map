import { describe, expect, it } from 'vitest';

import { wrapUnknownToError } from 'src/helpers/wrapUnknownToError';

describe('wrapUnknownToError function tests', () => {
  it('Unknown error is instance of Error', () => {
    const unknownError = new Error('Error!');

    const target = wrapUnknownToError(unknownError);

    expect(target).toBeInstanceOf(Error);
    expect(target.name).toBe('Error');
    expect(target.message).toBe('Error!');
  });

  it('Unknown error is instance of descendant of Error', () => {
    class CustomError extends Error {
      public constructor(message?: string) {
        super(message);

        this.name = this.constructor.name;
      }
    }

    const unknownError = new CustomError('Error!');

    const target = wrapUnknownToError(unknownError);

    expect(target).toBeInstanceOf(Error);
    expect(target.name).toBe('CustomError');
    expect(target.message).toBe('Error!');
  });

  it('Unknown error is object with message property v1', () => {
    const unknownError = {
      message: 'Error!',
    };

    const target = wrapUnknownToError(unknownError);

    expect(target).toBeInstanceOf(Error);
    expect(target.name).toBe('Error');
    expect(target.message).toBe('Error!');
  });

  it('Unknown error is object with message property v2', () => {
    class CustomError {
      message: string | undefined;

      constructor(message?: string) {
        this.message = message;
      }
    }

    const unknownError = new CustomError('Error!');

    const target = wrapUnknownToError(unknownError);

    expect(target).toBeInstanceOf(Error);
    expect(target.name).toBe('Error');
    expect(target.message).toBe('Error!');
  });

  it('Unknown error is number', () => {
    const unknownError = 5;

    const target = wrapUnknownToError(unknownError);

    expect(target).toBeInstanceOf(Error);
    expect(target.name).toBe('Error');
    expect(target.message).toBe('5');
  });

  it('Unknown error is string', () => {
    const unknownError = 'Test!';

    const target = wrapUnknownToError(unknownError);

    expect(target).toBeInstanceOf(Error);
    expect(target.name).toBe('Error');
    expect(target.message).toBe('Test!');
  });

  it('Unknown error is boolean', () => {
    const unknownError = true;

    const target = wrapUnknownToError(unknownError);

    expect(target).toBeInstanceOf(Error);
    expect(target.name).toBe('Error');
    expect(target.message).toBe('true');
  });

  it('Unknown error is array', () => {
    const unknownError = ['1', '2'];

    const target = wrapUnknownToError(unknownError);

    expect(target).toBeInstanceOf(Error);
    expect(target.name).toBe('Error');
    expect(target.message).toBe('1,2');
  });

  it('Unknown error is any object', () => {
    const unknownError = {
      testProperty: 'Test!',
    };

    const target = wrapUnknownToError(unknownError);

    expect(target).toBeInstanceOf(Error);
    expect(target.name).toBe('Error');
    expect(target.message).toBe('[object Object]');
  });
});
