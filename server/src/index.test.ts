import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./index.js";
import { registerDemoData } from "./data/store.js";
import { cottonIssues } from "./data/cottonIssues.js";
import { seedCottonIssues } from "./data/seedCottonIssues.js";

const validBoundary = {
  type: "Polygon",
  coordinates: [
    [
      [78.124, 11.123],
      [78.127, 11.123],
      [78.127, 11.126],
      [78.124, 11.126],
      [78.124, 11.123],
    ],
  ],
};

const validZonePolygon = {
  type: "Polygon",
  coordinates: [
    [
      [78.124, 11.123],
      [78.1255, 11.123],
      [78.1255, 11.126],
      [78.124, 11.126],
      [78.124, 11.123],
    ],
  ],
};

let userSequence = 0;

const createFarmOwner = async () => {
  userSequence += 1;
  const agent = request.agent(app);
  const email = `field-test-${userSequence}@example.com`;
  const register = await agent.post("/api/auth/register").send({
    name: "Field Test Farmer",
    email,
    password: "securepass123",
  });
  expect(register.status).toBe(201);

  const farmResponse = await agent.post("/api/farms").send({
    name: "Test Farm",
    state: "Tamil Nadu",
    district: "Coimbatore",
    locality: "Test village",
  });
  expect(farmResponse.status).toBe(201);
  const listResponse = await agent.get("/api/farms");
  expect(listResponse.status).toBe(200);
  expect(listResponse.body.farms).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: farmResponse.body.farm.id,
        name: "Test Farm",
      }),
    ]),
  );
  return { agent, farmId: farmResponse.body.farm.id };
};

const createOwnedField = async (
  agent: ReturnType<typeof request.agent>,
  farmId: string,
) => {
  const response = await agent.post("/api/fields").send({
    farmId,
    name: "Cotton test field",
    cropName: "Cotton",
    season: "Kharif",
    sowingDate: "2026-06-14",
    boundary: validBoundary,
  });
  expect(response.status).toBe(201);
  return response.body.field.id as string;
};

beforeAll(async () => {
  await registerDemoData();
  await seedCottonIssues();
});

describe("field creation validation and ownership", () => {
  it("creates a field with the frontend field payload and server-calculated area", async () => {
    const { agent, farmId } = await createFarmOwner();
    const response = await agent.post("/api/fields").send({
      farmId,
      name: "Cotton test field",
      cropName: "Cotton",
      season: "Kharif",
      sowingDate: "2026-06-14",
      boundary: validBoundary,
    });

    expect(response.status).toBe(201);
    expect(response.body.field).toMatchObject({
      farmId,
      name: "Cotton test field",
      cropName: "Cotton",
      season: "Kharif",
      sowingDate: "2026-06-14",
    });
    expect(response.body.field.areaHectares).toBeGreaterThan(0);
  });

  it("reports missing required field properties", async () => {
    const { agent } = await createFarmOwner();
    const response = await agent.post("/api/fields").send({});
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("farmId is required.");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "name",
          message: "name is required.",
        }),
        expect.objectContaining({
          field: "boundary",
          message: "boundary is required.",
        }),
      ]),
    );
  });

  it("rejects malformed farm IDs and valid IDs not owned by the user", async () => {
    const firstOwner = await createFarmOwner();
    const malformed = await firstOwner.agent.post("/api/fields").send({
      farmId: "not-an-id",
      name: "Field",
      cropName: "Cotton",
      season: "Kharif",
      boundary: validBoundary,
    });
    expect(malformed.status).toBe(400);

    const otherOwner = await createFarmOwner();
    const notOwned = await otherOwner.agent.post("/api/fields").send({
      farmId: firstOwner.farmId,
      name: "Field",
      cropName: "Cotton",
      season: "Kharif",
      boundary: validBoundary,
    });
    expect(notOwned.status).toBe(404);
    expect(notOwned.body.message).toContain("authenticated user");
  });

  it("rejects invalid self-intersecting GeoJSON", async () => {
    const { agent, farmId } = await createFarmOwner();
    const response = await agent.post("/api/fields").send({
      farmId,
      name: "Invalid field",
      cropName: "Cotton",
      season: "Kharif",
      boundary: {
        type: "Polygon",
        coordinates: [
          [
            [78.124, 11.123],
            [78.127, 11.126],
            [78.127, 11.123],
            [78.124, 11.126],
            [78.124, 11.123],
          ],
        ],
      },
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Polygon geometry is invalid or self-intersecting.",
    );
  });

  it("requires authentication", async () => {
    const response = await request(app).post("/api/fields").send({});
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required.");
  });
});

