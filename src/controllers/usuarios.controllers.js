const {
  crearUsuarioBD,
  obtenerUsuariosBD,
  obtenerUsuarioPorIdBD,
  actualizarUsuarioBD,
  eliminarUsuarioBD,
  loginUsuarioBD,
} = require("../services/usuarios.services");

const crearUsuario = async (req, res) => {
  try {
    const { status, msg, data } = await crearUsuarioBD(req.body);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const obtenerUsuarios = async (req, res) => {
  try {
    const { status, msg, data } = await obtenerUsuariosBD();
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};
const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { status, msg, data } = await obtenerUsuarioPorIdBD(req.params.id);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { status, msg, data } = await actualizarUsuarioBD(
      req.params.id,
      req.body
    );
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    const { status, msg, data } = await eliminarUsuarioBD(req.params.id);
    res.status(status).json({ msg, data });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};
const loginUsuario = async (req, res) => {
  try {
    const { usuarioLogin, contraseña } = req.body;
    const { status, msg, data, token } = await loginUsuarioBD({
      usuarioLogin,
      contraseña,
    });
    res.status(status).json({ msg, data, token });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};


module.exports = {
  crearUsuario,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  eliminarUsuario,
  loginUsuario,
};
