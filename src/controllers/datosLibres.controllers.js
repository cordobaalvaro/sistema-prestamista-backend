const service = require("../services/datosLibres.services");

exports.crear = async (req, res) => {
  try {
    const { tabla, data } = req.body;
    if (!tabla || data === undefined) {
      return res
        .status(400)
        .json({ message: "'tabla' y 'data' son requeridos" });
    }
    const doc = await service.crearDato({ tabla, data });
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creando dato", error: err.message });
  }
};

exports.listar = async (req, res) => {
  try {
    const { tabla, page, limit } = req.query;
    const result = await service.listarDatos({
      tabla,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error listando datos", error: err.message });
  }
};

exports.obtener = async (req, res) => {
  try {
    const doc = await service.obtenerDato(req.params.id);
    if (!doc) return res.status(404).json({ message: "No encontrado" });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error obteniendo dato", error: err.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { tabla, data } = req.body;
    const doc = await service.actualizarDato(req.params.id, { tabla, data });
    if (!doc) return res.status(404).json({ message: "No encontrado" });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error actualizando dato", error: err.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const doc = await service.eliminarDato(req.params.id);
    if (!doc) return res.status(404).json({ message: "No encontrado" });
    res.json({ message: "Eliminado", id: doc._id });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error eliminando dato", error: err.message });
  }
};
