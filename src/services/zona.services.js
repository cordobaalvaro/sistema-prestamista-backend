const ZonaModel = require("../models/zona.model.js");
const ClienteModel = require("../models/cliente.model.js");
const UsuarioModel = require("../models/usuario.model.js");

const crearZonaBD = async (datos) => {
  try {
    const { clientes = [], cobrador = [] } = datos;

    const nuevaZona = new ZonaModel(datos);
    await nuevaZona.save();

    if (clientes.length > 0) {
      await ClienteModel.updateMany(
        { _id: { $in: clientes } },
        { $set: { zona: nuevaZona._id } }
      );
    }

    if (cobrador.length > 0) {
      await UsuarioModel.updateMany(
        { _id: { $in: cobrador } },
        { $push: { zonaACargo: nuevaZona._id } }
      );
    }

    return {
      status: 201,
      msg: "Zona creada exitosamente y referencias actualizadas",
      data: nuevaZona,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al crear la zona: " + error.message,
      data: null,
    };
  }
};

const obtenerZonasBD = async () => {
  try {
    const zonas = await ZonaModel.find()
      .populate({
        path: "clientes",
        populate: {
          path: "prestamos",
          model: "Prestamo",
          match: { estado: { $in: ["activo", "vencido"] } },
        },
      })
      .populate("cobrador", "nombre");
    return {
      status: 200,
      msg: "Zonas obtenidas exitosamente",
      data: zonas,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al obtener las zonas: " + error.message,
      data: null,
    };
  }
};

const obtenerZonaPorIdBD = async (id) => {
  try {
    const zona = await ZonaModel.findById(id)
      .populate({
        path: "clientes",
        populate: {
          path: "prestamos",
          model: "Prestamo",
        },
      })
      .populate("cobrador");
    if (!zona) {
      return {
        status: 404,
        msg: "Zona no encontrada",
        data: null,
      };
    }
    return {
      status: 200,
      msg: "Zona obtenida exitosamente",
      data: zona,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al obtener la zona: " + error.message,
      data: null,
    };
  }
};

const actualizarZonaBD = async (id, datos) => {
  try {
    const zonaActualizada = await ZonaModel.findByIdAndUpdate(id, datos, {
      new: true,
    }).populate("clientes cobrador");
    if (!zonaActualizada) {
      return {
        status: 404,
        msg: "Zona no encontrada",
        data: null,
      };
    }
    return {
      status: 200,
      msg: "Zona actualizada exitosamente",
      data: zonaActualizada,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al actualizar la zona: " + error.message,
      data: null,
    };
  }
};

const eliminarZonaBD = async (id) => {
  try {
    const zona = await ZonaModel.findById(id);
    if (!zona) {
      return {
        status: 404,
        msg: "Zona no encontrada",
        data: null,
      };
    }

    await UsuarioModel.updateMany(
      { _id: { $in: zona.cobrador } },
      { $pull: { zonaACargo: id } }
    );

    await ClienteModel.updateMany(
      { _id: { $in: zona.clientes }, zona: id },
      { $unset: { zona: "" } }
    );

    const zonaEliminada = await ZonaModel.findByIdAndDelete(id);

    return {
      status: 200,
      msg: "Zona eliminada exitosamente y referencias limpiadas",
      data: zonaEliminada,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al eliminar la zona: " + error.message,
      data: null,
    };
  }
};

const agregarClienteAZonaBD = async (idZona, idCliente) => {
  try {
    const zona = await ZonaModel.findById(idZona);
    if (!zona) {
      return {
        status: 404,
        msg: "Zona no encontrada",
        data: null,
      };
    }

    const cliente = await ClienteModel.findById(idCliente);
    if (!cliente) {
      return {
        status: 404,
        msg: "Cliente no encontrado",
        data: null,
      };
    }

    if (zona.clientes.includes(idCliente)) {
      return {
        status: 400,
        msg: "El cliente ya está asignado a esta zona",
        data: null,
      };
    }

    cliente.zona = idZona;
    await cliente.save();

    zona.clientes.push(idCliente);
    await zona.save();

    return {
      status: 200,
      msg: "Cliente agregado a la zona exitosamente",
      data: zona,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al agregar cliente a zona: " + error.message,
      data: null,
    };
  }
};

const eliminarClienteDeZonaBD = async (idZona, idCliente) => {
  try {
    const zona = await ZonaModel.findById(idZona);
    if (!zona) {
      return { status: 404, msg: "Zona no encontrada", data: null };
    }

    const cliente = await ClienteModel.findById(idCliente);
    if (!cliente) {
      return { status: 404, msg: "Cliente no encontrado", data: null };
    }

    zona.clientes = zona.clientes.filter(
      (clienteId) => clienteId.toString() !== idCliente.toString()
    );

    await zona.save();

    if (cliente.zona && cliente.zona.toString() === idZona.toString()) {
      cliente.zona = null;
      await cliente.save();
    }

    return {
      status: 200,
      msg: "Cliente eliminado de la zona correctamente",
      data: zona,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al eliminar cliente de la zona: " + error.message,
      data: null,
    };
  }
};

