const {
  procesarCobroBD,
  editarRegistroCobroBD,
  eliminarRegistroCobroBD,
  crearRegistroCobroBD,
  obtenerTablasEnviadas,
  editarTablaCobroAdmin,
  editarItemTablaCobroAdmin,
  eliminarItemTablaCobroAdmin,
  eliminarTablaCobroAdmin,
  agregarItemTablaCobroAdmin,
  marcarComoVistoTablaBD,
} = require("../services/admin.services.js");

const procesarCobro = async (req, res) => {
  try {
    const adminId = req.idUsuario;
    const { prestamoId, monto, fechaPago, tablaId } = req.body;

    if (!prestamoId || !monto) {
      return res.status(400).json({
        msg: "Faltan campos obligatorios: prestamoId, monto",
        data: null,
      });
    }

    const { status, msg, data } = await procesarCobroBD(
      prestamoId,
      monto,
      adminId,
      fechaPago,
      tablaId
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const obtenerTablas = async (req, res) => {
  try {
    const adminId = req.idUsuario;
    const filtros = req.query;

    const { status, msg, data } = await obtenerTablasEnviadas(adminId, filtros);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const editarTabla = async (req, res) => {
  try {
    const adminId = req.idUsuario;
    const { tablaId } = req.params;
    const body = req.body;

    if (!tablaId) {
      return res.status(400).json({
        msg: "ID de la tabla es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await editarTablaCobroAdmin(
      tablaId,
      body,
      adminId
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const editarItemTabla = async (req, res) => {
  try {
    const adminId = req.idUsuario;
    const { tablaId, itemId } = req.params;
    const datosItem = req.body;

    if (!tablaId || !itemId) {
      return res.status(400).json({
        msg: "ID de tabla e ID de item son requeridos",
        data: null,
      });
    }

    const { status, msg, data } = await editarItemTablaCobroAdmin(
      tablaId,
      itemId,
      datosItem,
      adminId
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const eliminarItemTabla = async (req, res) => {
  try {
    const adminId = req.idUsuario;
    const { tablaId, itemId } = req.params;

    if (!tablaId || !itemId) {
      return res.status(400).json({
        msg: "ID de tabla e ID de item son requeridos",
        data: null,
      });
    }

    const { status, msg, data } = await eliminarItemTablaCobroAdmin(
      tablaId,
      itemId,
      adminId
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const eliminarTabla = async (req, res) => {
  try {
    const adminId = req.idUsuario;
    const { tablaId } = req.params;

    if (!tablaId) {
      return res.status(400).json({
        msg: "ID de la tabla es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await eliminarTablaCobroAdmin(
      tablaId,
      adminId
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const agregarItemTabla = async (req, res) => {
  try {
    const adminId = req.idUsuario;
    const { tablaId } = req.params;
    const itemData = req.body;

    if (!tablaId) {
      return res.status(400).json({
        msg: "ID de la tabla es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await agregarItemTablaCobroAdmin(
      tablaId,
      itemData,
      adminId
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const editarRegistroCobro = async (req, res) => {
  try {
    const { prestamoId, registroId } = req.params;
    const { monto, fecha, horaPago, cuota } = req.body;

    if (!prestamoId || !registroId) {
      return res.status(400).json({
        msg: "PrestamoId y registroId son requeridos en los parámetros",
        data: null,
      });
    }

    const { status, msg, data } = await editarRegistroCobroBD(
      prestamoId,
      registroId,
      monto,
      fecha,
      horaPago,
      cuota
    );

    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const eliminarRegistroCobro = async (req, res) => {
  try {
    const { prestamoId, registroId } = req.params;

    if (!prestamoId || !registroId) {
      return res.status(400).json({
        msg: "PrestamoId y registroId son requeridos en los parámetros",
        data: null,
      });
    }

    const { status, msg, data } = await eliminarRegistroCobroBD(
      prestamoId,
      registroId
    );

    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const crearRegistroCobro = async (req, res) => {
  try {
    const { prestamoId } = req.params;
    const { monto, fecha, horaPago, cuota } = req.body;

    if (!prestamoId) {
      return res.status(400).json({
        msg: "PrestamoId es requerido en los parámetros",
        data: null,
      });
    }

    if (!monto) {
      return res.status(400).json({
        msg: "Monto es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await crearRegistroCobroBD(
      prestamoId,
      monto,
      fecha,
      horaPago,
      cuota
    );

    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const marcarComoVistoTabla = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await marcarComoVistoTablaBD(id);
    return res.status(result.status).json(result);
  } catch (error) {
    return res.status(500).json({
      status: 500,
      msg: "Error interno al marcar tabla como vista",
      data: null,
    });
  }
};

module.exports = {
  procesarCobro,
  editarRegistroCobro,
  eliminarRegistroCobro,
  crearRegistroCobro,
  obtenerTablas,
  editarTabla,
  editarItemTabla,
  eliminarItemTabla,
  eliminarTabla,
  agregarItemTabla,
  marcarComoVistoTabla,
};
