const PrestamoModel = require("../models/prestamo.model");
const ClienteModel = require("../models/cliente.model");
const { crearNotificacion } = require("./notificaciones.services");

const calcularInteresEquivalente = (
  montoInicial,
  montoCuotaPersonalizada,
  cantidadCuotas
) => {
  const totalCuotas = montoCuotaPersonalizada * cantidadCuotas;
  const interesEquivalente =
    ((totalCuotas - montoInicial) / montoInicial) * 100;
  return parseFloat(interesEquivalente.toFixed(2));
};

const calcularCuotas = (
  fechaInicio,
  cantidadCuotas,
  montoTotal,
  frecuencia,
  montoCuotaPersonalizada = null
) => {
  const cuotasArray = [];

  const montoCuota = montoCuotaPersonalizada
    ? parseFloat(montoCuotaPersonalizada.toFixed(2))
    : parseFloat((montoTotal / cantidadCuotas).toFixed(2));

  for (let i = 0; i < cantidadCuotas; i++) {
    const fecha = new Date(fechaInicio);

    if (frecuencia === "semanal") {
      fecha.setDate(fecha.getDate() + (i + 1) * 7);
    } else if (frecuencia === "quincenal") {
      fecha.setDate(fecha.getDate() + (i + 1) * 15);
    } else if (frecuencia === "mensual") {
      fecha.setMonth(fecha.getMonth() + (i + 1));
    } else {
      throw new Error(
        "Frecuencia inválida. Debe ser semanal, quincenal o mensual."
      );
    }

    cuotasArray.push({
      numero: i + 1,
      fechaVencimiento: fecha,
      monto: montoCuota,
      pagado: false,
    });
  }

  return cuotasArray;
};

const crearPrestamoBD = async (data) => {
  try {
    const {
      nombre,
      cliente,
      montoInicial,
      cantidadCuotas,
      interes,
      fechaInicio,
      fechaVencimiento,
      frecuencia,
  montoCuotaPersonalizada,
    } = data;

    if (!cliente || !montoInicial || !cantidadCuotas || !frecuencia) {
      return {
        status: 400,
        msg: "Faltan campos obligatorios",
        data: null,
      };
    }

    const clienteExiste = await ClienteModel.findById(cliente);
    if (!clienteExiste) {
      return {
        status: 404,
        msg: "Cliente no encontrado",
        data: null,
      };
    }

    let montoFinal;
    let interesCalculado;

    if (montoCuotaPersonalizada) {
      montoFinal = parseFloat(
        (montoCuotaPersonalizada * cantidadCuotas).toFixed(2)
      );

      interesCalculado = calcularInteresEquivalente(
        montoInicial,
        montoCuotaPersonalizada,
        cantidadCuotas
      );
    } else {
      interesCalculado = interes || 0;
      montoFinal = interesCalculado
        ? parseFloat((montoInicial * (1 + interesCalculado / 100)).toFixed(2))
        : montoInicial;
    }

    const planDeCuotas = calcularCuotas(
      fechaInicio || new Date(),
      cantidadCuotas,
      montoFinal,
      frecuencia,
      montoCuotaPersonalizada
    );

    const fechaVencimientoPrestamo =
      planDeCuotas[planDeCuotas.length - 1].fechaVencimiento;

    const nuevoPrestamo = new PrestamoModel({
      nombre,
      cliente,
      planDeCuotas,
      montoInicial,
  montoTotal: montoFinal,
      cantidadCuotas,
  interes: interesCalculado,
      frecuencia,
      interesSemanal: 0,
      estado: "activo",
      fechaInicio: fechaInicio || new Date(),
  fechaVencimiento: fechaVencimientoPrestamo,
  montoCuotaPersonalizada: montoCuotaPersonalizada || null,
    });

    const prestamoGuardado = await nuevoPrestamo.save();

    clienteExiste.prestamos.push(prestamoGuardado._id);
    await clienteExiste.save();

    return {
      status: 201,
      msg: montoCuotaPersonalizada
        ? `Préstamo creado con cuota personalizada de $${montoCuotaPersonalizada}. Interés calculado: ${interesCalculado}%`
        : "Préstamo creado correctamente",
      data: prestamoGuardado,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      msg: "Error interno al crear el préstamo",
      data: null,
    };
  }
};

