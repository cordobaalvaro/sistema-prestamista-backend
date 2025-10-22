const mongoose = require("mongoose");
require("dotenv").config();

// Evitar que Mongoose falle por "buffering timed out" (0 = sin timeout)
mongoose.set("bufferTimeoutMS", 0);
// Opcional: compatibilidad de queries
mongoose.set("strictQuery", true);

mongoose
  .connect(process.env.MONGO_ACCESS, {
    serverSelectionTimeoutMS: 60000, // esperar hasta 60s para seleccionar servidor
    socketTimeoutMS: 60000, // tiempo de espera de sockets
    // maxPoolSize: 10, // opcional, tamaño del pool
  })
  .then(() => console.log("desde la base de datos"))
  .catch((error) => console.log("Error conectando a DB:", error));
