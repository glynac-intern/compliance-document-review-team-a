import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePassword,
  PASSWORD_MIN_LENGTH,
} from "@/lib/validation";

describe("validation module", () => {
  describe("validatePassword", () => {
    it("accepts valid passwords meeting all criteria", () => {
      expect(validatePassword("validPass1")).toBeNull();
      expect(validatePassword("superSecret999!")).toBeNull();
    });

    it("rejects passwords shorter than PASSWORD_MIN_LENGTH (8 chars)", () => {
      expect(validatePassword("ab1")).toBe(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
      );
      expect(validatePassword("")).toBe(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
      );
    });

    it("rejects passwords without any letter", () => {
      expect(validatePassword("1234567890")).toBe("Password must contain at least one letter.");
    });

    it("rejects passwords without any digit", () => {
      expect(validatePassword("validlettersonly")).toBe("Password must contain at least one digit.");
    });
  });

  describe("validateEmail", () => {
    it("accepts well-formed email addresses", () => {
      expect(validateEmail("advisor@verity.com")).toBeNull();
      expect(validateEmail("first.last+tag@sub.domain.co")).toBeNull();
    });

    it("rejects emails missing @ or domain", () => {
      expect(validateEmail("invalidemail")).toBe("Please enter a valid email address.");
      expect(validateEmail("user@")).toBe("Please enter a valid email address.");
      expect(validateEmail("user@nodot")).toBe("Please enter a valid email address.");
    });

    it("rejects emails with spaces or empty strings", () => {
      expect(validateEmail("user name@domain.com")).toBe("Please enter a valid email address.");
      expect(validateEmail("")).toBe("Please enter a valid email address.");
    });
  });
});