const obtenerPrestamoPorIdBD = async (id) => {
  try {
    const prestamo = await PrestamoModel.findById(id).populate("cliente");
    if (!prestamo) {
      return {
        status: 404,
        msg: "Préstamo no encontrado",
        data: null,
      };
    }

    return {
      status: 200,
      msg: "Préstamo obtenido correctamente",
      data: prestamo,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al obtener el préstamo",
      data: null,
    };
  }
};
const actualizarPrestamos = async () => {
  try {
    const prestamosActivos = await PrestamoModel.find({
      estado: { $in: ["activo", "vencido"] },
    }).populate("cliente", "numero nombre");

    const hoy = new Date();

    for (const prestamo of prestamosActivos) {
      const cuotasPendientes = prestamo.planDeCuotas.filter(
        (cuota) => !cuota.pagado
      );

      if (cuotasPendientes.length === 0) {
        prestamo.estado = "cancelado";
        prestamo.interesSemanal = 0;
        prestamo.saldoPendiente = 0;
  prestamo.saldoPendienteVencimiento = undefined;
      } else {
        const ultimaCuotaPendiente = cuotasPendientes[0];

        if (hoy > ultimaCuotaPendiente.fechaVencimiento) {
          const msPorSemana = 7 * 24 * 60 * 60 * 1000;
          const semanasVencidas = Math.floor(
            (hoy - ultimaCuotaPendiente.fechaVencimiento) / msPorSemana
          );

          if (semanasVencidas > 0) {
            const semanasNuevas =
              semanasVencidas - (prestamo.semanasVencidas || 0);
            const eraActivo = prestamo.estado !== "vencido";
            prestamo.estado = "vencido";

            if (eraActivo && !prestamo.saldoPendienteVencimiento) {
              prestamo.saldoPendienteVencimiento = prestamo.saldoPendiente;
            }

            if (semanasNuevas > 0) {
              const baseSaldo =
                prestamo.saldoPendienteVencimiento ?? prestamo.saldoPendiente;
              const interesIncremental = baseSaldo * 0.05 * semanasNuevas;
              prestamo.interesSemanal = parseFloat(
                (prestamo.interesSemanal + interesIncremental).toFixed(2)
              );
              prestamo.saldoPendienteVencimiento = parseFloat(
                (
                  (prestamo.saldoPendienteVencimiento ??
                    prestamo.saldoPendiente) + interesIncremental
                ).toFixed(2)
              );

              const clienteNum = prestamo.cliente?.numero;
              const clienteNom = prestamo.cliente?.nombre;

              if (eraActivo && !prestamo.notificadoVencido) {
                await crearNotificacion({
                  tipo: "prestamo_vencido",
                  mensaje: `El préstamo #${prestamo.numero} (${
                    prestamo.nombre
                  }) del cliente #${clienteNum ?? "?"} - ${
                    clienteNom ?? "(sin nombre)"
                  } ha vencido. Semanas vencidas: ${semanasVencidas}.`,
                  prestamo: prestamo._id,
                  cliente: prestamo.cliente?._id || prestamo.cliente,
                  metadata: {
                    semanasVencidas,
                    clienteNumero: clienteNum,
                    clienteNombre: clienteNom,
                  },
                });
                prestamo.notificadoVencido = true;
              }

              await crearNotificacion({
                tipo: "interes_actualizado",
                mensaje: `Interés actualizado por mora en préstamo #${
                  prestamo.numero
                } del cliente #${clienteNum ?? "?"} - ${
                  clienteNom ?? "(sin nombre)"
                }: $${
                  prestamo.interesSemanal
                } (semanas vencidas: ${semanasVencidas}).`,
                prestamo: prestamo._id,
                cliente: prestamo.cliente?._id || prestamo.cliente,
                metadata: {
                  semanasVencidas,
                  interesSemanal: prestamo.interesSemanal,
                  clienteNumero: clienteNum,
                  clienteNombre: clienteNom,
                  semanasNuevas,
                },
              });
            }

            prestamo.semanasVencidas = semanasVencidas;
          }
        } else {
          prestamo.interesSemanal = 0;
          prestamo.estado = "activo";
          prestamo.semanasVencidas = 0;
          prestamo.saldoPendienteVencimiento = undefined;
        }
      }

      await prestamo.save();
    }

    console.log("✅ Prestamos actualizados con interés semanal y estado.");
  } catch (error) {
    console.error("❌ Error actualizando préstamos:", error);
  }
};

