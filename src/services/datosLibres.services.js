const DatoLibre = require("../models/datoLibre.model");

async function crearDato({ tabla, data }) {
  return await DatoLibre.create({ tabla, data });
}

async function listarDatos({ tabla, page = 1, limit = 50 }) {
  const query = tabla ? { tabla } : {};
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    DatoLibre.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    DatoLibre.countDocuments(query),
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) };
}

async function obtenerDato(id) {
  return await DatoLibre.findById(id);
}

async function actualizarDato(id, { data, tabla }) {
  return await DatoLibre.findByIdAndUpdate(
    id,
    {
      ...(tabla !== undefined ? { tabla } : {}),
      ...(data !== undefined ? { data } : {}),
    },
    { new: true }
  );
}

async function eliminarDato(id) {
  return await DatoLibre.findByIdAndDelete(id);
}

module.exports = {
  crearDato,
  listarDatos,
  obtenerDato,
  actualizarDato,
  eliminarDato,
};
