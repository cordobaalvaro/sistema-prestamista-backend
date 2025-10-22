const PrestamoModel = require("../models/prestamo.model");
const TablaCobroModel = require("../models/TablaCobro.model");
const UsuarioModel = require("../models/usuario.model");
const { crearNotificacion } = require("./notificaciones.services");

const procesarCobroBD = async (
  prestamoId,
  monto,
  adminId,
  fechaPago = null,
  tablaId = null
) => {
  try {
    if (!prestamoId || !monto || !adminId) {
      return {
        status: 400,
        msg: "Faltan campos obligatorios: prestamoId, monto, adminId",
        data: null,
      };
    }

    const admin = await UsuarioModel.findById(adminId);
    if (!admin || admin.rol !== "admin") {
      return {
        status: 403,
        msg: "Solo los administradores pueden procesar cobros",
        data: null,
      };
    }

    const prestamo = await PrestamoModel.findById(prestamoId).populate(
      "cliente",
      "nombre dni"
    );
    if (!prestamo) {
      return {
        status: 404,
        msg: "Préstamo no encontrado",
        data: null,
      };
    }

    const montoNumerico = parseFloat(monto);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      return {
        status: 400,
        msg: "El monto debe ser un número positivo",
        data: null,
      };
    }

    let cuotasAfectadas = [];
    let montoRestante = montoNumerico;
    let cuotaPrincipal = null;
    for (const cuota of prestamo.planDeCuotas) {
      if (cuota.estado === "completo") continue;
      if (!cuotaPrincipal) cuotaPrincipal = cuota;
      const totalCobrado = cuota.pagado || 0;
      const montoFaltante = cuota.monto - totalCobrado;
      if (montoFaltante > 0) {
        const montoParaEstaCuota = Math.min(montoRestante, montoFaltante);
        cuota.pagado = totalCobrado + montoParaEstaCuota;
        const estadoAnterior = cuota.estado;
        if (cuota.pagado >= cuota.monto) {
          cuota.estado = "completo";
        } else {
          cuota.estado = "cobrado";
        }
        cuotasAfectadas.push({
          numero: cuota.numero,
          montoCobrado: montoParaEstaCuota,
          estadoAnterior,
          estadoNuevo: cuota.estado,
        });
        montoRestante -= montoParaEstaCuota;
        if (montoRestante <= 0) break;
      }
    }

    prestamo.saldoPendiente = Math.max(
      0,
      prestamo.saldoPendiente - montoNumerico
    );

    const todasLasCuotasCompletas = prestamo.planDeCuotas.every(
      (c) => c.estado === "completo"
    );
    let prestamoCancelado = false;
    if (todasLasCuotasCompletas) {
      prestamo.estado = "cancelado";
      prestamoCancelado = true;
    }

    if (tablaId) {
      try {
        const tablaItem = await TablaCobroModel.findById(tablaId);
        if (tablaItem) {
          const itemTabla = tablaItem.listaTabla.find(
            (item) => item.prestamo.toString() === prestamoId.toString()
          );
          if (itemTabla) {
            itemTabla.estado = true;
            await tablaItem.save();
          }
        }
      } catch (tablaError) {
        console.error("Error al actualizar tabla de cobro:", tablaError);
      }
    }

    const fechaRegistro = fechaPago ? new Date(fechaPago) : new Date();

    const registroCobro = {
      monto: montoNumerico,
      fechaPago: fechaRegistro,
    };
    prestamo.registroCobros.push(registroCobro);

    await prestamo.save();

    if (prestamoCancelado) {
      try {
        await crearNotificacion({
          tipo: "prestamo_cancelado",
          mensaje: `El préstamo #${prestamo.numero || prestamo._id} (${
            prestamo.nombre || ""
          }) ha sido cancelado (pagado completamente).`,
          prestamo: prestamo._id,
          cliente: prestamo.cliente?._id || prestamo.cliente,
          metadata: {
            prestamoId: prestamo._id,
            clienteId: prestamo.cliente?._id || prestamo.cliente,
            nombrePrestamo: prestamo.nombre,
            numeroPrestamo: prestamo.numero,
          },
        });
      } catch (notifErr) {
        console.error(
          "Error al crear notificación de préstamo cancelado:",
          notifErr
        );
      }
    }

    return {
      status: 200,
      msg: "Cobro procesado correctamente",
      data: {
        prestamo: {
          _id: prestamo._id,
          cliente: prestamo.cliente,
          montoInicial: prestamo.montoInicial,
          saldoPendiente: prestamo.saldoPendiente,
          estado: prestamo.estado,
        },
        cuotaPrincipal: cuotaPrincipal
          ? {
              numero: cuotaPrincipal.numero,
              monto: cuotaPrincipal.monto,
              totalCobrado: cuotaPrincipal.pagado,
              estado: cuotaPrincipal.estado,
            }
          : null,
        cuotasAfectadas,
        resumen: {
          montoTotalProcesado: montoNumerico,
          nuevoSaldoPendiente: prestamo.saldoPendiente,
          prestamoCompletado: todasLasCuotasCompletas,
          cuotasCompletadas: cuotasAfectadas.filter(
            (c) => c.estadoNuevo === "completo"
          ).length,
          montoSobrante: montoRestante,
        },
      },
    };
  } catch (error) {
    console.error("Error al procesar cobro:", error);
    return {
      status: 500,
      msg: "Error interno al procesar el cobro",
      data: null,
    };
  }
};

