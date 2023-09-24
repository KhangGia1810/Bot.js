var 
  data = require('./data'),
  { getTime } = require('../utils');

function parseColor(hex, text) {
  if (hex.startsWith('#')) {
    text = 
      '\x1b[38;2;' + 
      parseInt(hex.slice(1, 3), 16) + ';' +
      parseInt(hex.slice(3, 5), 16) + ';' +
      parseInt(hex.slice(5, 7), 16) + 'm' +
      text + '\x1b[0m';
    return text;
  }
  
  return text;
}

module.exports = function logColor(name, text, type, hex) {
  var name = name ? name + ':' : null;
  switch (type) {
    case 1:
      console.log(getTime(), parseColor('#' + data.green, name), text);
      break;
    case 2:
      console.log(getTime(), parseColor('#' + data.yellow, name), text);
      break;
    case 3:
      console.log(getTime(), parseColor('#' + data.red, name), text);
      break;
    case 4:
      process.stdout.write(getTime() + ' ' + parseColor(hex || '#' + data.green, name) + ' ');
      break;
    default:
      if (!name && !text && !type && !hex) {
        console.log(parseColor('#' + data.purple, '=============='));
        break;
      }
      console.log(getTime(), parseColor(hex, name), text);
      break;
  }
}
module.exports.hex = parseColor;