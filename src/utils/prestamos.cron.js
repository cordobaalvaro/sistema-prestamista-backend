const cron = require("node-cron");
const { actualizarPrestamos } = require("../services/prestamos.services");

// Corre cada 30 minutos por defecto. Si querés cambiarlo, usa PRESTAMOS_CRON.
const DEFAULT_SCHEDULE = "*/30 * * * *"; // cada 30 minutos
const SCHEDULE = process.env.PRESTAMOS_CRON || DEFAULT_SCHEDULE;

cron.schedule(SCHEDULE, async () => {
  try {
    console.log(
      `⏰ Ejecutando actualización de préstamos (cron: ${SCHEDULE})`
    );
    await actualizarPrestamos();
  } catch (err) {
    console.error("Error en tarea de actualización de préstamos:", err);
  }
});
