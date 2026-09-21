import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility", () => {
  it("joins simple class names", () => {
    expect(cn("btn", "btn-primary")).toBe("btn btn-primary");
  });

  it("handles conditional classes and falsy values", () => {
    expect(cn("base", true && "is-active", false && "is-hidden", null, undefined, "")).toBe(
      "base is-active"
    );
  });

  it("resolves Tailwind class collisions via tailwind-merge", () => {
    // p-2 should override p-4
    expect(cn("p-4", "p-2")).toBe("p-2");
    // text-slate-900 should override text-slate-100
    expect(cn("text-slate-100", "text-slate-900")).toBe("text-slate-900");
  });

  it("supports array and nested arguments", () => {
    expect(cn(["font-inter", ["text-xs", false && "uppercase"]])).toBe("font-inter text-xs");
  });
});
