// api/server.js
import express from "express";
import mongoose from "mongoose";
import preferencesRoutes from "./routes/preferences.routes.js";
import dotenv from 'dotenv';
import userRoutes from "./routes/user.routes.js";
dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/preferences", preferencesRoutes);
app.use("/api/user", userRoutes);

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API running on ${port}`));
}

start();