describe("soil sample creation validation and ownership", () => {
  it("creates a sample with optional zone and leaves omitted measurements missing", async () => {
    const { agent, farmId } = await createFarmOwner();
    const fieldId = await createOwnedField(agent, farmId);
    const zoneResponse = await agent.post("/api/zones").send({
      fieldId,
      name: "West zone",
      polygon: validZonePolygon,
    });
    expect(zoneResponse.status).toBe(201);

    const response = await agent.post("/api/soil").send({
      fieldId,
      zoneId: zoneResponse.body.zone.id,
      samplingDate: "2026-06-18",
      ph: 6.8,
      organicCarbon: 0.74,
    });

    expect(response.status).toBe(201);
    expect(response.body.soilSample).toMatchObject({
      fieldId,
      zoneId: zoneResponse.body.zone.id,
      samplingDate: "2026-06-18",
      ph: 6.8,
      organicCarbon: 0.74,
    });
    expect(response.body.soilSample).not.toHaveProperty("nitrogen");
    expect(response.body.soilSample).not.toHaveProperty("phosphorus");
    expect(response.body.soilSample).not.toHaveProperty("potassium");
  });

  it("rejects missing required properties and malformed field IDs", async () => {
    const { agent } = await createFarmOwner();
    const missing = await agent.post("/api/soil").send({});
    expect(missing.status).toBe(400);
    expect(missing.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "fieldId" }),
        expect.objectContaining({ field: "samplingDate" }),
      ]),
    );

    const invalidId = await agent
      .post("/api/soil")
      .send({ fieldId: "wrong-id", samplingDate: "2026-06-18" });
    expect(invalidId.status).toBe(400);
    expect(invalidId.body.message).toBe("Must be a valid record ID.");
  });

  it("rejects soil samples for a field owned by a different user", async () => {
    const owner = await createFarmOwner();
    const fieldId = await createOwnedField(owner.agent, owner.farmId);
    const other = await createFarmOwner();
    const response = await other.agent
      .post("/api/soil")
      .send({ fieldId, samplingDate: "2026-06-18", nitrogen: 145 });
    expect(response.status).toBe(404);
    expect(response.body.message).toContain("authenticated user");
  });

  it("requires authentication", async () => {
    const response = await request(app)
      .post("/api/soil")
      .send({ fieldId: "x", samplingDate: "2026-06-18" });
    expect(response.status).toBe(401);
  });
});

