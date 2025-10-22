const mongoose = require("mongoose");
const { url } = require("../helpers/cloudinary.config.helpers");

const documentoClienteSchema = new mongoose.Schema({
  nombre: {
    type: String,
  },
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cliente",
  },
  url: {
    type: String,
    default: "url",
  },
});

const DocumentoCliente = mongoose.model(
  "DocumentoCliente",
  documentoClienteSchema
);

module.exports = DocumentoCliente;
