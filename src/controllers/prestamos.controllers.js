const {
  crearPrestamoBD,
  obtenerPrestamoPorIdBD,
  obtenerTodosLosPrestamosBD,
  eliminarPrestamoBD,
  actualizarPrestamoBD,
  desactivarPrestamoBD,
  activarPrestamoBD,
} = require("../services/prestamos.services.js");

const crearPrestamo = async (req, res) => {
  try {
    const { status, msg, data } = await crearPrestamoBD(req.body);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const obtenerPrestamoPorId = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ msg: "ID es requerido", data: null });
    }

    const { status, msg, data } = await obtenerPrestamoPorIdBD(id);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const obtenerTodosLosPrestamos = async (req, res) => {
  try {
    const { status, msg, data } = await obtenerTodosLosPrestamosBD();
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const eliminarPrestamo = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ msg: "ID es requerido", data: null });
    }

    const { status, msg, data } = await eliminarPrestamoBD(id);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const actualizarPrestamo = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ msg: "ID es requerido", data: null });
    }

    const { status, msg, data } = await actualizarPrestamoBD(id, req.body);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const desactivarPrestamo = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ msg: "ID es requerido", data: null });
    }

    const { status, msg, data } = await desactivarPrestamoBD(id);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const activarPrestamo = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ msg: "ID es requerido", data: null });
    }

    const { status, msg, data } = await activarPrestamoBD(id);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

module.exports = {
  crearPrestamo,
  obtenerPrestamoPorId,
  obtenerTodosLosPrestamos,
  eliminarPrestamo,
  actualizarPrestamo,
  desactivarPrestamo,
  activarPrestamo,
};