describe("field zones", () => {
  it("validates and saves a complete grid partition atomically", async () => {
    const { agent, farmId } = await createFarmOwner();
    const fieldId = await createOwnedField(agent, farmId);
    const response = await agent.post("/api/zones/batch").send({
      fieldId,
      zones: [
        {
          name: "Grid zone 1",
          color: "#4AA85A",
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [78.124, 11.123],
                [78.1255, 11.123],
                [78.1255, 11.126],
                [78.124, 11.126],
                [78.124, 11.123],
              ],
            ],
          },
        },
        {
          name: "Grid zone 2",
          color: "#D97706",
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [78.1255, 11.123],
                [78.127, 11.123],
                [78.127, 11.126],
                [78.1255, 11.126],
                [78.1255, 11.123],
              ],
            ],
          },
        },
      ],
    });
    expect(response.status).toBe(201);
    expect(response.body.zones).toHaveLength(2);
    expect(response.body.zones[0].id).not.toBe(response.body.zones[1].id);
    expect(
      response.body.zones.reduce(
        (area: number, zone: { areaHectares: number }) =>
          area + zone.areaHectares,
        0,
      ),
    ).toBeGreaterThan(0);
  });

  it("rejects incomplete generated coverage without saving any zone", async () => {
    const { agent, farmId } = await createFarmOwner();
    const fieldId = await createOwnedField(agent, farmId);
    const response = await agent.post("/api/zones/batch").send({
      fieldId,
      zones: [
        {
          name: "Only half",
          color: "#4AA85A",
          polygon: validZonePolygon,
        },
        {
          name: "Other half",
          color: "#D97706",
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [78.1265, 11.123],
                [78.127, 11.123],
                [78.127, 11.126],
                [78.1265, 11.126],
                [78.1265, 11.123],
              ],
            ],
          },
        },
      ],
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("coverage");
    expect((await agent.get("/api/zones")).body.zones).toHaveLength(0);
  });

  it("requires authentication for batch saves", async () => {
    const response = await request(app).post("/api/zones/batch").send({});
    expect(response.status).toBe(401);
  });

  it("saves valid contained zones and rejects overlaps", async () => {
    const { agent, farmId } = await createFarmOwner();
    const fieldId = await createOwnedField(agent, farmId);
    const firstZone = await agent.post("/api/zones").send({
      fieldId,
      name: "West zone",
      polygon: validZonePolygon,
    });
    expect(firstZone.status).toBe(201);

    const overlapping = await agent.post("/api/zones").send({
      fieldId,
      name: "Overlapping zone",
      polygon: {
        type: "Polygon",
        coordinates: [
          [
            [78.125, 11.123],
            [78.127, 11.123],
            [78.127, 11.126],
            [78.125, 11.126],
            [78.125, 11.123],
          ],
        ],
      },
    });
    expect(overlapping.status).toBe(400);
    expect(overlapping.body.message).toBe(
      "Zone overlaps an existing zone in this field.",
    );
  });

  it("rejects zones outside the field boundary", async () => {
    const { agent, farmId } = await createFarmOwner();
    const fieldId = await createOwnedField(agent, farmId);
    const response = await agent.post("/api/zones").send({
      fieldId,
      name: "Outside zone",
      polygon: {
        type: "Polygon",
        coordinates: [
          [
            [78.13, 11.13],
            [78.131, 11.13],
            [78.131, 11.131],
            [78.13, 11.131],
            [78.13, 11.13],
          ],
        ],
      },
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Zone boundary must be entirely inside the selected field.",
    );
  });
});

it("returns health status", async () => {
  const response = await request(app).get("/api/health");
  expect(response.status).toBe(200);
  expect(response.body.status).toBe("ok");
});

it("returns 401 before login and authenticates using the HttpOnly cookie after registration", async () => {
  const anonymous = await request(app).get("/api/auth/me");
  expect(anonymous.status).toBe(401);

  const agent = request.agent(app);
  userSequence += 1;
  await agent
    .post("/api/auth/register")
    .send({
      name: "Cookie Test Farmer",
      email: `cookie-test-${userSequence}@example.com`,
      password: "securepass123",
    })
    .expect(201);
  const authenticated = await agent.get("/api/auth/me");
  expect(authenticated.status).toBe(200);
  expect(authenticated.body.user.email).toContain("cookie-test-");
});

