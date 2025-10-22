const {
  obtenerMisZonasBD,
  crearTablaCobro,
  agregarItemTablaCobro,
  obtenerMisTablas,
  editarTablaCobro,
  editarItemTablaCobro,
  eliminarItemTablaCobro,
  eliminarTablaCobro,
  enviarTablaCobro,
  obtenerTablaPorIDBD,
  procesarCargaMasiva,
} = require("../services/cobradores.services.js");

const obtenerMisZonas = async (req, res) => {
  try {
    const cobradorId = req.idUsuario;

    if (!cobradorId) {
      return res.status(400).json({
        msg: "ID del cobrador es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await obtenerMisZonasBD(cobradorId);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const crearTabla = async (req, res) => {
  try {
    const cobradorId = req.idUsuario;
    const { fecha, nombre } = req.body;

    const { status, msg, data } = await crearTablaCobro(
      cobradorId,
      fecha,
      nombre
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const agregarItemTabla = async (req, res) => {
  try {
    const { tablaId } = req.params;
    const itemData = req.body;

    if (!tablaId) {
      return res.status(400).json({
        msg: "ID de la tabla es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await agregarItemTablaCobro(
      tablaId,
      itemData
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const obtenerTablas = async (req, res) => {
  try {
    const cobradorId = req.idUsuario;
  const filtros = req.query;

    const { status, msg, data } = await obtenerMisTablas(cobradorId, filtros);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};
const obtenerTablaPorID = async (req, res) => {
  try {
    const { tablaId } = req.params;
    const cobradorId = req.idUsuario;

    if (!tablaId) {
      return res.status(400).json({
        msg: "ID de la tabla es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await obtenerTablaPorIDBD(
      tablaId,
      cobradorId
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const editarTabla = async (req, res) => {
  try {
    const { tablaId } = req.params;
    const cobradorId = req.idUsuario;
    const datosActualizacion = req.body;

    if (!tablaId) {
      return res.status(400).json({
        msg: "ID de la tabla es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await editarTablaCobro(
      tablaId,
      datosActualizacion,
      cobradorId
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const editarItemTabla = async (req, res) => {
  try {
    const { tablaId, itemId } = req.params;
    const cobradorId = req.idUsuario;
    const datosItem = req.body;

    if (!tablaId || !itemId) {
      return res.status(400).json({
        msg: "ID de tabla e ID de item son requeridos",
        data: null,
      });
    }

    const { status, msg, data } = await editarItemTablaCobro(
      tablaId,
      itemId,
      datosItem,
      cobradorId
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const eliminarItemTabla = async (req, res) => {
  try {
    const { tablaId, itemId } = req.params;
    const cobradorId = req.idUsuario;

    if (!tablaId || !itemId) {
      return res.status(400).json({
        msg: "ID de tabla e ID de item son requeridos",
        data: null,
      });
    }

    const { status, msg, data } = await eliminarItemTablaCobro(
      tablaId,
      itemId,
      cobradorId
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const eliminarTabla = async (req, res) => {
  try {
    const { tablaId } = req.params;
    const cobradorId = req.idUsuario;

    if (!tablaId) {
      return res.status(400).json({
        msg: "ID de la tabla es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await eliminarTablaCobro(tablaId, cobradorId);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const enviarTabla = async (req, res) => {
  try {
    const { tablaId } = req.params;
    const cobradorId = req.idUsuario;

    if (!tablaId) {
      return res.status(400).json({
        msg: "ID de la tabla es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await enviarTablaCobro(
      tablaId,
      cobradorId,
      req.body
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const cargaMasiva = async (req, res) => {
  try {
    const { tablaId } = req.params;
    const cobradorId = req.idUsuario;
    const { listaCobros } = req.body;

    if (!tablaId) {
      return res.status(400).json({
        msg: "ID de la tabla es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await procesarCargaMasiva(
      cobradorId,
      tablaId,
      listaCobros
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

module.exports = {
  obtenerMisZonas,
  crearTabla,
  agregarItemTabla,
  obtenerTablas,
  obtenerTablaPorID,
  editarTabla,
  editarItemTabla,
  eliminarItemTabla,
  eliminarTabla,
  enviarTabla,
  cargaMasiva,
};
