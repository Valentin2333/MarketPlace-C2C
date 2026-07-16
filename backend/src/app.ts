import express from "express";
import cors from "cors";
import authRouter from "./auth/routes.js";
import listingsRouter from "./listings/routes.js";
import categoriesRouter from "./categories/routes.js";
import usersRouter from "./users/routes.js";
import uploadsRouter from "./uploads/routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/listings", listingsRouter);
app.use("/categories", categoriesRouter);
app.use("/users", usersRouter);
app.use("/uploads", uploadsRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;
