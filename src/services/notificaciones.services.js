const Notificacion = require("../models/notificacion.model");

const crearNotificacion = async ({
  tipo,
  mensaje,
  prestamo,
  cliente,
  metadata,
}) => {
  try {
    const notif = await Notificacion.create({
      tipo,
      mensaje,
      prestamo,
      cliente,
      metadata,
    });
    return notif;
  } catch (e) {
    console.error("Error creando notificación", e);
    return null;
  }
};

const listarNotificaciones = async ({
  page = 1,
  limit = 20,
  soloNoLeidas = false,
} = {}) => {
  const query = soloNoLeidas ? { leida: false } : {};
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Notificacion.find(query)
      .populate(
        "prestamo",
        "numero nombre estado saldoPendiente interesSemanal"
      )
      .populate("cliente", "nombre apellido dni")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notificacion.countDocuments(query),
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) };
};

const marcarLeida = async (id) => {
  return Notificacion.findByIdAndUpdate(id, { leida: true }, { new: true });
};

const marcarTodasLeidas = async () => {
  await Notificacion.updateMany({ leida: false }, { leida: true });
};

module.exports = {
  crearNotificacion,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
};
