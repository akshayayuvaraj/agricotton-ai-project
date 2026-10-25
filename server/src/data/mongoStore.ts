import mongoose from "mongoose";
import type { Activity, Farm, FertilizerPlan, Field, FieldZone, SoilSample, User } from "../types/index.js";

type StoredRecord = {
  id: string;
  userId?: string;
  email?: string;
  [key: string]: unknown;
};

const collections = {
  users: "users",
  farms: "farms",
  fields: "fields",
  zones: "fieldzones",
  soilSamples: "soilsamples",
  fertilizerPlans: "fertilizerplans",
  activities: "activities",
} as const;

export type DomainCollection = keyof typeof collections;

export const mongoIsReady = () =>
  mongoose.connection.readyState === 1 && Boolean(mongoose.connection.db);

const collection = (name: DomainCollection) => {
  if (!mongoIsReady()) {
    throw new Error("MongoDB is not connected.");
  }
  return mongoose.connection.db!.collection<StoredRecord>(collections[name]);
};

export const ensureDomainIndexes = async () => {
  if (!mongoIsReady()) return;
  await Promise.all([
    collection("users").createIndex({ id: 1 }, { unique: true }),
    ...(
      ["farms", "fields", "zones", "soilSamples", "fertilizerPlans", "activities"] as DomainCollection[]
    ).map((name) => collection(name).createIndex({ id: 1 }, { unique: true })),
  ]);
};

const withoutMongoId = <T>(record: StoredRecord): T => {
  const { _id: _mongoId, ...value } = record;
  return value as T;
};

export const readDomainRecords = async <T>(name: DomainCollection) => {
  const rows = await collection(name).find({}).toArray();
  return rows
    .filter((row) => {
      if (typeof row.id !== "string" || !row.id.trim()) return false;
      if (name !== "users") return true;
      return ["email", "name", "passwordHash"].every(
        (field) => typeof row[field] === "string" && Boolean(row[field]?.trim()),
      );
    })
    .map((row) => withoutMongoId<T>(row));
};

const replaceRecords = <T>(target: T[], records: T[]) => {
  target.splice(0, target.length, ...records);
};

export const saveDomainRecord = async <T extends { id: string }>(
  name: DomainCollection,
  record: T,
) => {
  await collection(name).replaceOne(
    { id: record.id },
    record as StoredRecord,
    { upsert: true },
  );
};

export const insertDomainRecords = async <T extends { id: string }>(
  name: DomainCollection,
  records: T[],
) => {
  if (records.length === 0) return;
  await collection(name).insertMany(records as StoredRecord[], { ordered: true });
};

export const removeDomainRecord = async (
  name: DomainCollection,
  id: string,
) => {
  await collection(name).deleteOne({ id });
};

export const hydrateDomainStore = async (store: {
  users: User[];
  farms: Farm[];
  fields: Field[];
  zones: FieldZone[];
  soilSamples: SoilSample[];
  fertilizerPlans: FertilizerPlan[];
  activities: Activity[];
}) => {
  if (!mongoIsReady()) return;
  const [
    users,
    farms,
    fields,
    zones,
    soilSamples,
    fertilizerPlans,
    activities,
  ] = await Promise.all([
    readDomainRecords<User>("users"),
    readDomainRecords<Farm>("farms"),
    readDomainRecords<Field>("fields"),
    readDomainRecords<FieldZone>("zones"),
    readDomainRecords<SoilSample>("soilSamples"),
    readDomainRecords<FertilizerPlan>("fertilizerPlans"),
    readDomainRecords<Activity>("activities"),
  ]);
  replaceRecords(store.users, users);
  replaceRecords(store.farms, farms);
  replaceRecords(store.fields, fields);
  replaceRecords(store.zones, zones);
  replaceRecords(store.soilSamples, soilSamples);
  replaceRecords(store.fertilizerPlans, fertilizerPlans);
  replaceRecords(store.activities, activities);
};

export const persistDemoDomainData = async (store: {
  users: User[];
  farms: Farm[];
  fields: Field[];
  zones: FieldZone[];
  soilSamples: SoilSample[];
  fertilizerPlans: FertilizerPlan[];
  activities: Activity[];
}) => {
  if (!mongoIsReady()) return;
  await Promise.all([
    ...store.users.map((record) => saveDomainRecord("users", record)),
    ...store.farms.map((record) => saveDomainRecord("farms", record)),
    ...store.fields.map((record) => saveDomainRecord("fields", record)),
    ...store.zones.map((record) => saveDomainRecord("zones", record)),
    ...store.soilSamples.map((record) => saveDomainRecord("soilSamples", record)),
    ...store.fertilizerPlans.map((record) => saveDomainRecord("fertilizerPlans", record)),
    ...store.activities.map((record) => saveDomainRecord("activities", record)),
  ]);
};
