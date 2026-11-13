import { afterEach, describe, expect, it, vi } from "vitest";

// Keep transport tests independent from network and browser globals.
const transport = vi.hoisted(() => ({ send: vi.fn(), create: vi.fn() }));
vi.mock("ky", () => ({
  default: {
    create: (options: unknown) => {
      transport.create(options);
      return transport.send;
    },
  },
  isHTTPError: () => false,
  isTimeoutError: () => false,
}));
vi.mock("./timing", () => ({
  clickToSendMs: () => 0,
  computeTiming: () => ({}),
  recordTiming: () => {},
}));
import { api } from "./http";

afterEach(() => {
  transport.send.mockReset();
  vi.unstubAllGlobals();
});
describe("cookie API transport", () => {
  it("includes browser credentials without bearer headers", async () => {
    vi.stubGlobal("window", { event: undefined });
    transport.send.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    // Evaluate the client inside the test so its ky.create call is observed here.
    vi.resetModules();
    const { api: fresh } = await import("./http");
    expect(await fresh.get("games")).toEqual({ ok: true });
    expect(transport.create).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: "include", retry: 0 }),
    );
    expect(transport.send.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
  it("rejects absolute paths before transport", async () => {
    await expect(api.get("https://foreign.example")).rejects.toThrow("API paths must be relative");
    expect(transport.send).not.toHaveBeenCalled();
  });
});
