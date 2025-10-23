const {
  crearNotificacion,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} = require("../services/notificaciones.services");

const listar = async (req, res) => {
  try {
    const { page, limit, soloNoLeidas } = req.query;
    const data = await listarNotificaciones({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      soloNoLeidas: soloNoLeidas === "true",
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: "Error listando notificaciones" });
  }
};

const crear = async (req, res) => {
  try {
    const notif = await crearNotificacion(req.body);
    if (!notif) return res.status(400).json({ message: "No se pudo crear" });
    res.status(201).json(notif);
  } catch (e) {
    res.status(500).json({ message: "Error creando notificación" });
  }
};

const marcar = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await marcarLeida(id);
    if (!updated) return res.status(404).json({ message: "No encontrada" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: "Error marcando notificación" });
  }
};

const marcarTodas = async (_req, res) => {
  try {
    await marcarTodasLeidas();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Error marcando todas" });
  }
};

module.exports = { listar, crear, marcar, marcarTodas };
