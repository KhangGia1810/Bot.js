var
  fs = require('node:fs'),
  axios = require('axios'),
  crypt = require('crypto'),
  aes = require('aes-js');

function getType(input) {
	return Object.prototype.toString.call(input).slice(8, -1);
}

function getTime(format, date = Date.now()) {
  var { country } = require('./config');
  var time = new Date(date).toLocaleString(country.locale, {
    timeZone: country.timeZone
  });
  if (!format) return time;
  return format.replace(/HH|mm|ss|DD|MM|YYYY|dddd/g, function (v) {
    var [HH,mm,ss,DD,MM,YYYY] = time.split(/:|\/|,\s/g);
    switch (v) {
      case 'HH':
        return HH;
      case 'mm':
        return mm;
      case 'ss':
        return ss;
      case 'DD':
        return DD;
      case 'MM':
        return MM;
      case 'YYYY':
        return YYYY;
      case 'dddd':
        return new Date(date).toLocaleString(country.locale, {
          timeZone: country.timeZone,
          weekday: 'long'
        });
      default:
        return v;
    }
  });
}

function getCodeFromAuth(authCode, callback) {
  var cb;
  var rt = new Promise(function (resolve, reject) {
    cb = (error, code) => code ? resolve(code) : reject (error);
  });

  if (typeof authCode == 'function') 
    throw new Error('authentication code must be a string');
  if (typeof callback == 'function') cb = callback;

  axios
    .get('https://2fa.live/tok/' + authCode.replace(/\ /g, ''))
    .then(function (res) {
      return cb(null, res.data.token);
    })
    .catch(cb);

  return rt;
}

function encrypt(input, key) {
  let 
    hashEngine = crypt.createHash("sha256"),
    hashKey = hashEngine.update(key).digest(),
    bytes = aes.utils.utf8.toBytes(input),
    aesCtr = new aes.ModeOfOperation.ctr(hashKey),
    encryptedData = aesCtr.encrypt(bytes);
  
  return aes.utils.hex.fromBytes(encryptedData);
}

function decrypt(input, key) {
  let 
    hashEngine = crypt.createHash("sha256"),
    hashKey = hashEngine.update(key).digest(),
    encryptedBytes = aes.utils.hex.toBytes(input),
    aesCtr = new aes.ModeOfOperation.ctr(hashKey),
    decryptedData = aesCtr.decrypt(encryptedBytes);
  
  return aes.utils.utf8.fromBytes(decryptedData);
}

function createMessage(api, event) {
  var { messageID, threadID } = event;

  return {
    reply: (txt, tid = threadID, mid = messageID) => api.sendMessage(txt, tid, mid),
    send: (txt, tid = threadID) => api.sendMessage(txt, tid),
    react: (txt, tid = threadID) => api.setMessageReaction(txt, tid),
    unsend: api.unsendMessage
  }
}
  
module.exports = {
  getType,
  getTime,
  getCodeFromAuth,
  encrypt,
  decrypt,
  createMessage
}