describe("cotton issue library", () => {
  it("seeds idempotently and returns the full catalog beyond the first three records", async () => {
    await seedCottonIssues();
    await seedCottonIssues();

    const response = await request(app).get("/api/cotton-issues");
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(32);
    expect(response.body.issues).toHaveLength(32);
    expect(
      new Set(response.body.issues.map((issue: { id: string }) => issue.id)).size,
    ).toBe(32);
    expect(response.body.issues.map((issue: { id: string }) => issue.id)).toContain(
      "stem-weevil",
    );
    expect(response.body.counts).toEqual({
      all: 32,
      disease: 15,
      pest: 16,
      crop_disorder: 1,
    });
    expect(response.body.issues).toHaveLength(cottonIssues.length);
  });

  it("combines category, severity and scientific-name search while retaining global counts", async () => {
    const response = await request(app).get(
      "/api/cotton-issues?category=pest&severity=unverified&search=Helicoverpa",
    );

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.issues[0]).toMatchObject({
      id: "american-bollworm",
      scientificName: "Helicoverpa armigera",
      category: "pest",
    });
    expect(response.body.counts.all).toBe(32);
  });

  it("returns the exact set for each category filter", async () => {
    const expectedCounts = {
      disease: 15,
      pest: 16,
      crop_disorder: 1,
    };

    for (const [category, expectedTotal] of Object.entries(expectedCounts)) {
      const response = await request(app)
        .get("/api/cotton-issues")
        .query({ category });
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(expectedTotal);
      expect(
        response.body.issues.every(
          (issue: { category: string }) => issue.category === category,
        ),
      ).toBe(true);
    }
  });

  it("searches symptoms and returns a complete detail record by unique ID", async () => {
    const search = await request(app).get(
      "/api/cotton-issues?search=rosetted%20flowers",
    );
    expect(search.status).toBe(200);
    expect(search.body.issues.map((issue: { id: string }) => issue.id)).toContain(
      "pink-bollworm",
    );

    const details = await request(app).get(
      "/api/cotton-issues/leaf-reddening",
    );
    expect(details.status).toBe(200);
    expect(details.body.issue).toMatchObject({
      id: "leaf-reddening",
      category: "crop_disorder",
    });
    expect(details.body.issue).toHaveProperty("severity.explanation");
    expect(details.body.issue.referenceSources.length).toBeGreaterThan(0);
  });

  it("rejects inconsistent category filters and reports missing records", async () => {
    const invalid = await request(app).get(
      "/api/cotton-issues?category=disorder",
    );
    expect(invalid.status).toBe(400);

    const missing = await request(app).get("/api/cotton-issues/not-a-record");
    expect(missing.status).toBe(404);
  });
});

