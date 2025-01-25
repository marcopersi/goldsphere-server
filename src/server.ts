
import express from "express";
import referencesRouter from "./routes/references";

const app = express();
const port = process.env.PORT || 11215;
app.use("/api", referencesRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});