const eliminarPrestamoBD = async (id) => {
  try {
    const prestamo = await PrestamoModel.findById(id);
    if (!prestamo) {
      return {
        status: 404,
        msg: "Préstamo no encontrado",
        data: null,
      };
    }

    const cliente = await ClienteModel.findById(prestamo.cliente);
    if (cliente) {
      cliente.prestamos = cliente.prestamos.filter(
        (prestamoId) => prestamoId.toString() !== id
      );
      await cliente.save();
    }

    await PrestamoModel.findByIdAndDelete(id);

    return {
      status: 200,
      msg: "Préstamo eliminado correctamente",
      data: null,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      msg: "Error interno al eliminar el préstamo",
      data: null,
    };
  }
};

const actualizarPrestamoBD = async (id, datos) => {
  try {
    const prestamo = await PrestamoModel.findById(id);
    if (!prestamo) {
      return {
        status: 404,
        msg: "Préstamo no encontrado",
        data: null,
      };
    }

    if (
      datos.montoInicial ||
      datos.cantidadCuotas ||
      datos.interes !== undefined ||
      datos.frecuencia ||
      datos.fechaInicio ||
      datos.montoCuotaPersonalizada !== undefined
    ) {
      const montoInicial = datos.montoInicial || prestamo.montoInicial;
      const cantidadCuotas = datos.cantidadCuotas || prestamo.cantidadCuotas;
      const frecuencia = datos.frecuencia || prestamo.frecuencia;

      const fechaInicio = datos.fechaInicio || new Date();

      let montoFinal;
      let interesCalculado;

      if (datos.montoCuotaPersonalizada) {
        montoFinal = parseFloat(
          (datos.montoCuotaPersonalizada * cantidadCuotas).toFixed(2)
        );

        interesCalculado = calcularInteresEquivalente(
          montoInicial,
          datos.montoCuotaPersonalizada,
          cantidadCuotas
        );
      } else {
        interesCalculado =
          datos.interes !== undefined ? datos.interes : prestamo.interes;
        montoFinal = interesCalculado
          ? parseFloat((montoInicial * (1 + interesCalculado / 100)).toFixed(2))
          : montoInicial;
      }

      const totalCobrado = prestamo.planDeCuotas.reduce(
        (sum, cuota) => sum + (cuota.pagado || 0),
        0
      );

      const nuevoPlanDeCuotas = calcularCuotas(
        fechaInicio,
        cantidadCuotas,
        montoFinal,
        frecuencia,
        datos.montoCuotaPersonalizada
      );

      let montoRestante = totalCobrado;
      for (const cuota of nuevoPlanDeCuotas) {
        if (montoRestante <= 0) break;

        const montoParaEstaCuota = Math.min(montoRestante, cuota.monto);
        cuota.pagado = montoParaEstaCuota;

        if (montoParaEstaCuota >= cuota.monto) {
          cuota.estado = "completo";
        } else if (montoParaEstaCuota > 0) {
          cuota.estado = "cobrado";
        } else {
          cuota.estado = "pendiente";
        }

        montoRestante -= montoParaEstaCuota;
      }

      prestamo.montoInicial = montoInicial;
      prestamo.montoTotal = montoFinal;
      prestamo.cantidadCuotas = cantidadCuotas;
  prestamo.interes = interesCalculado;
      prestamo.frecuencia = frecuencia;
      prestamo.fechaInicio = fechaInicio;
      prestamo.planDeCuotas = nuevoPlanDeCuotas;
      prestamo.saldoPendiente = Math.max(0, montoFinal - totalCobrado);
      prestamo.montoCuotaPersonalizada = datos.montoCuotaPersonalizada || null;
      prestamo.fechaVencimiento =
        nuevoPlanDeCuotas[nuevoPlanDeCuotas.length - 1].fechaVencimiento;
    }

    Object.keys(datos).forEach((key) => {
      if (
        ![
          "montoInicial",
          "cantidadCuotas",
          "interes",
          "frecuencia",
          "fechaInicio",
          "fechaVencimiento",
          "montoCuotaPersonalizada",
        ].includes(key)
      ) {
        prestamo[key] = datos[key];
      }
    });

    const prestamoActualizado = await prestamo.save();

  await prestamoActualizado.populate("cliente");

    return {
      status: 200,
      msg: datos.montoCuotaPersonalizada
        ? `Préstamo actualizado con cuota personalizada de $${datos.montoCuotaPersonalizada}. Interés calculado: ${prestamo.interes}%`
        : "Préstamo actualizado correctamente",
      data: prestamoActualizado,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      msg: "Error interno al actualizar el préstamo",
      data: null,
    };
  }
};