describe("field sowing calendar persistence", () => {
  it("saves, reloads, and updates a calendar for the selected field", async () => {
    const { agent, farmId } = await createFarmOwner();
    const fieldId = await createOwnedField(agent, farmId);
    const sowingDate = "2024-02-29";
    const plan = {
      fieldId,
      sowingDate,
      tasks: [
        {
          id: "sowing",
          title: "Sowing",
          stage: "Sowing",
          description: "Record sowing.",
          dasStart: 0,
          dasEnd: 0,
          startDate: sowingDate,
          endDate: sowingDate,
          completed: false,
        },
        {
          id: "seedling-check",
          title: "Seedling check",
          stage: "Establishment",
          description: "Inspect crop emergence.",
          dasStart: 5,
          dasEnd: 10,
          startDate: "2024-03-05",
          endDate: "2024-03-10",
          completed: false,
        },
      ],
    };

    const saved = await agent.put("/api/calendars").send(plan);
    expect(saved.status).toBe(200);
    const loaded = await agent.get("/api/calendars").query({ fieldId });
    expect(loaded.status).toBe(200);
    expect(loaded.body.plan.tasks).toHaveLength(2);
    expect(loaded.body.plan.tasks[1].startDate).toBe("2024-03-05");

    const updatedPlan = {
      ...plan,
      sowingDate: "2024-03-01",
      tasks: plan.tasks.map((task) => ({
        ...task,
        startDate: new Date(
          Date.parse(`${task.startDate}T00:00:00.000Z`) + 86_400_000,
        )
          .toISOString()
          .slice(0, 10),
        endDate: new Date(
          Date.parse(`${task.endDate}T00:00:00.000Z`) + 86_400_000,
        )
          .toISOString()
          .slice(0, 10),
      })),
    };
    const updated = await agent.put("/api/calendars").send(updatedPlan);
    expect(updated.status).toBe(200);
    expect(updated.body.plan.id).toBe(saved.body.plan.id);
    expect(updated.body.plan.sowingDate).toBe("2024-03-01");
  });

  it("rejects calendar task dates that do not match their sowing-date offsets", async () => {
    const { agent, farmId } = await createFarmOwner();
    const fieldId = await createOwnedField(agent, farmId);
    const response = await agent.put("/api/calendars").send({
      fieldId,
      sowingDate: "2025-06-01",
      tasks: [
        {
          id: "sowing",
          title: "Sowing",
          stage: "Sowing",
          description: "Record sowing.",
          dasStart: 0,
          dasEnd: 0,
          startDate: "2025-06-02",
          endDate: "2025-06-02",
          completed: false,
        },
      ],
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/DAS ranges/);
  });
});

describe("zone fertilizer quantities", () => {
  it("calculates nutrient quantities from the selected zone area", async () => {
    const { agent, farmId } = await createFarmOwner();
    const fieldId = await createOwnedField(agent, farmId);
    const zoneResponse = await agent.post("/api/zones").send({
      fieldId,
      name: "Test zone",
      polygon: validZonePolygon,
    });
    expect(zoneResponse.status).toBe(201);
    const zone = zoneResponse.body.zone;
    const response = await agent.post("/api/fertilizer").send({
      fieldId,
      zoneId: zone.id,
      planName: "Soil-test-based input",
      nitrogen: 10,
      phosphorus: 4,
      potassium: 6,
      applicationDate: "2026-07-10",
    });
    expect(response.status).toBe(201);
    expect(response.body.plan).toMatchObject({
      fieldId,
      zoneId: zone.id,
      nitrogen: Number((10 * zone.areaHectares).toFixed(3)),
      phosphorus: Number((4 * zone.areaHectares).toFixed(3)),
      potassium: Number((6 * zone.areaHectares).toFixed(3)),
    });
    expect(response.body.plan.notes).toContain("User-entered rates");
  });

  it("rejects a zone that does not belong to the selected field", async () => {
    const first = await createFarmOwner();
    const firstField = await createOwnedField(first.agent, first.farmId);
    const zoneResponse = await first.agent.post("/api/zones").send({
      fieldId: firstField,
      name: "First field zone",
      polygon: validZonePolygon,
    });
    expect(zoneResponse.status).toBe(201);

    const second = await createFarmOwner();
    const secondField = await createOwnedField(second.agent, second.farmId);
    const response = await second.agent.post("/api/fertilizer").send({
      fieldId: secondField,
      zoneId: zoneResponse.body.zone.id,
      planName: "Invalid cross-field plan",
      nitrogen: 1,
      phosphorus: 1,
      potassium: 1,
      applicationDate: "2026-07-10",
    });
    expect(response.status).toBe(404);
  });
});

describe("zone updates and health (regressions)", () => {
  it("rejects an update that moves a zone outside the field and leaves the zone unchanged", async () => {
    const { agent, farmId } = await createFarmOwner();
    const fieldId = await createOwnedField(agent, farmId);
    const created = await agent
      .post("/api/zones")
      .send({ fieldId, name: "West zone", polygon: validZonePolygon });
    expect(created.status).toBe(201);
    const zoneId = created.body.zone.id;

    const bad = await agent.patch(`/api/zones/${zoneId}`).send({
      polygon: {
        type: "Polygon",
        coordinates: [
          [
            [78.13, 11.13],
            [78.131, 11.13],
            [78.131, 11.131],
            [78.13, 11.131],
            [78.13, 11.13],
          ],
        ],
      },
    });
    expect(bad.status).toBe(400);

    const listed = (await agent.get("/api/zones")).body.zones.find(
      (zone: { id: string }) => zone.id === zoneId,
    );
    expect(listed.polygon).toEqual(created.body.zone.polygon);
    expect(listed.areaHectares).toBe(created.body.zone.areaHectares);
  });

  it("rejects an empty zone name on update and accepts a rename", async () => {
    const { agent, farmId } = await createFarmOwner();
    const fieldId = await createOwnedField(agent, farmId);
    const created = await agent
      .post("/api/zones")
      .send({ fieldId, name: "West zone", polygon: validZonePolygon });
    const zoneId = created.body.zone.id;
    expect((await agent.patch(`/api/zones/${zoneId}`).send({ name: "  " })).status).toBe(400);
    const renamed = await agent.patch(`/api/zones/${zoneId}`).send({ name: " East " });
    expect(renamed.status).toBe(200);
    expect(renamed.body.zone.name).toBe("East");
  });

  it("reports whether storage is durable", async () => {
    const response = await request(app).get("/api/health");
    expect(["mongodb", "memory"]).toContain(response.body.persistence);
  });
});
