const UsuarioModel = require("../models/usuario.model.js");
const ZonaModel = require("../models/zona.model.js");
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");

const crearUsuarioBD = async (datos) => {
  try {
    if (datos.contraseña) {
      datos.contraseña = await argon2.hash(datos.contraseña);
    }

    const nuevoUsuario = new UsuarioModel(datos);
    await nuevoUsuario.save();

    return {
      status: 201,
      msg: "Usuario creado correctamente",
      data: nuevoUsuario,
    };
  } catch (error) {
    if (error.code === 11000) {
      return {
        status: 400,
        msg: "Ya existe un usuario con este nombre de usuario",
        data: null,
      };
    }
    return {
      status: 500,
      msg: "Error al crear usuario",
      data: error.message,
    };
  }
};

const obtenerUsuariosBD = async () => {
  try {
    const usuarios = await UsuarioModel.find().populate("zonaACargo");

    return {
      status: 200,
      msg: "Lista de usuarios obtenida correctamente",
      data: usuarios,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al obtener usuarios",
      data: error.message,
    };
  }
};

const obtenerUsuarioPorIdBD = async (id) => {
  try {
    const usuario = await UsuarioModel.findById(id).populate("zonaACargo");

    if (!usuario) {
      return {
        status: 404,
        msg: "Usuario no encontrado",
        data: null,
      };
    }

    return {
      status: 200,
      msg: "Usuario encontrado",
      data: usuario,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al obtener usuario",
      data: error.message,
    };
  }
};

const actualizarUsuarioBD = async (id, datos) => {
  try {
    const usuarioActual = await UsuarioModel.findById(id).populate(
      "zonaACargo"
    );
    if (!usuarioActual) {
      return {
        status: 404,
        msg: "Usuario no encontrado",
        data: null,
      };
    }

    if (datos.contraseña) {
      datos.contraseña = await argon2.hash(datos.contraseña);
    }

    if (
      usuarioActual.rol === "cobrador" &&
      datos.zonaACargo &&
      datos.zonaACargo !== usuarioActual.zonaACargo?.toString()
    ) {
      const nuevaZona = await ZonaModel.findById(datos.zonaACargo);
      if (!nuevaZona) {
        return {
          status: 404,
          msg: "La nueva zona especificada no existe",
          data: null,
        };
      }

      if (nuevaZona.cobrador && nuevaZona.cobrador.toString() !== id) {
        return {
          status: 400,
          msg: "La zona ya tiene un cobrador asignado",
          data: null,
        };
      }
      if (usuarioActual.zonaACargo) {
        await ZonaModel.findByIdAndUpdate(usuarioActual.zonaACargo, {
          $unset: { cobrador: 1 },
        });
      }
      await ZonaModel.findByIdAndUpdate(datos.zonaACargo, {
        $set: { cobrador: id },
      });
    }

    const usuarioActualizado = await UsuarioModel.findByIdAndUpdate(id, datos, {
      new: true,
    }).populate("zonaACargo");

    return {
      status: 200,
      msg:
        datos.zonaACargo &&
        datos.zonaACargo !== usuarioActual.zonaACargo?.toString()
          ? "Usuario actualizado correctamente y zona reasignada"
          : "Usuario actualizado correctamente",
      data: usuarioActualizado,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al actualizar usuario",
      data: error.message,
    };
  }
};

const eliminarUsuarioBD = async (id) => {
  try {
    const usuario = await UsuarioModel.findById(id);

    if (!usuario) {
      return {
        status: 404,
        msg: "Usuario no encontrado",
        data: null,
      };
    }

    if (usuario.zonaACargo && usuario.zonaACargo.length > 0) {
      await ZonaModel.updateMany(
        { _id: { $in: usuario.zonaACargo } },
        { $pull: { cobrador: id } }
      );
    }

    const usuarioEliminado = await UsuarioModel.findByIdAndDelete(id);

    return {
      status: 200,
      msg: "Usuario eliminado correctamente y referencias en zonas actualizadas",
      data: usuarioEliminado,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al eliminar usuario",
      data: error.message,
    };
  }
};
const loginUsuarioBD = async ({ usuarioLogin, contraseña }) => {
  try {
    const usuario = await UsuarioModel.findOne({ usuarioLogin: usuarioLogin });

    if (!usuario) {
      return {
        status: 404,
        msg: "Usuario no encontrado",
        data: null,
      };
    }

    const passwordValido = await argon2.verify(usuario.contraseña, contraseña);
    if (!passwordValido) {
      return {
        status: 401,
        msg: "Contraseña incorrecta",
        data: null,
      };
    }

    const token = jwt.sign(
      {
        idUsuario: usuario._id,
        rolUsuario: usuario.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return {
      status: 200,
      msg: "Inicio de sesión exitoso",
      token,
      data: {
        usuario: {
          id: usuario._id,
          nombre: usuario.nombre,
          rol: usuario.rol,
        },
      },
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al iniciar sesión: " + error.message,
      data: null,
    };
  }
};

 

module.exports = {
  crearUsuarioBD,
  obtenerUsuariosBD,
  obtenerUsuarioPorIdBD,
  actualizarUsuarioBD,
  eliminarUsuarioBD,
  loginUsuarioBD,
};
