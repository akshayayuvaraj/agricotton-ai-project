import type { Farm } from "../types";

const farmId = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = record.id ?? record._id;
  return typeof id === "string" && id.length > 0 ? id : null;
};

export const parseFarmList = (responseData: unknown): Farm[] => {
  let records: unknown;
  if (Array.isArray(responseData)) {
    records = responseData;
  } else if (responseData && typeof responseData === "object") {
    const response = responseData as Record<string, unknown>;
    if (Array.isArray(response.farms)) records = response.farms;
    else if (Array.isArray(response.data)) records = response.data;
  }

  if (!Array.isArray(records)) {
    throw new Error(
      "The farms API returned an unsupported response. Retry or contact support.",
    );
  }

  return records.map((record, index) => {
    if (!record || typeof record !== "object") {
      throw new Error(
        `The farms API returned an invalid farm at position ${index + 1}.`,
      );
    }

    const farm = record as Record<string, unknown>;
    const id = farmId(farm);
    if (!id || typeof farm.name !== "string" || !farm.name.trim()) {
      throw new Error(
        `The farms API returned a farm without a valid ID or name at position ${index + 1}.`,
      );
    }

    return { ...farm, id, name: farm.name } as Farm;
  });
};
