const mongoose = require("mongoose");
const { Schema } = mongoose;


const datoLibreSchema = new Schema(
  {
    tabla: { type: String, required: true, trim: true },
    data: { type: Schema.Types.Mixed, required: true }, 
  },
  { timestamps: true }
);

datoLibreSchema.index({ tabla: 1, createdAt: -1 });

module.exports = mongoose.model("DatoLibre", datoLibreSchema);