const eliminarCobroBD = async (prestamoId, cobroId) => {
  try {
    if (!prestamoId || !cobroId) {
      return {
        status: 400,
        msg: "PrestamoId y cobroId son requeridos",
        data: null,
      };
    }

    const prestamo = await PrestamoModel.findById(prestamoId);
    if (!prestamo) {
      return {
        status: 404,
        msg: "Préstamo no encontrado",
        data: null,
      };
    }

    let cobroEncontrado = null;
    let cuotaPadre = null;

    for (const cuota of prestamo.planDeCuotas) {
      const cobro = cuota.cobros.id(cobroId);
      if (cobro) {
        cobroEncontrado = cobro;
        cuotaPadre = cuota;
        break;
      }
    }

    if (!cobroEncontrado) {
      return {
        status: 404,
        msg: "Cobro no encontrado en el préstamo",
        data: null,
      };
    }

    const montoCobro = cobroEncontrado.cobro || 0;

    cobroEncontrado.deleteOne();

    const totalCobradoCuota = cuotaPadre.cobros.reduce(
      (sum, cobro) => sum + (cobro.cobro || 0),
      0
    );

    if (totalCobradoCuota >= cuotaPadre.monto) {
      cuotaPadre.estado = "completo";
    } else if (totalCobradoCuota > 0) {
      cuotaPadre.estado = "cobrado";
    } else {
      cuotaPadre.estado = "pendiente";
    }

    const totalCobradoPrestamo = prestamo.planDeCuotas.reduce((sum, cuota) => {
      return (
        sum +
        cuota.cobros.reduce(
          (sumCobros, cobro) => sumCobros + (cobro.cobro || 0),
          0
        )
      );
    }, 0);

    prestamo.saldoPendiente = Math.max(
      0,
      prestamo.montoTotal - totalCobradoPrestamo
    );

    const todasLasCuotasCompletas = prestamo.planDeCuotas.every(
      (c) => c.estado === "completo"
    );

    if (todasLasCuotasCompletas) {
      prestamo.estado = "cancelado";
    } else {
      prestamo.estado = "activo";
    }

    await prestamo.save();

    return {
      status: 200,
      msg: "Cobro eliminado correctamente",
      data: {
        montoEliminado: montoCobro,
        saldoPendiente: prestamo.saldoPendiente,
        cuota: cuotaPadre.numero,
        estadoCuota: cuotaPadre.estado,
        estadoPrestamo: prestamo.estado,
      },
    };
  } catch (error) {
    console.error("Error al eliminar cobro:", error);
    return {
      status: 500,
      msg: "Error interno al eliminar el cobro",
      data: null,
    };
  }
};

