const mongoose = require("mongoose");
const CounterModel = require("./counter.model");

const listaTabla = new mongoose.Schema({
  zona: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Zona",
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cliente",
    required: true,
  },
  prestamo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Prestamo",
    required: true,
  },
  monto: {
    type: Number,
    default: 0,
  },
  fechaPago: {
    type: Date,
  },
  estado: {
    type: Boolean,
    default: false,
  },
});
const tablaCobroSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    fecha: { type: Date, default: Date.now },
    cobrador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    listaTabla: [{ type: listaTabla, required: true }],
    estado: {
      type: String,
      enum: ["pendiente", "enviado", "visto"],
      default: "pendiente",
    },
    fechaEnvio: {
      type: Date,
    },
    totalCobrado: {
      type: Number,
      default: 0,
    },
    cantidadCobros: {
      type: Number,
      default: 0,
    },
    observaciones: {
      type: String,
    },
    numero: {
      type: Number,
      unique: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt automáticos
  }
);

// Middleware para calcular automáticamente totalCobrado y cantidadCobros
tablaCobroSchema.pre("save", async function (next) {
  if (this.isNew && this.numero == null) {
    const counter = await CounterModel.findByIdAndUpdate(
      { _id: "tablacobro" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.numero = counter.seq;
  }

  if (this.listaTabla && this.listaTabla.length > 0) {
    // Calcular total cobrado sumando todos los montos
    this.totalCobrado = this.listaTabla.reduce((total, item) => {
      return total + (item.monto || 0);
    }, 0);

    // Calcular cantidad de cobros
    this.cantidadCobros = this.listaTabla.length;
  } else {
    this.totalCobrado = 0;
    this.cantidadCobros = 0;
  }
  next();
});

// Middleware para findOneAndUpdate también
tablaCobroSchema.pre(["findOneAndUpdate", "updateOne"], async function (next) {
  const update = this.getUpdate();

  if (
    update.listaTabla ||
    update.$push?.listaTabla ||
    update.$pull?.listaTabla
  ) {
    // Si se está actualizando la listaTabla, necesitamos recalcular
    const doc = await this.model.findOne(this.getQuery());
    if (doc) {
      let listaActualizada = doc.listaTabla;

      if (update.listaTabla) {
        listaActualizada = update.listaTabla;
      } else if (update.$push?.listaTabla) {
        listaActualizada.push(update.$push.listaTabla);
      }

      const totalCobrado = listaActualizada.reduce((total, item) => {
        return total + (item.monto || 0);
      }, 0);

      const cantidadCobros = listaActualizada.length;

      this.set({ totalCobrado, cantidadCobros });
    }
  }
  next();
});

const TablaCobroModel = mongoose.model("TablaCobro", tablaCobroSchema);

module.exports = TablaCobroModel;
