import { validateNewPassword, validateUserName, MIN_PASSWORD_LENGTH } from "@/lib/account";

describe("validateUserName", () => {
  it("accepte un prénom valide", () => {
    expect(validateUserName("  Alex  ")).toEqual({ value: "Alex" });
  });

  it("refuse vide ou trop long", () => {
    expect(validateUserName("")).toHaveProperty("error");
    expect(validateUserName("   ")).toHaveProperty("error");
    expect(validateUserName("a".repeat(101))).toHaveProperty("error");
  });

  it("refuse non-string", () => {
    expect(validateUserName(null)).toHaveProperty("error");
  });
});

describe("validateNewPassword", () => {
  it("accepte un mot de passe assez long", () => {
    const value = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(validateNewPassword(value)).toEqual({ value });
  });

  it("refuse trop court ou trop long", () => {
    expect(validateNewPassword("short")).toHaveProperty("error");
    expect(validateNewPassword("a".repeat(129))).toHaveProperty("error");
  });
});
