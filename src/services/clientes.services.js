const ClienteModel = require("../models/cliente.model.js");
const PrestamoModel = require("../models/prestamo.model.js");
require("../models/prestamo.model.js");
const ZonaModel = require("../models/zona.model.js");
const DocumentoCliente = require("../models/documentosCliente.model.js");

const crearClienteBD = async (datos) => {
  try {
    const nuevoCliente = new ClienteModel(datos);
    await nuevoCliente.save();

    await ZonaModel.findByIdAndUpdate(datos.zona, {
      $push: { clientes: nuevoCliente._id },
    });

    return {
      status: 201,
      msg: "Cliente creado exitosamente",
      data: nuevoCliente,
    };
  } catch (error) {
    if (error.code === 11000) {
      return {
        status: 400,
        msg: "Ya existe un cliente con este DNI",
        data: null,
      };
    }
    return {
      status: 500,
      msg: "Error al crear el cliente: " + error.message,
      data: null,
    };
  }
};

const obtenerClientesBD = async () => {
  try {
    const clientes = await ClienteModel.find().populate("prestamos zona");
    return {
      status: 200,
      msg: "Clientes obtenidos exitosamente",
      data: clientes,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al obtener los clientes: " + error.message,
      data: null,
    };
  }
};

const obtenerClientePorIdBD = async (id) => {
  try {
    const cliente = await ClienteModel.findById(id)
      .populate("prestamos")
      .populate({
        path: "zona",
        populate: {
          path: "cobrador",
        },
      });

    if (!cliente) {
      return {
        status: 404,
        msg: "Cliente no encontrado",
        data: null,
      };
    }

    return {
      status: 200,
      msg: "Cliente encontrado exitosamente",
      data: cliente,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al obtener el cliente: " + error.message,
      data: null,
    };
  }
};

const obtenerClientePorDNIBD = async (dni) => {
  try {
    const cliente = await ClienteModel.findOne({ dni }).populate("prestamos");
    if (!cliente) {
      return {
        status: 404,
        msg: "Cliente no encontrado",
        data: null,
      };
    }
    return {
      status: 200,
      msg: "Cliente encontrado exitosamente",
      data: cliente,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al buscar el cliente por DNI: " + error.message,
      data: null,
    };
  }
};

const actualizarClienteBD = async (id, nuevosDatos) => {
  try {
    const clienteActual = await ClienteModel.findById(id);
    if (!clienteActual) {
      return {
        status: 404,
        msg: "Cliente no encontrado",
        data: null,
      };
    }

    if (
      nuevosDatos.zona &&
      nuevosDatos.zona !== clienteActual.zona?.toString()
    ) {
      const nuevaZona = await ZonaModel.findById(nuevosDatos.zona);
      if (!nuevaZona) {
        return {
          status: 404,
          msg: "La nueva zona especificada no existe",
          data: null,
        };
      }

      if (clienteActual.zona) {
        await ZonaModel.findByIdAndUpdate(clienteActual.zona, {
          $pull: { clientes: id },
        });
      }
      await ZonaModel.findByIdAndUpdate(nuevosDatos.zona, {
        $addToSet: { clientes: id },
      });
    }

    const cliente = await ClienteModel.findByIdAndUpdate(id, nuevosDatos, {
      new: true,
      runValidators: true,
    }).populate("zona", "nombre");

    return {
      status: 200,
      msg:
        nuevosDatos.zona && nuevosDatos.zona !== clienteActual.zona?.toString()
          ? "Cliente actualizado exitosamente y movido a nueva zona"
          : "Cliente actualizado exitosamente",
      data: cliente,
    };
  } catch (error) {
    if (error.code === 11000) {
      return {
        status: 400,
        msg: "Ya existe un cliente con este DNI",
        data: null,
      };
    }
    return {
      status: 500,
      msg: "Error al actualizar el cliente: " + error.message,
      data: null,
    };
  }
};

const eliminarClienteBD = async (id) => {
  try {
    const cliente = await ClienteModel.findById(id).populate("prestamos");
    if (!cliente) {
      return {
        status: 404,
        msg: "Cliente no encontrado",
        data: null,
      };
    }

    if (
      cliente.prestamos &&
      cliente.prestamos.some((prestamo) => prestamo.estado === "PENDIENTE")
    ) {
      return {
        status: 400,
        msg: "No se puede eliminar un cliente con préstamos pendientes",
        data: null,
      };
    }

    await PrestamoModel.deleteMany({ cliente: id });
  await DocumentoCliente.deleteMany({ clienteId: id });

    if (cliente.zona) {
      await ZonaModel.findByIdAndUpdate(cliente.zona, {
        $pull: { clientes: id },
      });
    }

    await ClienteModel.findByIdAndDelete(id);

    return {
      status: 200,
      msg: "Cliente y préstamos eliminados exitosamente",
      data: cliente,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al eliminar el cliente: " + error.message,
      data: null,
    };
  }
};

const resumenClienteBD = async (clienteId) => {
  try {
    const cliente = await ClienteModel.findById(clienteId)
      .populate("zona", "nombre")
      .populate({
        path: "prestamos",
        match: { estadoPrestamo: { $ne: "desactivado" } },
      });

    if (!cliente) {
      return {
        status: 404,
        msg: "Cliente no encontrado",
        data: null,
      };
    }

    const prestamosResumen = cliente.prestamos.map((prestamo) => {
      const prestamoBase = {
        numero: prestamo.numero,
        nombre: prestamo.nombre,
        estadoPrestamo: prestamo.estado,
      };

      switch (prestamo.estadoPrestamo) {
        case "activo":
          return {
            ...prestamoBase,
            montoTotal: prestamo.montoTotal,
            saldoPendiente: prestamo.saldoPendiente,
          };

        case "cancelado":
          return {
            ...prestamoBase,
            montoTotal: prestamo.montoTotal,
          };

        case "vencido":
          return {
            ...prestamoBase,
            montoTotal: prestamo.montoTotal,
            saldoPendiente: prestamo.saldoPendiente,
          };

        case "completado":
          return {
            ...prestamoBase,
          };

        default:
          return {
            ...prestamoBase,
            montoTotal: prestamo.montoTotal,
            saldoPendiente: prestamo.saldoPendiente,
          };
      }
    });

    const resumen = {
      cliente: {
        numero: cliente.numero,
        nombre: cliente.nombre,
        dni: cliente.dni,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        fechaRegistro: cliente.fechaRegistro,
        zona: cliente.zona,
        estado: cliente.estado,
      },
      prestamos: prestamosResumen,
    };

    return {
      status: 200,
      msg: "Resumen del cliente obtenido exitosamente",
      data: resumen,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al obtener el resumen del cliente: " + error.message,
      data: null,
    };
  }
};

module.exports = {
  crearClienteBD,
  obtenerClientesBD,
  obtenerClientePorIdBD,
  obtenerClientePorDNIBD,
  actualizarClienteBD,
  eliminarClienteBD,
  resumenClienteBD,
};
