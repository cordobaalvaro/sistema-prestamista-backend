const mongoose = require("mongoose");
const CounterModel = require("./counter.model");

// Eliminado el esquema cobros y la propiedad cobros de cuotaSchema

const cuotaSchema = new mongoose.Schema({
  numero: {
    type: Number,
    required: true,
    min: 1,
  },
  fechaVencimiento: {
    type: Date,
    required: true,
  },
  monto: {
    type: Number,
    required: true,
    min: 0.01,
  },
  estado: {
    type: String,
    enum: ["pendiente", "cobrado", "completo"],
    default: "pendiente",
    required: true,
  },
  pagado: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const registroCobrosSchema = new mongoose.Schema({
  monto: {
    type: Number,
    required: true,
    min: 0.01,
  },
  fechaPago: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const prestamoSchema = new mongoose.Schema(
  {
    numero: {
      type: Number,
      unique: true,
      min: 1,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    fechaInicio: {
      type: Date,
      default: Date.now,
      required: true,
    },
    fechaVencimiento: {
      type: Date,
      required: true,
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
      required: true,
    },
    planDeCuotas: {
      type: [cuotaSchema],
      required: true,
      validate: [(arr) => arr.length > 0, "Debe haber al menos una cuota"],
    },
    montoInicial: {
      type: Number,
      required: true,
      min: 0.01,
    },
    montoTotal: {
      type: Number,
      required: true,
      min: 0.01,
    },
    saldoPendiente: {
      type: Number,
      min: 0,
    },
    interesSemanal: {
      type: Number,
      default: 0,
      min: 0,
    },
    estado: {
      type: String,
      enum: ["activo", "cancelado", "vencido", "desactivado"],
      default: "activo",
      required: true,
    },
    cantidadCuotas: {
      type: Number,
      required: true,
      min: 1,
      max: 36,
    },
    frecuencia: {
      type: String,
      enum: ["mensual", "quincenal", "semanal"],
      default: "mensual",
      required: true,
    },
    interes: {
      type: Number,
      default: 0,
      min: 0,
      max: 1000,
    },
    registroCobros: {
      type: [registroCobrosSchema],
      default: [],
    },
    semanasVencidas: {
      type: Number,
      default: 0,
      min: 0,
    },
    notificadoVencido: {
      type: Boolean,
      default: false,
    },
    saldoPendienteVencimiento: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware pre-save para establecer saldoPendiente igual a montoTotal al crear
prestamoSchema.pre("save", async function (next) {
  if (this.isNew && this.numero == null) {
    // Verificar si existen préstamos
    const PrestamoModel = mongoose.model("Prestamo");
    const totalPrestamos = await PrestamoModel.countDocuments();

    if (totalPrestamos === 0) {
      // Si no hay préstamos, resetear el contador y empezar desde 1
      await CounterModel.findByIdAndUpdate(
        { _id: "prestamo" },
        { $set: { seq: 1 } },
        { upsert: true }
      );
      this.numero = 1;
    } else {
      // Si hay préstamos, obtener el número máximo existente y sumar 1
      const ultimoPrestamo = await PrestamoModel.findOne(
        {},
        { numero: 1 }
      ).sort({ numero: -1 });
      const siguienteNumero = (ultimoPrestamo?.numero || 0) + 1;

      // Actualizar el contador para mantener consistencia
      await CounterModel.findByIdAndUpdate(
        { _id: "prestamo" },
        { $set: { seq: siguienteNumero } },
        { upsert: true }
      );
      this.numero = siguienteNumero;
    }
  }
  // Solo aplicar cuando es un documento nuevo (creación) o cuando saldoPendiente es undefined
  if ((this.isNew || this.saldoPendiente === undefined) && this.montoTotal) {
    this.saldoPendiente = this.montoTotal;
  }
  next();
});

const PrestamoModel = mongoose.model("Prestamo", prestamoSchema);

module.exports = PrestamoModel;
