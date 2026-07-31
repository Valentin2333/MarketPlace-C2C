import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { resetDatabase, registerTestUser, ensureTestCategory } from "./helpers.js";

describe("Listings", () => {
  let categoryId: number;

  beforeEach(async () => {
    await resetDatabase();
    categoryId = await ensureTestCategory();
  });

  it("creates a listing when authenticated", async () => {
    const user = await registerTestUser();

    const response = await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        title: "Old bicycle",
        description: "Barely used",
        price: 120,
        city: "Sofia",
        categoryId,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
  });

  it("rejects creating a listing without auth", async () => {
    const response = await request(app)
      .post("/listings")
      .send({
        title: "x",
        description: "x",
        price: 1,
        city: "Sofia",
        categoryId,
      });

    expect(response.status).toBe(401);
  });

  it("rejects invalid listing data", async () => {
    const user = await registerTestUser();

    const response = await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        title: "",
        description: "x",
        price: 1,
        city: "Sofia",
        categoryId,
      });

    expect(response.status).toBe(400);
  });

  it("shows a newly created listing in the public feed", async () => {
    const user = await registerTestUser();
    const created = await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        title: "Findable",
        description: "x",
        price: 10,
        city: "Sofia",
        categoryId,
      });

    const feed = await request(app).get("/listings");

    expect(feed.status).toBe(200);
    expect(
      feed.body.listings.some((l: { id: string }) => l.id === created.body.id),
    ).toBe(true);
  });

  it("returns numeric prices, not strings", async () => {
    const user = await registerTestUser();
    const created = await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        title: "Price check",
        description: "x",
        price: 1200,
        city: "Sofia",
        categoryId,
      });

    const detail = await request(app).get(`/listings/${created.body.id}`);
    expect(typeof detail.body.listing.price).toBe("number");
    expect(detail.body.listing.price).toBe(1200);
  });

  it("returns listing detail with category and seller info", async () => {
    const user = await registerTestUser({ name: "Seller Name" });
    const created = await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        title: "Detail test",
        description: "x",
        price: 10,
        city: "Sofia",
        categoryId,
      });

    const detail = await request(app).get(`/listings/${created.body.id}`);

    expect(detail.status).toBe(200);
    expect(detail.body.listing.seller.id).toBe(user.id);
    expect(detail.body.listing.category.name).toBe("Test Category");
  });

  it("404s for a listing that doesn't exist", async () => {
    const response = await request(app).get(
      "/listings/00000000-0000-0000-0000-000000000000",
    );
    expect(response.status).toBe(404);
  });

  it("lets the owner update their listing", async () => {
    const user = await registerTestUser();
    const created = await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        title: "Original",
        description: "x",
        price: 10,
        city: "Sofia",
        categoryId,
      });

    const update = await request(app)
      .put(`/listings/${created.body.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        title: "Updated",
        description: "x",
        price: 20,
        city: "Sofia",
        categoryId,
      });
    expect(update.status).toBe(204);

    const detail = await request(app).get(`/listings/${created.body.id}`);
    expect(detail.body.listing.title).toBe("Updated");
    expect(detail.body.listing.price).toBe(20);
  });

  it("blocks a non-owner from updating someone else's listing", async () => {
    const owner = await registerTestUser();
    const stranger = await registerTestUser();
    const created = await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        title: "Mine",
        description: "x",
        price: 10,
        city: "Sofia",
        categoryId,
      });

    const update = await request(app)
      .put(`/listings/${created.body.id}`)
      .set("Authorization", `Bearer ${stranger.accessToken}`)
      .send({
        title: "Hijacked",
        description: "x",
        price: 10,
        city: "Sofia",
        categoryId,
      });

    expect(update.status).toBe(403);
  });

  it("lets the owner delete their listing", async () => {
    const user = await registerTestUser();
    const created = await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        title: "Delete me",
        description: "x",
        price: 10,
        city: "Sofia",
        categoryId,
      });

    const del = await request(app)
      .delete(`/listings/${created.body.id}`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(del.status).toBe(204);

    const detail = await request(app).get(`/listings/${created.body.id}`);
    expect(detail.status).toBe(404);
  });

  it("blocks a non-owner from deleting someone else's listing", async () => {
    const owner = await registerTestUser();
    const stranger = await registerTestUser();
    const created = await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        title: "Mine",
        description: "x",
        price: 10,
        city: "Sofia",
        categoryId,
      });

    const del = await request(app)
      .delete(`/listings/${created.body.id}`)
      .set("Authorization", `Bearer ${stranger.accessToken}`);

    expect(del.status).toBe(403);
  });

  it("filters the feed by city", async () => {
    const user = await registerTestUser();
    await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        title: "Sofia item",
        description: "x",
        price: 10,
        city: "Sofia",
        categoryId,
      });
    await request(app)
      .post("/listings")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        title: "Plovdiv item",
        description: "x",
        price: 10,
        city: "Plovdiv",
        categoryId,
      });

    const response = await request(app).get("/listings?city=Plovdiv");

    expect(response.body.listings).toHaveLength(1);
    expect(response.body.listings[0].title).toBe("Plovdiv item");
  });
});
