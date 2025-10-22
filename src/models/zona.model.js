const mongoose = require("mongoose");

const zonaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
  },

  localidades: {
    type: [String],
    required: true,
  },
  clientes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
    },
  ],
  cobrador: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
    },
  ],
});

const ZonaModel = mongoose.model("Zona", zonaSchema);

module.exports = ZonaModel;
