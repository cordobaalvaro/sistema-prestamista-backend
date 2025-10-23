const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  usuarioLogin: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  contraseña: {
    type: String,
    required: true,
  },
  zonaACargo: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zona",
    },
  ],
  tablas: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TablaCobro",
    },
  ],
  rol: {
    type: String,
    enum: ["cobrador", "admin"],
    required: true,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
});

const UsuarioModel = mongoose.model("Usuario", usuarioSchema);

module.exports = UsuarioModel;
