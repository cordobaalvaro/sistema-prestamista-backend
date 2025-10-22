const cloudinary = require("../helpers/cloudinary.config.helpers.js");
const DocumentoClienteModel = require("../models/documentosCliente.model.js");
const { extractPublicId } = require("../helpers/publicId.helpers.js");

const obtenerDocumentosClienteBD = async (clienteId) => {
  try {
    const documentos = await DocumentoClienteModel.find({ clienteId });
    return {
      status: 200,
      msg: "Documentos obtenidos exitosamente",
      data: documentos,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al obtener los documentos: " + error.message,
      data: null,
    };
  }
};

const crearDocumentoClienteBD = async (clienteId, nombre) => {
  try {
    const documento = await DocumentoClienteModel.create({
      nombre,
      clienteId,
    });

    return {
      status: 201,
      msg: "Documento creado exitosamente",
      documentoId: documento._id,
      data: documento,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      msg: "Error al crear el documento: " + error.message,
      data: null,
    };
  }
};
const subirImagenDocumentoClienteBD = async (documentoId, file) => {
  try {
    const documento = await DocumentoClienteModel.findById(documentoId);
    if (!documento) {
      return {
        status: 404,
        msg: "Documento no encontrado",
        data: null,
      };
    }
    const imagen = await cloudinary.uploader.upload(file.path);
    documento.url = imagen.secure_url;
    await documento.save();
    return {
      status: 200,
      msg: "Imagen subida exitosamente",
      data: documento,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      msg: "Error al subir la imagen: " + error.message,
      data: null,
    };
  }
};
const eliminarDocumentoClienteBD = async (documentoId) => {
  try {
    const documento = await DocumentoClienteModel.findByIdAndDelete(
      documentoId
    );
    if (!documento) {
      return {
        status: 404,
        msg: "Documento no encontrado",
        data: null,
      };
    }
    if (documento.url) {
      const publicId = extractPublicId(documento.url);
      await cloudinary.uploader.destroy(publicId);
    }
    return {
      status: 200,
      msg: "Documento eliminado exitosamente",
      data: documento,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      msg: "Error al eliminar el documento: " + error.message,
      data: null,
    };
  }
};
const editarDocumentoClienteBD = async (documentoId, nombre) => {
  try {
    const documento = await DocumentoClienteModel.findById(documentoId);
    if (!documento) {
      return {
        status: 404,
        msg: "Documento no encontrado",
        data: null,
      };
    }
    documento.nombre = nombre;
    await documento.save();
    return {
      status: 200,
      msg: "Documento editado exitosamente",
      data: documento,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al editar el documento: " + error.message,
      data: null,
    };
  }
};
const editarImagenDocumentoClienteBD = async (documentoId, file) => {
  try {
    const documento = await DocumentoClienteModel.findById(documentoId);
    if (!documento) {
      return {
        status: 404,
        msg: "Documento no encontrado",
        data: null,
      };
    }
    if (documento.url) {
      const publicId = extractPublicId(documento.url);
      await cloudinary.uploader.destroy(publicId);
    }
    const imagen = await cloudinary.uploader.upload(file.path);
    documento.url = imagen.secure_url;
    await documento.save();
    return {
      status: 200,
      msg: "Imagen editada exitosamente",
      data: documento,
    };
  } catch (error) {
    return {
      status: 500,
      msg: "Error al editar la imagen: " + error.message,
      data: null,
    };
  }
};

module.exports = {
  obtenerDocumentosClienteBD,
  crearDocumentoClienteBD,
  subirImagenDocumentoClienteBD,
  eliminarDocumentoClienteBD,
  editarDocumentoClienteBD,
  editarImagenDocumentoClienteBD,
};
