const mongoose = require("mongoose");
const CounterModel = require("./counter.model");

const clienteSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [50, "El nombre no puede exceder 50 caracteres"],
      trim: true,
      validate: {
        validator: function (v) {
          return /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/.test(v);
        },
        message: "El nombre solo puede contener letras y espacios",
      },
    },
    dni: {
      type: String,
      required: [true, "El DNI es obligatorio"],
      unique: true,
      trim: true,
      minlength: [7, "El DNI debe tener al menos 7 dígitos"],
      maxlength: [8, "El DNI no puede exceder 8 dígitos"],
      validate: {
        validator: function (v) {
          return /^\d{7,8}$/.test(v);
        },
        message:
          "El DNI debe contener solo números y tener entre 7 y 8 dígitos",
      },
    },
    telefono: {
      type: String,
      required: [true, "El teléfono es obligatorio"],
      trim: true,
      validate: {
        validator: function (v) {
          return /^[\d\s\-\+\(\)]{8,15}$/.test(v);
        },
        message:
          "El teléfono debe tener entre 8 y 15 caracteres y solo contener números, espacios, guiones, paréntesis o signo +",
      },
    },
    direccion: {
      type: String,
      required: [true, "La dirección es obligatoria"],
      minlength: [5, "La dirección debe tener al menos 5 caracteres"],
      maxlength: [200, "La dirección no puede exceder 200 caracteres"],
      trim: true,
    },
    barrio: {
      type: String,
      required: [true, "El barrio es obligatorio"],
      maxlength: [100, "El barrio no puede exceder 100 caracteres"],
      trim: true,
    },
    ciudad: {
      type: String,
      required: [true, "La ciudad es obligatoria"],
      maxlength: [100, "La ciudad no puede exceder 100 caracteres"],
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Ciudad es opcional
          return /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s\.\-]+$/.test(v);
        },
        message:
          "La ciudad solo puede contener letras, espacios, puntos y guiones",
      },
    },
    localidad: {
      type: String,
      required: [true, "La localidad es obligatoria"],
      maxlength: [100, "La localidad no puede exceder 100 caracteres"],
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Localidad es opcional
          return /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s\.\-]+$/.test(v);
        },
        message:
          "La localidad solo puede contener letras, espacios, puntos y guiones",
      },
    },
    fechaNacimiento: {
      required: [true, "La fecha de nacimiento es obligatoria"],
      type: Date,
      validate: {
        validator: function (v) {
          if (!v) return true; // Fecha de nacimiento es opcional
          const hoy = new Date();
          const edad = (hoy - v) / (365.25 * 24 * 60 * 60 * 1000);
          return edad >= 18 && edad <= 120;
        },
        message:
          "La fecha de nacimiento debe corresponder a una persona entre 18 y 120 años",
      },
    },
    direccionComercial: {
      required: [true, "La dirección comercial es obligatoria"],
      type: String,
      maxlength: [
        200,
        "La dirección comercial no puede exceder 200 caracteres",
      ],
      trim: true,
    },
    direccionCobro: {
      required: [true, "La dirección de cobro es obligatoria"],
      type: String,
      enum: {
        values: ["direccion", "direccionComercial"],
        message:
          "La dirección de cobro debe ser 'direccion' o 'direccionComercial'",
      },
      default: "direccion",
    },
    tipoDeComercio: {
      required: [true, "El tipo de comercio es obligatorio"],
      type: String,
      maxlength: [100, "El tipo de comercio no puede exceder 100 caracteres"],
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Tipo de comercio es opcional
          return /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s\.\-]+$/.test(v);
        },
        message:
          "El tipo de comercio solo puede contener letras, espacios, puntos y guiones",
      },
    },
    prestamos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Prestamo",
      },
    ],
    zona: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zona",
    },
    numero: {
      type: Number,
      unique: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Método virtual para obtener la dirección de cobro
clienteSchema.virtual("direccionCobroFinal").get(function () {
  if (this.direccionCobro === "direccionComercial") {
    return this.direccionComercial;
  }
  return this.direccion;
});

clienteSchema.pre("save", async function (next) {
  if (this.isNew && this.numero == null) {
    // Verificar si existen clientes
    const ClienteModel = mongoose.model("Cliente");
    const totalClientes = await ClienteModel.countDocuments();

    if (totalClientes === 0) {
      // Si no hay clientes, resetear el contador y empezar desde 1
      await CounterModel.findByIdAndUpdate(
        { _id: "cliente" },
        { $set: { seq: 1 } },
        { upsert: true }
      );
      this.numero = 1;
    } else {
      // Si hay clientes, obtener el número máximo existente y sumar 1
      const ultimoCliente = await ClienteModel.findOne({}, { numero: 1 }).sort({
        numero: -1,
      });
      const siguienteNumero = (ultimoCliente?.numero || 0) + 1;

      // Actualizar el contador para mantener consistencia
      await CounterModel.findByIdAndUpdate(
        { _id: "cliente" },
        { $set: { seq: siguienteNumero } },
        { upsert: true }
      );
      this.numero = siguienteNumero;
    }
  }
  next();
});

const ClienteModel = mongoose.model("Cliente", clienteSchema);

module.exports = ClienteModel;
