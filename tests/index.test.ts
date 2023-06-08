import { hello } from "..";

describe('testing index file', () => {
    test('empty string should result in zero', () => {
      expect(hello("Test")).toBe("Hello Test! ");
    });
});