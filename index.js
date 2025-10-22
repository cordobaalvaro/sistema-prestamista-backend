require("./src/db/config.db.js");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const app = express();
require("./src/utils/prestamos.cron.js");
app.use(express.json());

app.use(cors());
app.use(morgan("dev"));

app.use("/api", require("./src/routes/index.routes"));

app.listen(process.env.PORT || 5000, () => {
  console.log("servidor prendido en el puerto: ", process.env.PORT || 5000);
});
