const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split("/");
  const filename = parts[parts.length - 1];
  return filename.split(".")[0]; // Remueve la extensión
};

module.exports = { extractPublicId };
