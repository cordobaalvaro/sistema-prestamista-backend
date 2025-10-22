const {
  crearZonaBD,
  obtenerZonasBD,
  obtenerZonaPorIdBD,
  actualizarZonaBD,
  eliminarZonaBD,
  agregarClienteAZonaBD,
  moverClienteDeZonaBD,
  eliminarClienteDeZonaBD,
  añadirCobradorALaZona,
  eliminarCobradorDeLaZona,
} = require("../services/zona.services");

const crearZona = async (req, res) => {
  try {
    const { status, msg, data } = await crearZonaBD(req.body);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const obtenerZonas = async (req, res) => {
  try {
    const { status, msg, data } = await obtenerZonasBD();
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const obtenerZonaPorId = async (req, res) => {
  try {
    const { status, msg, data } = await obtenerZonaPorIdBD(req.params.id);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const actualizarZona = async (req, res) => {
  try {
    const { status, msg, data } = await actualizarZonaBD(
      req.params.id,
      req.body
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const eliminarZona = async (req, res) => {
  try {
    const { status, msg, data } = await eliminarZonaBD(req.params.id);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const agregarClienteAZona = async (req, res) => {
  try {
    const { idZona, idCliente } = req.params;
    const { status, msg, data } = await agregarClienteAZonaBD(
      idZona,
      idCliente
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};
const eliminarClienteDeZona = async (req, res) => {
  try {
    const { idZona, idCliente } = req.params;
    const { status, msg, data } = await eliminarClienteDeZonaBD(
      idZona,
      idCliente
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const moverClienteDeZona = async (req, res) => {
  try {
    const { idZonaOrigen, idZonaDestino, idCliente } = req.body;
    const { status, msg, data } = await moverClienteDeZonaBD(
      idZonaOrigen,
      idZonaDestino,
      idCliente
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const añadirCobrador = async (req, res) => {
  try {
    const { zonaId } = req.params;
    const { cobradorId } = req.body;

    if (!cobradorId) {
      return res.status(400).json({
        msg: "El ID del cobrador es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await añadirCobradorALaZona(
      zonaId,
      cobradorId
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const eliminarCobrador = async (req, res) => {
  try {
    const { zonaId } = req.params;
    const { cobradorId } = req.params;

    if (!cobradorId) {
      return res.status(400).json({
        msg: "El ID del cobrador es requerido",
        data: null,
      });
    }

    const { status, msg, data } = await eliminarCobradorDeLaZona(
      zonaId,
      cobradorId
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

module.exports = {
  crearZona,
  obtenerZonas,
  obtenerZonaPorId,
  actualizarZona,
  eliminarZona,
  agregarClienteAZona,
  eliminarClienteDeZona,
  moverClienteDeZona,
  añadirCobrador,
  eliminarCobrador,
};
