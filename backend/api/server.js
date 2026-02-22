import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import preferencesRoutes from "./routes/preferences.routes.js";
import userRoutes from "./routes/user.routes.js";
import unsubscribeRoutes from "./routes/unsubscribe.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import "../jobs/scheduler.js";

const app = express();
app.use(express.json());
app.use("/api", unsubscribeRoutes);

app.use("/api/preferences", preferencesRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
console.log("Scheduler loaded !!");

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`API running on ${port}`));
}

start();