const editarRegistroCobroBD = async (
  prestamoId,
  registroId,
  monto,
  fecha,
  horaPago,
  cuota
) => {
  try {
    if (!prestamoId || !registroId) {
      return {
        status: 400,
        msg: "PrestamoId y registroId son requeridos",
        data: null,
      };
    }

    const prestamo = await PrestamoModel.findById(prestamoId);
    if (!prestamo) {
      return {
        status: 404,
        msg: "Préstamo no encontrado",
        data: null,
      };
    }

    const registroEncontrado = prestamo.registroCobros.id(registroId);
    if (!registroEncontrado) {
      return {
        status: 404,
        msg: "Registro de cobro no encontrado",
        data: null,
      };
    }

    prestamo.planDeCuotas.forEach((cuota) => {
      cuota.pagado = 0;
      cuota.estado = "pendiente";
    });

    if (monto !== undefined) registroEncontrado.monto = parseFloat(monto);
    if (fecha !== undefined) registroEncontrado.fechaPago = new Date(fecha);
    if (horaPago !== undefined) registroEncontrado.horaPago = horaPago;
    if (cuota !== undefined) registroEncontrado.cuota = parseInt(cuota);

    const registrosOrdenados = prestamo.registroCobros
      .toObject()
      .sort((a, b) => new Date(a.fechaPago) - new Date(b.fechaPago));

    for (const reg of registrosOrdenados) {
      let montoRestante = reg.monto;
      for (const cuota of prestamo.planDeCuotas) {
        if (cuota.estado === "completo") continue;
        const faltante = cuota.monto - cuota.pagado;
        if (faltante <= 0) continue;
        const aplicar = Math.min(montoRestante, faltante);
        cuota.pagado += aplicar;
        if (cuota.pagado >= cuota.monto) {
          cuota.estado = "completo";
        } else if (cuota.pagado > 0) {
          cuota.estado = "cobrado";
        }
        montoRestante -= aplicar;
        if (montoRestante <= 0) break;
      }
    }

    const totalPagado = prestamo.planDeCuotas.reduce(
      (sum, c) => sum + (c.pagado || 0),
      0
    );
    prestamo.saldoPendiente = Math.max(0, prestamo.montoTotal - totalPagado);
    const todasCompletas = prestamo.planDeCuotas.every(
      (c) => c.estado === "completo"
    );
    if (todasCompletas) {
      prestamo.estado = "cancelado";
    } else if (prestamo.saldoPendiente < prestamo.montoTotal) {
      prestamo.estado = "activo";
    } else {
      prestamo.estado = "pendiente";
    }

    await prestamo.save();

    return {
      status: 200,
      msg: "Registro de cobro actualizado y cuotas recalculadas correctamente",
      data: {
        registro: registroEncontrado,
        prestamo: prestamoId,
        cuotas: prestamo.planDeCuotas,
        saldoPendiente: prestamo.saldoPendiente,
        estadoPrestamo: prestamo.estado,
      },
    };
  } catch (error) {
    console.error("Error al editar registro de cobro:", error);
    return {
      status: 500,
      msg: "Error interno al editar el registro de cobro",
      data: null,
    };
  }
};