const moverClienteDeZonaBD = async (idZonaOrigen, idZonaDestino, idCliente) => {
  try {
    const zonaOrigen = await ZonaModel.findById(idZonaOrigen);
    if (!zonaOrigen) {
      return { status: 404, msg: "Zona origen no encontrada", data: null };
    }

    const zonaDestino = await ZonaModel.findById(idZonaDestino);
    if (!zonaDestino) {
      return { status: 404, msg: "Zona destino no encontrada", data: null };
    }

    const cliente = await ClienteModel.findById(idCliente);
    if (!cliente) {
      return { status: 404, msg: "Cliente no encontrado", data: null };
    }

    zonaOrigen.clientes = zonaOrigen.clientes.filter(
      (clienteId) => clienteId.toString() !== idCliente.toString()
    );

    if (
      !zonaDestino.clientes.some((c) => c.toString() === idCliente.toString())
    ) {
      zonaDestino.clientes.push(idCliente);
    }

    cliente.zona = idZonaDestino;

    await zonaOrigen.save();
    await zonaDestino.save();
    await cliente.save();

    return {
      status: 200,
      msg: "Cliente movido exitosamente de una zona a otra",
      data: { zonaOrigen, zonaDestino, cliente },
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al mover cliente entre zonas: " + error.message,
      data: null,
    };
  }
};

const añadirCobradorALaZona = async (zonaId, cobradorId) => {
  try {
    const zona = await ZonaModel.findById(zonaId);
    if (!zona) {
      return {
        status: 404,
        msg: "Zona no encontrada",
        data: null,
      };
    }

    const cobrador = await UsuarioModel.findById(cobradorId);
    if (!cobrador) {
      return {
        status: 404,
        msg: "Usuario no encontrado",
        data: null,
      };
    }

    if (cobrador.rol !== "cobrador") {
      return {
        status: 400,
        msg: "El usuario no es un cobrador",
        data: null,
      };
    }

    if (!zona.cobrador || !Array.isArray(zona.cobrador)) {
      zona.cobrador = [];
    }

    if (zona.cobrador.includes(cobradorId)) {
      return {
        status: 400,
        msg: "El cobrador ya está asignado a esta zona",
        data: null,
      };
    }

    zona.cobrador.push(cobradorId);
    await zona.save();

    if (!cobrador.zonaACargo || !Array.isArray(cobrador.zonaACargo)) {
      cobrador.zonaACargo = [];
    }

    if (!cobrador.zonaACargo.includes(zonaId)) {
      cobrador.zonaACargo.push(zonaId);
      await cobrador.save();
    }

    return {
      status: 200,
      msg: "Cobrador asignado a la zona correctamente",
      data: {
        zona: zona,
        cobrador: cobrador,
      },
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al asignar cobrador a la zona: " + error.message,
      data: null,
    };
  }
};

const eliminarCobradorDeLaZona = async (zonaId, cobradorId) => {
  try {
    const zona = await ZonaModel.findById(zonaId);
    if (!zona) {
      return {
        status: 404,
        msg: "Zona no encontrada",
        data: null,
      };
    }

    const cobrador = await UsuarioModel.findById(cobradorId);
    if (!cobrador) {
      return {
        status: 404,
        msg: "Cobrador no encontrado",
        data: null,
      };
    }

    if (!zona.cobrador || !Array.isArray(zona.cobrador)) {
      zona.cobrador = [];
    }

    if (!zona.cobrador.includes(cobradorId)) {
      return {
        status: 400,
        msg: "El cobrador no está asignado a esta zona",
        data: null,
      };
    }

    zona.cobrador = zona.cobrador.filter((id) => id.toString() !== cobradorId);
    await zona.save();

    if (!cobrador.zonaACargo || !Array.isArray(cobrador.zonaACargo)) {
      cobrador.zonaACargo = [];
    }

    cobrador.zonaACargo = cobrador.zonaACargo.filter(
      (id) => id.toString() !== zonaId
    );
    await cobrador.save();

    return {
      status: 200,
      msg: "Cobrador eliminado de la zona correctamente",
      data: {
        zona: zona,
        cobradorEliminado: cobradorId,
      },
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al eliminar cobrador de la zona: " + error.message,
      data: null,
    };
  }
};

module.exports = {
  crearZonaBD,
  obtenerZonasBD,
  obtenerZonaPorIdBD,
  actualizarZonaBD,
  eliminarZonaBD,
  agregarClienteAZonaBD,
  eliminarClienteDeZonaBD,
  moverClienteDeZonaBD,
  añadirCobradorALaZona,
  eliminarCobradorDeLaZona,
};
