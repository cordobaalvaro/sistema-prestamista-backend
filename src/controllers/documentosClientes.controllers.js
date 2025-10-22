const {
  obtenerDocumentosClienteBD,
  crearDocumentoClienteBD,
  subirImagenDocumentoClienteBD,
  eliminarDocumentoClienteBD,
  editarImagenDocumentoClienteBD,
  editarDocumentoClienteBD,
} = require("../services/documentosClientes.services.js");

const obtenerDocumentosCliente = async (req, res) => {
  try {
    const { status, msg, data } = await obtenerDocumentosClienteBD(
      req.params.clienteId
    );
    return res.status(status).json({ msg, data });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      msg: "Error al obtener los documentos: " + error.message,
      data: null,
    });
  }
};
const crearDocumentoCliente = async (req, res) => {
  try {
    const { status, msg, data, documentoId } = await crearDocumentoClienteBD(
      req.params.clienteId,
      req.body.nombre
    );
    return res.status(status).json({ msg, data, documentoId });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      msg: "Error al crear el documento: " + error.message,
      data: null,
    });
  }
};
const eliminarDocumentoCliente = async (req, res) => {
  try {
    const { status, msg, data } = await eliminarDocumentoClienteBD(
      req.params.documentoId
    );
    return res.status(status).json({ msg, data });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      msg: "Error al eliminar el documento: " + error.message,
      data: null,
    });
  }
};

const subirImagenDocumentoCliente = async (req, res) => {
  try {
    const { status, msg, data } = await subirImagenDocumentoClienteBD(
      req.params.documentoId,
      req.file
    );
    return res.status(status).json({ msg, data });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      msg: "Error al subir la imagen: " + error.message,
      data: null,
    });
  }
};
const editarDocumentoCliente = async (req, res) => {
  try {
    const { status, msg, data } = await editarDocumentoClienteBD(
      req.params.documentoId,
      req.body.nombre
    );
    return res.status(status).json({ msg, data });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      msg: "Error al editar el documento: " + error.message,
      data: null,
    });
  }
};
const editarImagenDocumentoCliente = async (req, res) => {
  try {
    const { status, msg, data } = await editarImagenDocumentoClienteBD(
      req.params.documentoId,
      req.file
    );
    return res.status(status).json({ msg, data });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      msg: "Error al editar la imagen: " + error.message,
      data: null,
    });
  }
};

module.exports = {
  obtenerDocumentosCliente,
  crearDocumentoCliente,
  subirImagenDocumentoCliente,
  editarDocumentoCliente,
  editarImagenDocumentoCliente,
  eliminarDocumentoCliente,
};
