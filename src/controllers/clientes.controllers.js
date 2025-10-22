const {
  crearClienteBD,
  obtenerClientesBD,
  obtenerClientePorIdBD,
  obtenerClientePorDNIBD,
  actualizarClienteBD,
  eliminarClienteBD,
  resumenClienteBD,
} = require("../services/clientes.services.js");

const crearCliente = async (req, res) => {
  try {
    const { status, msg, data } = await crearClienteBD(req.body);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const obtenerClientes = async (req, res) => {
  try {
    const { status, msg, data } = await obtenerClientesBD();
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const obtenerClientePorId = async (req, res) => {
  try {
    const { status, msg, data } = await obtenerClientePorIdBD(req.params.id);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const obtenerClientePorDNI = async (req, res) => {
  try {
    const { status, msg, data } = await obtenerClientePorDNIBD(req.params.dni);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const actualizarCliente = async (req, res) => {
  try {
    const { status, msg, data } = await actualizarClienteBD(
      req.params.id,
      req.body
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const eliminarCliente = async (req, res) => {
  try {
    const { status, msg, data } = await eliminarClienteBD(req.params.id);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const obtenerResumenCliente = async (req, res) => {
  try {
    const { status, msg, data } = await resumenClienteBD(req.params.id);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

module.exports = {
  crearCliente,
  obtenerClientes,
  obtenerClientePorId,
  obtenerClientePorDNI,
  actualizarCliente,
  eliminarCliente,
  obtenerResumenCliente,
};
