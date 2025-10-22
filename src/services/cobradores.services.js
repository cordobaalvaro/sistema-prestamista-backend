const PrestamoModel = require("../models/prestamo.model");
const ClienteModel = require("../models/cliente.model");
const ZonaModel = require("../models/zona.model");
const UsuarioModel = require("../models/usuario.model");
const TablaCobroModel = require("../models/TablaCobro.model");

const obtenerMisZonasBD = async (cobradorId) => {
  try {
    if (!cobradorId) {
      return {
        status: 400,
        msg: "ID del cobrador es requerido",
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

    if (cobrador.rol !== "cobrador") {
      return {
        status: 403,
        msg: "El usuario no tiene permisos de cobrador",
        data: null,
      };
    }

    const zonasACargo = await ZonaModel.find({ cobrador: cobradorId })
      .populate({
        path: "clientes",
        populate: {
          path: "prestamos",
          model: "Prestamo",
        },
      })
      .populate("cobrador", "nombre");

    const zonasConEstadisticas = zonasACargo.map((zona) => {
      let totalClientes = zona.clientes.length;
      let clientesConPrestamos = 0;
      let totalPrestamos = 0;
      let totalACobrar = 0;
      let cuotasPendientes = 0;

      zona.clientes.forEach((cliente) => {
        if (cliente.prestamos && cliente.prestamos.length > 0) {
          clientesConPrestamos++;
          totalPrestamos += cliente.prestamos.length;

          cliente.prestamos.forEach((prestamo) => {
            totalACobrar += prestamo.saldoPendiente || 0;
            if (prestamo.estado === "vencido") {
              totalACobrar += prestamo.interesSemanal || 0;
            }
            if (prestamo.planDeCuotas) {
              const cuotasNoPagadas = prestamo.planDeCuotas.filter(
                (cuota) =>
                  cuota.estado === "pendiente" || cuota.estado === "cobrado"
              );
              cuotasPendientes += cuotasNoPagadas.length;
            }
          });
        }
      });

      return {
        _id: zona._id,
        nombre: zona.nombre,
        localidades: zona.localidades,
        cobrador: zona.cobrador,
        estadisticas: {
          totalClientes,
          clientesConPrestamos,
          totalPrestamos,
          cuotasPendientes,
          totalACobrar: parseFloat(totalACobrar.toFixed(2)),
        },
        clientes: zona.clientes.map((cliente) => ({
          _id: cliente._id,
          nombre: cliente.nombre,
          dni: cliente.dni,
          telefono: cliente.telefono,
          direccion: cliente.direccion,
          barrio: cliente.barrio,
          ciudad: cliente.ciudad,
          prestamos: cliente.prestamos || [],
          localidad: cliente.localidad,
          prestamosActivos: cliente.prestamos ? cliente.prestamos.length : 0,
          saldoPendiente: cliente.prestamos
            ? cliente.prestamos.reduce(
                (sum, prestamo) => sum + (prestamo.saldoPendiente || 0),
                0
              )
            : 0,
        })),
      };
    });

    return {
      status: 200,
      msg: "Zonas a cargo obtenidas correctamente",
      data: zonasConEstadisticas,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      msg: "Error interno al obtener zonas a cargo",
      data: null,
    };
  }
};

const crearTablaCobro = async (cobradorId, fecha = null, nombre = null) => {
  try {
    if (!cobradorId) {
      return {
        status: 400,
        msg: "ID del cobrador es requerido",
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

    if (cobrador.rol !== "cobrador") {
      return {
        status: 403,
        msg: "El usuario no tiene permisos de cobrador",
        data: null,
      };
    }

    let fechaTabla;
    if (fecha) {
      const [year, month, day] = fecha.split("-").map(Number);
      fechaTabla = new Date(year, month - 1, day);
    } else {
      fechaTabla = new Date();
    }

    const inicioDia = new Date(
      fechaTabla.getFullYear(),
      fechaTabla.getMonth(),
      fechaTabla.getDate()
    );
    const finDia = new Date(inicioDia);
    finDia.setDate(finDia.getDate() + 1);

    const tablaExistente = await TablaCobroModel.findOne({
      cobrador: cobradorId,
      fecha: {
        $gte: inicioDia,
        $lt: finDia,
      },
      estado: "pendiente",
    });

    if (tablaExistente) {
      return {
        status: 400,
        msg: "Ya existe una tabla pendiente para esta fecha",
        data: tablaExistente,
      };
    }

    const nuevaTabla = new TablaCobroModel({
      nombre: nombre,
      fecha: fechaTabla,
      cobrador: cobradorId,
      listaTabla: [],
      estado: "pendiente",
    });

    const tablaGuardada = await nuevaTabla.save();

    cobrador.tablas.push(tablaGuardada._id);
    await cobrador.save();

    return {
      status: 201,
      msg: "Tabla de cobros creada correctamente",
      data: tablaGuardada,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      msg: "Error interno al crear tabla de cobros",
      data: null,
    };
  }
};

const agregarItemTablaCobro = async (tablaId, itemData) => {
  try {
    const { zona, cliente, prestamo, monto, fechaPago } = itemData;

    if (!tablaId || !cliente || !prestamo || !monto) {
      return {
        status: 400,
        msg: "Faltan campos obligatorios: tablaId, cliente, prestamo, monto",
        data: null,
      };
    }

    const tabla = await TablaCobroModel.findById(tablaId);
    if (!tabla) {
      return {
        status: 404,
        msg: "Tabla de cobros no encontrada",
        data: null,
      };
    }

    if (tabla.estado !== "pendiente") {
      return {
        status: 400,
        msg: "No se puede modificar una tabla que ya fue enviada",
        data: null,
      };
    }

    const prestamoExiste = await PrestamoModel.findById(prestamo);
    if (!prestamoExiste) {
      return {
        status: 404,
        msg: "Préstamo no encontrado",
        data: null,
      };
    }

    const nuevoItem = {
      zona: zona || null,
      cliente,
      prestamo,
      monto: parseFloat(monto),
      fechaPago: fechaPago ? new Date(fechaPago) : null,
    };

    tabla.listaTabla.push(nuevoItem);
  await tabla.save();

    const tablaActualizada = await TablaCobroModel.findById(tablaId)
      .populate("listaTabla.zona", "nombre")
      .populate("listaTabla.cliente", "nombre dni telefono")
      .populate("listaTabla.prestamo", "montoInicial estado");

    return {
      status: 200,
      msg: "Item agregado correctamente a la tabla",
      data: tablaActualizada,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      msg: "Error interno al agregar item a la tabla",
      data: null,
    };
  }
};

const obtenerMisTablas = async (cobradorId, filtros = {}) => {
  try {
    if (!cobradorId) {
      return {
        status: 400,
        msg: "ID del cobrador es requerido",
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

    if (cobrador.rol !== "cobrador") {
      return {
        status: 403,
        msg: "El usuario no tiene permisos de cobrador",
        data: null,
      };
    }

    let query = { _id: { $in: cobrador.tablas } };

    if (filtros.estado) {
      query.estado = filtros.estado;
    }

    if (filtros.fechaDesde || filtros.fechaHasta) {
      query.fecha = {};
      if (filtros.fechaDesde) {
        query.fecha.$gte = new Date(filtros.fechaDesde);
      }
      if (filtros.fechaHasta) {
        query.fecha.$lte = new Date(filtros.fechaHasta);
      }
    }

    const tablas = await TablaCobroModel.find(query)
      .populate("cobrador", "nombre")
      .populate("listaTabla.zona", "nombre")
      .populate("listaTabla.cliente", "nombre dni telefono")
      .populate("listaTabla.prestamo", "montoInicial estado")
  .sort({ fecha: -1 });

    const estadisticas = {
      totalTablas: tablas.length,
      tablasPendientes: tablas.filter((t) => t.estado === "pendiente").length,
      tablasEnviadas: tablas.filter((t) => t.estado === "enviado").length,
      totalCobradoGeneral: tablas.reduce(
        (sum, tabla) => sum + tabla.totalCobrado,
        0
      ),
      totalItemsGeneral: tablas.reduce(
        (sum, tabla) => sum + tabla.cantidadCobros,
        0
      ),
    };
    return {
      status: 200,
      msg: "Tablas del cobrador obtenidas correctamente",
      data: {
        tablas,
        estadisticas: {
          ...estadisticas,
          totalCobradoGeneral: parseFloat(
            estadisticas.totalCobradoGeneral.toFixed(2)
          ),
        },
      },
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      msg: "Error interno al obtener tablas del cobrador",
      data: null,
    };
  }
};
const obtenerTablaPorIDBD = async (tablaId, cobradorId) => {
  try {
    if (!tablaId) {
      return {
        status: 400,
        msg: "ID de la tabla es requerido",
        data: null,
      };
    }

    const tabla = await TablaCobroModel.findById(tablaId)
      .populate("cobrador", "nombre")
      .populate("listaTabla.zona", "nombre")
      .populate("listaTabla.cliente", "nombre dni telefono")
      .populate(
        "listaTabla.prestamo",
        "montoInicial montoTotal estado planDeCuotas"
      );

    if (!tabla) {
      return {
        status: 404,
        msg: "Tabla de cobros no encontrada",
        data: null,
      };
    }

    return {
      status: 200,
      msg: "Tabla de cobros obtenida correctamente",
      data: tabla,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      msg: "Error interno al obtener tabla de cobros",
      data: null,
    };
  }
};

const editarTablaCobro = async (tablaId, body, cobradorId) => {
  try {
    if (!tablaId) {
      return {
        status: 400,
        msg: "ID de la tabla es requerido",
        data: null,
      };
    }

    const datosActualizacion = { ...body };
    if (datosActualizacion.fecha) {
      const [year, month, day] = datosActualizacion.fecha
        .split("-")
        .map(Number);
  datosActualizacion.fecha = new Date(year, month - 1, day);
    }

    const tabla = await TablaCobroModel.findByIdAndUpdate(
      tablaId,
      datosActualizacion
    );
    if (!tabla) {
      return {
        status: 404,
        msg: "Tabla de cobros no encontrada",
        data: null,
      };
    }

    if (tabla.cobrador.toString() !== cobradorId) {
      return {
        status: 403,
        msg: "No tienes permisos para editar esta tabla",
        data: null,
      };
    }

    if (tabla.estado !== "pendiente") {
      return {
        status: 400,
        msg: "No se puede editar una tabla que ya fue enviada",
        data: null,
      };
    }
    return {
      msg: "Tabla actualizada correctamente",
      status: 200,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      msg: "Error interno al editar tabla de cobros",
      data: null,
    };
  }
};

const editarItemTablaCobro = async (tablaId, itemId, datosItem, cobradorId) => {
  try {
    if (!tablaId || !itemId) {
      return {
        status: 400,
        msg: "ID de tabla e ID de item son requeridos",
        data: null,
      };
    }

    const tabla = await TablaCobroModel.findById(tablaId);
    if (!tabla) {
      return {
        status: 404,
        msg: "Tabla de cobros no encontrada",
        data: null,
      };
    }

    if (tabla.cobrador.toString() !== cobradorId) {
      return {
        status: 403,
        msg: "No tienes permisos para editar esta tabla",
        data: null,
      };
    }

    if (tabla.estado !== "pendiente") {
      return {
        status: 400,
        msg: "No se puede editar una tabla que ya fue enviada",
        data: null,
      };
    }

    const itemIndex = tabla.listaTabla.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex === -1) {
      return {
        status: 404,
        msg: "Item no encontrado en la tabla",
        data: null,
      };
    }

    const item = tabla.listaTabla[itemIndex];
    const { zona, cliente, prestamo, cuotaNumero, monto, horaPago, fechaPago } =
      datosItem;

    if (prestamo && prestamo !== item.prestamo.toString()) {
      const prestamoExiste = await PrestamoModel.findById(prestamo);
      if (!prestamoExiste) {
        return {
          status: 404,
          msg: "Préstamo no encontrado",
          data: null,
        };
      }

      if (cuotaNumero) {
        const cuota = prestamoExiste.planDeCuotas.find(
          (c) => c.numero === parseInt(cuotaNumero)
        );
        if (!cuota) {
          return {
            status: 404,
            msg: "Cuota no encontrada en el préstamo",
            data: null,
          };
        }

        if (cuota.pagado) {
          return {
            status: 400,
            msg: "Esta cuota ya está pagada",
            data: null,
          };
        }

        const itemDuplicado = tabla.listaTabla.find(
          (otroItem, index) =>
            index !== itemIndex &&
            otroItem.prestamo.toString() === prestamo &&
            otroItem.cuota.toString() === cuota._id.toString()
        );

        if (itemDuplicado) {
          return {
            status: 400,
            msg: "Esta cuota ya está en la tabla de cobros",
            data: null,
          };
        }

        item.cuota = cuota._id;
      }
      item.prestamo = prestamo;
    } else if (cuotaNumero) {
      const prestamoId = prestamo || item.prestamo;
      const prestamoActual = await PrestamoModel.findById(prestamoId);
      if (prestamoActual) {
        const cuota = prestamoActual.planDeCuotas.find(
          (c) => c.numero === parseInt(cuotaNumero)
        );
        if (!cuota) {
          return {
            status: 404,
            msg: "Cuota no encontrada en el préstamo",
            data: null,
          };
        }

        if (cuota.pagado) {
          return {
            status: 400,
            msg: "Esta cuota ya está pagada",
            data: null,
          };
        }

        const itemDuplicado = tabla.listaTabla.find(
          (otroItem, index) =>
            index !== itemIndex &&
            otroItem.prestamo.toString() === prestamoId.toString() &&
            otroItem.cuota.toString() === cuota._id.toString()
        );

        if (itemDuplicado) {
          return {
            status: 400,
            msg: "Esta cuota ya está en la tabla de cobros",
            data: null,
          };
        }

        item.cuota = cuota._id;
        if (prestamo && prestamo !== item.prestamo.toString()) {
          item.prestamo = prestamo;
        }
      }
    }

    if (zona !== undefined) item.zona = zona || null;
    if (cliente) item.cliente = cliente;
    if (monto !== undefined) item.monto = parseFloat(monto);
    if (horaPago !== undefined) item.horaPago = horaPago;
    if (fechaPago !== undefined)
      item.fechaPago = fechaPago ? new Date(fechaPago) : null;

    await tabla.save();

    const tablaActualizada = await TablaCobroModel.findById(tablaId)
      .populate("cobrador", "nombre")
      .populate("listaTabla.zona", "nombre")
      .populate("listaTabla.cliente", "nombre dni telefono")
      .populate("listaTabla.prestamo", "montoInicial estado");

    return {
      status: 200,
      msg: "Item actualizado correctamente",
      data: tablaActualizada,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      msg: "Error interno al editar item de la tabla",
      data: null,
    };
  }
};

const eliminarItemTablaCobro = async (tablaId, itemId, cobradorId) => {
  try {
    if (!tablaId || !itemId) {
      return {
        status: 400,
        msg: "ID de tabla e ID de item son requeridos",
        data: null,
      };
    }

    const tabla = await TablaCobroModel.findById(tablaId);
    if (!tabla) {
      return {
        status: 404,
        msg: "Tabla de cobros no encontrada",
        data: null,
      };
    }

    if (tabla.cobrador.toString() !== cobradorId) {
      return {
        status: 403,
        msg: "No tienes permisos para editar esta tabla",
        data: null,
      };
    }

    if (tabla.estado !== "pendiente") {
      return {
        status: 400,
        msg: "No se puede editar una tabla que ya fue enviada",
        data: null,
      };
    }

    const itemIndex = tabla.listaTabla.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex === -1) {
      return {
        status: 404,
        msg: "Item no encontrado en la tabla",
        data: null,
      };
    }

    tabla.listaTabla.splice(itemIndex, 1);
  await tabla.save();

    const tablaActualizada = await TablaCobroModel.findById(tablaId)
      .populate("cobrador", "nombre")
      .populate("listaTabla.zona", "nombre")
      .populate("listaTabla.cliente", "nombre dni telefono")
      .populate("listaTabla.prestamo", "montoInicial estado");

    return {
      status: 200,
      msg: "Item eliminado correctamente",
      data: tablaActualizada,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      msg: "Error interno al eliminar item de la tabla",
      data: null,
    };
  }
};

const eliminarTablaCobro = async (tablaId, cobradorId) => {
  try {
    if (!tablaId) {
      return {
        status: 400,
        msg: "ID de la tabla es requerido",
        data: null,
      };
    }

    const tabla = await TablaCobroModel.findById(tablaId);
    if (!tabla) {
      return {
        status: 404,
        msg: "Tabla de cobros no encontrada",
        data: null,
      };
    }

    if (tabla.cobrador.toString() !== cobradorId) {
      return {
        status: 403,
        msg: "No tienes permisos para eliminar esta tabla",
        data: null,
      };
    }

    if (tabla.estado !== "pendiente") {
      return {
        status: 400,
        msg: "No se puede eliminar una tabla que ya fue enviada",
        data: null,
      };
    }

    const cobrador = await UsuarioModel.findById(cobradorId);
    if (cobrador) {
      if (!cobrador.tablas || !Array.isArray(cobrador.tablas)) {
        cobrador.tablas = [];
      }
      cobrador.tablas = cobrador.tablas.filter(
        (tablaIdRef) => tablaIdRef.toString() !== tablaId
      );
      await cobrador.save();
    }

    await TablaCobroModel.findByIdAndDelete(tablaId);

    return {
      status: 200,
      msg: "Tabla de cobros eliminada correctamente",
      data: { tablaEliminada: tablaId },
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      msg: "Error interno al eliminar tabla de cobros",
      data: null,
    };
  }
};

const enviarTablaCobro = async (tablaId, cobradorId, body) => {
  try {
    if (!tablaId) {
      return {
        status: 400,
        msg: "ID de la tabla es requerido",
        data: null,
      };
    }

    const tabla = await TablaCobroModel.findById(tablaId);
    if (!tabla) {
      return {
        status: 404,
        msg: "Tabla de cobros no encontrada",
        data: null,
      };
    }

    if (tabla.cobrador.toString() !== cobradorId) {
      return {
        status: 403,
        msg: "No tienes permisos para enviar esta tabla",
        data: null,
      };
    }

    if (tabla.estado !== "pendiente") {
      return {
        status: 400,
        msg: "Solo se pueden enviar tablas en estado pendiente",
        data: null,
      };
    }

    if (!tabla.listaTabla || tabla.listaTabla.length === 0) {
      return {
        status: 400,
        msg: "No se puede enviar una tabla vacía",
        data: null,
      };
    }

    tabla.estado = "enviado";
    tabla.fechaEnvio = new Date();
    if (body && body.observaciones !== undefined) {
      tabla.observaciones = body.observaciones;
    }

    await tabla.save();

    const tablaActualizada = await TablaCobroModel.findById(tablaId)
      .populate("cobrador", "nombre")
      .populate("listaTabla.zona", "nombre")
      .populate("listaTabla.cliente", "nombre dni telefono")
      .populate("listaTabla.prestamo", "montoInicial estado");

    return {
      status: 200,
      msg: "Tabla enviada correctamente al administrador",
      data: tablaActualizada,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      msg: "Error interno al enviar tabla de cobros",
      data: null,
    };
  }
};

const procesarCargaMasiva = async (cobradorId, tablaId, listaCobros) => {
  try {
    if (
      !cobradorId ||
      !tablaId ||
      !listaCobros ||
      !Array.isArray(listaCobros)
    ) {
      return {
        status: 400,
        msg: "Faltan campos obligatorios: cobradorId, tablaId, listaCobros (array)",
        data: null,
      };
    }

    const cobrador = await UsuarioModel.findById(cobradorId);
    if (!cobrador || cobrador.rol !== "cobrador") {
      return {
        status: 403,
        msg: "Solo los cobradores pueden procesar carga masiva",
        data: null,
      };
    }

    const tabla = await TablaCobroModel.findById(tablaId);
    if (!tabla) {
      return {
        status: 404,
        msg: "Tabla de cobros no encontrada",
        data: null,
      };
    }

    if (tabla.cobrador.toString() !== cobradorId) {
      return {
        status: 403,
        msg: "No tienes permisos para editar esta tabla",
        data: null,
      };
    }

    if (tabla.estado !== "pendiente") {
      return {
        status: 400,
        msg: "No se puede editar una tabla que ya fue enviada",
        data: null,
      };
    }

    if (listaCobros.length === 0) {
      return {
        status: 400,
        msg: "La lista de cobros no puede estar vacía",
        data: null,
      };
    }

    for (let i = 0; i < listaCobros.length; i++) {
      const cobro = listaCobros[i];
      if (!cobro.prestamoId || !cobro.monto) {
        return {
          status: 400,
          msg: `Item ${i + 1}: prestamoId y monto son requeridos`,
          data: null,
        };
      }

      if (isNaN(parseFloat(cobro.monto)) || parseFloat(cobro.monto) <= 0) {
        return {
          status: 400,
          msg: `Item ${i + 1}: el monto debe ser un número positivo`,
          data: null,
        };
      }
    }

    let itemsAgregados = [];
    let itemsOmitidos = [];
    let errores = [];

    for (let i = 0; i < listaCobros.length; i++) {
      const cobro = listaCobros[i];
      const { prestamoId, monto, fechaPago, horaPago } = cobro;

      try {
        const prestamo = await PrestamoModel.findById(prestamoId).populate(
          "cliente",
          "nombre dni telefono zona"
        );

        if (!prestamo) {
          errores.push(`Item ${i + 1}: Préstamo no encontrado`);
          continue;
        }

        if (prestamo.saldoPendiente <= 0) {
          itemsOmitidos.push({
            prestamo: prestamo.numero,
            cliente: prestamo.cliente.nombre,
            razon: "Sin saldo pendiente",
          });
          continue;
        }

        const yaExiste = tabla.listaTabla.find(
          (item) => item.prestamo.toString() === prestamoId
        );

        if (yaExiste) {
          itemsOmitidos.push({
            prestamo: prestamo.numero,
            cliente: prestamo.cliente.nombre,
            razon: "Ya está en la tabla",
          });
          continue;
        }

        const cuotaPendiente = prestamo.planDeCuotas.find(
          (cuota) => cuota.estado !== "completo"
        );

        if (!cuotaPendiente) {
          itemsOmitidos.push({
            prestamo: prestamo.numero,
            cliente: prestamo.cliente.nombre,
            razon: "Todas las cuotas están completas",
          });
          continue;
        }

        const nuevoItem = {
          zona: prestamo.cliente.zona,
          cliente: prestamo.cliente._id,
          prestamo: prestamo._id,
          cuota: cuotaPendiente._id,
          monto: parseFloat(monto),
          fechaPago: fechaPago ? new Date(fechaPago) : null,
          horaPago: horaPago || "00:00",
          estado: false,
        };

        tabla.listaTabla.push(nuevoItem);

        itemsAgregados.push({
          prestamo: prestamo.numero,
          cliente: prestamo.cliente.nombre,
          monto: parseFloat(monto),
        });
      } catch (itemError) {
        console.error(`Error procesando item ${i + 1}:`, itemError);
        errores.push(`Item ${i + 1}: Error interno al procesar`);
      }
    }

    await tabla.save();

    const tablaActualizada = await TablaCobroModel.findById(tablaId)
      .populate("cobrador", "nombre")
      .populate("listaTabla.zona", "nombre")
      .populate("listaTabla.cliente", "nombre dni telefono")
      .populate(
        "listaTabla.prestamo",
        "numero montoInicial saldoPendiente estado"
      );

    return {
      status: 200,
      msg: "Carga masiva procesada correctamente",
      data: {
        tabla: tablaActualizada,
        resumen: {
          totalProcesados: listaCobros.length,
          itemsAgregados: itemsAgregados.length,
          itemsOmitidos: itemsOmitidos.length,
          errores: errores.length,
        },
        detalles: {
          agregados: itemsAgregados,
          omitidos: itemsOmitidos,
          errores: errores,
        },
      },
    };
  } catch (error) {
    console.error("Error en carga masiva:", error);
    return {
      status: 500,
      msg: "Error interno al procesar carga masiva",
      data: null,
    };
  }
};

module.exports = {
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
};
