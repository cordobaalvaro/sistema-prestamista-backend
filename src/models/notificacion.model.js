const mongoose = require("mongoose");

// Tipos iniciales: prestamo_vencido, interes_actualizado
const notificacionSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ["prestamo_vencido", "interes_actualizado", "prestamo_cancelado"],
      required: true,
    },
    mensaje: {
      type: String,
      required: true,
      trim: true,
    },
    prestamo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prestamo",
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
    },
    leida: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

notificacionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notificacion", notificacionSchema);
