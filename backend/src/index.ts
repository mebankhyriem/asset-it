import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "asset-it-backend" });
});

// Resource routes are mounted here as each is migrated (Phases 1-4 of the split plan).
// e.g. app.use("/api/auth", authRouter);

app.listen(PORT, () => {
  console.log(`asset-it backend listening on http://localhost:${PORT}`);
});
