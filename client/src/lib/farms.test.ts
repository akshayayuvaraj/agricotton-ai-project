import { describe, expect, it } from "vitest";
import { parseFarmList } from "./farms";

describe("parseFarmList", () => {
  it("reads the actual farms API response object", () => {
    expect(
      parseFarmList({
        farms: [{ id: "farm-123", name: "Valley Farm" }],
      }),
    ).toEqual([{ id: "farm-123", name: "Valley Farm" }]);
  });

  it("supports array responses and MongoDB _id response records", () => {
    expect(
      parseFarmList([{ _id: "mongo-farm-id", name: "Cotton Farm" }]),
    ).toEqual([
      { _id: "mongo-farm-id", name: "Cotton Farm", id: "mongo-farm-id" },
    ]);
  });

  it("supports a data array and rejects unknown response shapes", () => {
    expect(
      parseFarmList({ data: [{ id: "farm-2", name: "Second Farm" }] }),
    ).toHaveLength(1);
    expect(() => parseFarmList({ result: [] })).toThrow(/unsupported response/);
  });
});