const eliminarRegistroCobroBD = async (prestamoId, registroId) => {
  try {
    if (!prestamoId || !registroId) {
      return {
        status: 400,
        msg: "PrestamoId y registroId son requeridos",
        data: null,
      };
    }

    const prestamo = await PrestamoModel.findById(prestamoId);
    if (!prestamo) {
      return {
        status: 404,
        msg: "Préstamo no encontrado",
        data: null,
      };
    }

    const registroEncontrado = prestamo.registroCobros.id(registroId);
    if (!registroEncontrado) {
      return {
        status: 404,
        msg: "Registro de cobro no encontrado",
        data: null,
      };
    }

    const montoEliminado = registroEncontrado.monto;

    registroEncontrado.deleteOne();

    prestamo.planDeCuotas.forEach((cuota) => {
      cuota.pagado = 0;
      cuota.estado = "pendiente";
    });

    registroEncontrado.deleteOne();

    const registrosOrdenados = prestamo.registroCobros
      .toObject()
      .sort((a, b) => new Date(a.fechaPago) - new Date(b.fechaPago));

    for (const reg of registrosOrdenados) {
      let montoRestante = reg.monto;
      for (const cuota of prestamo.planDeCuotas) {
        if (cuota.estado === "completo") continue;
        const faltante = cuota.monto - cuota.pagado;
        if (faltante <= 0) continue;
        const aplicar = Math.min(montoRestante, faltante);
        cuota.pagado += aplicar;
        if (cuota.pagado >= cuota.monto) {
          cuota.estado = "completo";
        } else if (cuota.pagado > 0) {
          cuota.estado = "cobrado";
        }
        montoRestante -= aplicar;
        if (montoRestante <= 0) break;
      }
    }

    const totalPagado = prestamo.planDeCuotas.reduce(
      (sum, c) => sum + (c.pagado || 0),
      0
    );
    prestamo.saldoPendiente = Math.max(0, prestamo.montoTotal - totalPagado);
    const todasCompletas = prestamo.planDeCuotas.every(
      (c) => c.estado === "completo"
    );
    if (todasCompletas) {
      prestamo.estado = "cancelado";
    } else if (prestamo.saldoPendiente < prestamo.montoTotal) {
      prestamo.estado = "activo";
    }

    await prestamo.save();

    return {
      status: 200,
      msg: "Registro de cobro eliminado y cuotas recalculadas correctamente",
      data: {
        montoEliminado: montoEliminado,
        prestamo: prestamoId,
        cuotas: prestamo.planDeCuotas,
        saldoPendiente: prestamo.saldoPendiente,
        estadoPrestamo: prestamo.estado,
      },
    };
  } catch (error) {
    console.error("Error al eliminar registro de cobro:", error);
    return {
      status: 500,
      msg: "Error interno al eliminar el registro de cobro",
      data: null,
    };
  }
};

const obtenerTablasEnviadas = async (adminId, filtros = {}) => {
  try {
    if (!adminId) {
      return {
        status: 400,
        msg: "ID del administrador es requerido",
        data: null,
      };
    }

    const admin = await UsuarioModel.findById(adminId);
    if (!admin || admin.rol !== "admin") {
      return {
        status: 403,
        msg: "Solo los administradores pueden ver las tablas enviadas",
        data: null,
      };
    }

    let query = { estado: { $in: ["enviado", "visto"] } };

    if (filtros.cobrador) {
      query.cobrador = filtros.cobrador;
    }

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

    if (filtros.fechaEnvioDesde || filtros.fechaEnvioHasta) {
      query.fechaEnvio = {};
      if (filtros.fechaEnvioDesde) {
        query.fechaEnvio.$gte = new Date(filtros.fechaEnvioDesde);
      }
      if (filtros.fechaEnvioHasta) {
        query.fechaEnvio.$lte = new Date(filtros.fechaEnvioHasta);
      }
    }

    const tablas = await TablaCobroModel.find(query)
      .populate("cobrador", "nombre email")
      .populate("listaTabla.zona", "nombre")
      .populate("listaTabla.cliente", "nombre dni telefono")
      .populate("listaTabla.prestamo", "montoInicial estado")
      .sort({ fechaEnvio: -1 });

    const estadisticas = {
      totalTablasEnviadas: tablas.length,
      totalCobradoGeneral: tablas.reduce(
        (sum, tabla) => sum + tabla.totalCobrado,
        0
      ),
      totalItemsGeneral: tablas.reduce(
        (sum, tabla) => sum + tabla.cantidadCobros,
        0
      ),
      cobradoresDiferentes: new Set(
        tablas.map((t) => t.cobrador._id.toString())
      ).size,
    };

    const estadisticasPorCobrador = tablas.reduce((acc, tabla) => {
      const cobradorId = tabla.cobrador._id.toString();
      const cobradorNombre = tabla.cobrador.nombre;

      if (!acc[cobradorId]) {
        acc[cobradorId] = {
          cobrador: { _id: cobradorId, nombre: cobradorNombre },
          totalTablas: 0,
          totalCobrado: 0,
          totalItems: 0,
        };
      }

      acc[cobradorId].totalTablas++;
      acc[cobradorId].totalCobrado += tabla.totalCobrado;
      acc[cobradorId].totalItems += tabla.cantidadCobros;

      return acc;
    }, {});

    return {
      status: 200,
      msg: "Tablas enviadas obtenidas correctamente",
      data: {
        tablas,
        estadisticas: {
          ...estadisticas,
          totalCobradoGeneral: parseFloat(
            estadisticas.totalCobradoGeneral.toFixed(2)
          ),
        },
        estadisticasPorCobrador: Object.values(estadisticasPorCobrador).map(
          (stat) => ({
            ...stat,
            totalCobrado: parseFloat(stat.totalCobrado.toFixed(2)),
          })
        ),
      },
    };
  } catch (error) {
    console.error("Error al obtener tablas enviadas:", error);
    return {
      status: 500,
      msg: "Error interno al obtener tablas enviadas",
      data: null,
    };
  }
};

