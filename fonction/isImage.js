module.exports = function isImage(data) {
  // Vérifiez si les premiers octets du message correspondent à une signature JPEG
  return (
    data[0] === 0xFF &&
    data[1] === 0xD8 &&
    data[data.length - 2] === 0xFF &&
    data[data.length - 1] === 0xD9
  );
}