// Example unit test
describe('Example Test Suite', () => {
  test('should pass this example test', () => {
    expect(2 + 2).toBe(4);
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve('Hello World');
    expect(result).toBe('Hello World');
  });
});