const editarTablaCobroAdmin = async (tablaId, body, adminId) => {
  try {
    if (!tablaId) {
      return {
        status: 400,
        msg: "ID de la tabla es requerido",
        data: null,
      };
    }

    const admin = await UsuarioModel.findById(adminId);
    if (!admin || admin.rol !== "admin") {
      return {
        status: 403,
        msg: "Solo los administradores pueden editar tablas",
        data: null,
      };
    }

    const tabla = await TablaCobroModel.findByIdAndUpdate(tablaId, body, {
      new: true,
    });
    if (!tabla) {
      return {
        status: 404,
        msg: "Tabla de cobros no encontrada",
        data: null,
      };
    }

    return {
      status: 200,
      msg: "Tabla actualizada correctamente por administrador",
      data: tabla,
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

const editarItemTablaCobroAdmin = async (
  tablaId,
  itemId,
  datosItem,
  adminId
) => {
  try {
    if (!tablaId || !itemId) {
      return {
        status: 400,
        msg: "ID de tabla e ID de item son requeridos",
        data: null,
      };
    }

    const admin = await UsuarioModel.findById(adminId);
    if (!admin || admin.rol !== "admin") {
      return {
        status: 403,
        msg: "Solo los administradores pueden editar items de tablas",
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
      msg: "Item actualizado correctamente por administrador",
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

const eliminarItemTablaCobroAdmin = async (tablaId, itemId, adminId) => {
  try {
    if (!tablaId || !itemId) {
      return {
        status: 400,
        msg: "ID de tabla e ID de item son requeridos",
        data: null,
      };
    }

    const admin = await UsuarioModel.findById(adminId);
    if (!admin || admin.rol !== "admin") {
      return {
        status: 403,
        msg: "Solo los administradores pueden eliminar items de tablas",
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
      msg: "Item eliminado correctamente por administrador",
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

const eliminarTablaCobroAdmin = async (tablaId, adminId) => {
  try {
    if (!tablaId) {
      return {
        status: 400,
        msg: "ID de la tabla es requerido",
        data: null,
      };
    }

    const admin = await UsuarioModel.findById(adminId);
    if (!admin || admin.rol !== "admin") {
      return {
        status: 403,
        msg: "Solo los administradores pueden eliminar tablas",
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

    const cobrador = await UsuarioModel.findById(tabla.cobrador);
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
      msg: "Tabla de cobros eliminada correctamente por administrador",
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

const agregarItemTablaCobroAdmin = async (tablaId, itemData, adminId) => {
  try {
    const { zona, cliente, prestamo, cuotaNumero, monto, fechaPago, horaPago } =
      itemData;

    if (!tablaId || !cliente || !prestamo || !cuotaNumero || !monto) {
      return {
        status: 400,
        msg: "Faltan campos obligatorios: tablaId, cliente, prestamo, cuotaNumero, monto",
        data: null,
      };
    }

    const admin = await UsuarioModel.findById(adminId);
    if (!admin || admin.rol !== "admin") {
      return {
        status: 403,
        msg: "Solo los administradores pueden agregar items a tablas",
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

    const prestamoExiste = await PrestamoModel.findById(prestamo);
    if (!prestamoExiste) {
      return {
        status: 404,
        msg: "Préstamo no encontrado",
        data: null,
      };
    }

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

    const itemExistente = tabla.listaTabla.find(
      (item) =>
        item.prestamo.toString() === prestamo &&
        item.cuota.toString() === cuota._id.toString()
    );

    if (itemExistente) {
      return {
        status: 400,
        msg: "Esta cuota ya está en la tabla de cobros",
        data: null,
      };
    }

    const nuevoItem = {
      zona: zona || null,
      cliente,
      prestamo,
      cuota: cuota._id,
      monto: parseFloat(monto),
      fechaPago: fechaPago ? new Date(fechaPago) : null,
      horaPago: horaPago || "00:00",
    };

    tabla.listaTabla.push(nuevoItem);
  await tabla.save();

    const tablaActualizada = await TablaCobroModel.findById(tablaId)
      .populate("cobrador", "nombre")
      .populate("listaTabla.zona", "nombre")
      .populate("listaTabla.cliente", "nombre dni telefono")
      .populate("listaTabla.prestamo", "montoInicial estado");

    return {
      status: 200,
      msg: "Item agregado correctamente a la tabla por administrador",
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

const crearRegistroCobroBD = async (prestamoId, monto, fecha) => {
  try {
    if (!prestamoId || !monto) {
      return {
        status: 400,
        msg: "PrestamoId y monto son requeridos",
        data: null,
      };
    }

    const prestamo = await PrestamoModel.findById(prestamoId);
    if (!prestamo) {
      return {
        status: 404,
        msg: "Préstamo no encontrado",
        data: null,
      };
    }

    const montoNumerico = parseFloat(monto);
    if (montoNumerico <= 0) {
      return {
        status: 400,
        msg: "El monto debe ser mayor a 0",
        data: null,
      };
    }

    const fechaRegistro = fecha ? new Date(fecha) : new Date();

    const registroCobro = {
      monto: montoNumerico,
      fechaPago: fechaRegistro,
    };

    prestamo.registroCobros.push(registroCobro);

    let montoRestante = montoNumerico;
    let cuotasAfectadas = [];

    const cuotasPendientes = prestamo.planDeCuotas
      .filter((cuota) => cuota.estado !== "completo")
      .sort((a, b) => a.numero - b.numero);

    for (const cuota of cuotasPendientes) {
      if (montoRestante <= 0) break;

      const totalCobradoCuota = cuota.pagado || 0;
      const montoFaltante = cuota.monto - totalCobradoCuota;

      if (montoFaltante > 0) {
        const montoParaEstaCuota = Math.min(montoRestante, montoFaltante);

        cuota.pagado = totalCobradoCuota + montoParaEstaCuota;

        const nuevoTotalCuota = totalCobradoCuota + montoParaEstaCuota;
        const estadoAnterior = cuota.estado;
        if (nuevoTotalCuota >= cuota.monto) {
          cuota.estado = "completo";
        } else {
          cuota.estado = "cobrado";
        }

        cuotasAfectadas.push({
          numero: cuota.numero,
          montoCobrado: montoParaEstaCuota,
          estadoAnterior: estadoAnterior,
          estadoNuevo: cuota.estado,
        });

        montoRestante -= montoParaEstaCuota;
      }
    }

    prestamo.saldoPendiente = Math.max(
      0,
      prestamo.saldoPendiente - montoNumerico
    );

    const todasLasCuotasCompletas = prestamo.planDeCuotas.every(
      (c) => c.estado === "completo"
    );
    if (todasLasCuotasCompletas) {
      prestamo.estado = "cancelado";
    } else if (prestamo.saldoPendiente < prestamo.montoTotal) {
      prestamo.estado = "activo";
    }

    await prestamo.save();

    return {
      status: 200,
      msg: "Registro de cobro creado y aplicado correctamente",
      data: {
        registroCreado: registroCobro,
        prestamo: prestamoId,
        montoAplicado: montoNumerico,
        montoSobrante: montoRestante,
        saldoPendiente: prestamo.saldoPendiente,
        estadoPrestamo: prestamo.estado,
        cuotasAfectadas: cuotasAfectadas,
      },
    };
  } catch (error) {
    console.error("Error al crear registro de cobro:", error);
    return {
      status: 500,
      msg: "Error interno al crear el registro de cobro",
      data: null,
    };
  }
};

const marcarComoVistoTablaBD = async (tablaId) => {
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

    tabla.estado = "visto";
    await tabla.save();

    return {
      status: 200,
      msg: "Tabla marcada como vista correctamente",
      data: tabla,
    };
  } catch (error) {
    console.error("Error al marcar tabla como vista:", error);
    return {
      status: 500,
      msg: "Error interno al marcar tabla como vista",
      data: null,
    };
  }
};

module.exports = {
  procesarCobroBD,
  eliminarCobroBD,
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
};