const desactivarPrestamoBD = async (id) => {
  try {
    const prestamo = await PrestamoModel.findById(id);
    if (!prestamo) {
      return {
        status: 404,
        msg: "Préstamo no encontrado",
        data: null,
      };
    }

    prestamo.estado = "desactivado";

    const prestamoActualizado = await prestamo.save();

    return {
      status: 200,
      msg: "Préstamo desactivado correctamente",
      data: prestamoActualizado,
    };
  } catch (error) {
    console.error("Error al desactivar préstamo:", error);
    return {
      status: 500,
      msg: "Error interno al desactivar el préstamo",
      data: null,
    };
  }
};

const activarPrestamoBD = async (id) => {
  try {
    const prestamo = await PrestamoModel.findById(id);
    if (!prestamo) {
      return {
        status: 404,
        msg: "Préstamo no encontrado",
        data: null,
      };
    }

    if (prestamo.estado === "activo") {
      return {
        status: 400,
        msg: "El préstamo ya está activo",
        data: prestamo,
      };
    }

    if (prestamo.estado === "cancelado") {
      return {
        status: 400,
        msg: "No se puede activar un préstamo cancelado",
        data: null,
      };
    }

    prestamo.estado = "activo";

    const prestamoActualizado = await prestamo.save();

    return {
      status: 200,
      msg: "Préstamo activado correctamente",
      data: prestamoActualizado,
    };
  } catch (error) {
    console.error("Error al activar préstamo:", error);
    return {
      status: 500,
      msg: "Error interno al activar el préstamo",
      data: null,
    };
  }
};

const obtenerTodosLosPrestamosBD = async () => {
  try {
    const prestamos = await PrestamoModel.find()
      .populate("cliente", "nombre apellido dni telefono direccion")
  .sort({ fechaCreacion: -1 });

    return {
      status: 200,
      msg: "Préstamos obtenidos correctamente",
      data: prestamos,
    };
  } catch (error) {
    console.error("Error al obtener todos los préstamos:", error);
    return {
      status: 500,
      msg: "Error interno al obtener los préstamos",
      data: null,
    };
  }
};

module.exports = {
  crearPrestamoBD,
  obtenerPrestamoPorIdBD,
  obtenerTodosLosPrestamosBD,
  actualizarPrestamos,
  eliminarPrestamoBD,
  actualizarPrestamoBD,
  desactivarPrestamoBD,
  activarPrestamoBD,
};
