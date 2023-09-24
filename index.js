var
  utils = require('./utils'),
  fs = require('node:fs'),
  log = require('./log'),
  facebookAPIs = require('fb-chat-support');

function getConfig(data) {
  delete require.cache[__dirname + '/config.json'];
  var config = require(__dirname + '/config.json');

  if (data instanceof Object) {
    Object.assign(config, data);
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
  }
  return config;
}

global.clientBot = {
  replyData: {},
  reactData: {},
  module: {
    passive: [],
    active: []
  },
  model: null,
  timestamp: {}
}
global.dataBot = {
  allBoxID: [],
  allUserID: [],
  userBannedID: [],
  boxBannedID: []
}
global.utils = utils;
global.cwd = __dirname;
global.config = getConfig;
global.log = log;
global.pathCache = __dirname + '/database/cache/';

function getOptions() {
  var { facebook } = getConfig();
  var { email, password, Cookies, authCode, appStatePath } = facebook;

  let Opt;
  var pathSt = __dirname + '/' + (appStatePath != '' ? appStatePath : 'appstate.json');
  if (fs.existsSync(pathSt)) {
    var key = process.env.Encrypt;
    var appState = fs.readFileSync(pathSt, 'utf-8');
    if (facebook.encryptSt) {
      if (!key) {
        log('Decrypt', 'Không tìm thấy mật khẩu mã hóa, vui lòng thêm mật mã vào process.env.Encrypt', 2);
        process.exit(0);
      } 
      else {
        if (appState.indexOf('[') > -1)
          Opt = { 
            appState: JSON.parse(appState) 
          }
        else 
          Opt = { 
            appState: JSON.parse(utils.decrypt(appState, key)) 
          }
      }
    }
    else {
      if (appState.indexOf('[') > -1) 
        Opt = { 
          appState: JSON.parse(appState)
        }
      else {
        if (!key) {
          log('Decrypt', 'Không tìm thấy mật khẩu mã hóa, vui lòng thêm mật mã vào process.env.Encrypt', 2);
          process.exit(0);
        } 
        else 
          Opt = { 
            appState: JSON.parse(utils.decrypt(appState, key)) 
          }
      }
    }
  }
  else if (Cookies != '') 
    Opt = {
      appState: Cookies
    }
  else 
    Opt = { email, password }

  return Opt;
}

function getAccess_token(api) {
  var cb;
  let lent = 0, fail = 0, getInput = 0;
  var rt = new Promise(function (resolve, reject) {
    cb = err => err ? reject(err) : resolve();
  });

  api.getAccess(async function (err, token) {
    if (err) {
      if (err.error == 'submitCode') {
        var { facebook } = getConfig();
        if (facebook.authCode == '') {
          lent += 1;
          var { stdin } = process;
          stdin.setEncoding('utf8');
          log('2FA', getInput == 0 ? 'Vui lòng nhập mã 2fa vào console!' : 'Mã 2FA không hợp lệ!', 2);
          log('2FA', null, 4, '#FFFF00');
          var outCb = setTimeout(cb, 1000 * 60 * 15, new Error('Không thể lấy mã 2FA từ console!'));
          return sdtin.on('data', async function (input) {
            input = input.split('\n')[0];
            getInput += 1;
            if (isNaN(input) && input.length == 39) {
              clearTimeout(outCb);
              var code = await utils.getCodeFromAuth(input);
              await err.continue(code);
              return stdin.pause();
            } else if (!isNaN(input) && input.length == 6) {
              clearTimeout(outCb);
              await err.continue(input);
              return stdin.pause();
            } else {
              log('2FA', 'Mã không hợp lệ!', 2);
              log('2FA', null, 4, '#FFFF00');
            }
          });
        } else {
          if (!isNaN(facebook.authCode) && facebook.authCode.length == 6) {
            if (fail > 0) 
              return cb(new Error('Mã 2fa không hợp lệ!'));
            fail += 1;
            return await err.continue(facebook.authCode);
          }
          else if (isNaN(facebook.authCode) && facebook.authCode.length == 39) {
            var code = await utils.getCodeFromAuth(facebook.authCode);
            return await err.continue(code);
          }
          return cb(new Error('Mã 2fa không hợp lệ!'));
        }
      } 
      return cb(new Error('Không thể lấy token từ business.facebook.com!'));
    } else {
      if (lent > 0) log();
      global.clientBot.token = token;
      return cb();
    }
  });

  return rt;
}

function startProject() {
  var Opt = getOptions();
  var config = getConfig();
  var { facebook } = config;
  var factOpt = Object.assign({
    logLevel: 'silent'
  }, facebook.options);
  facebookAPIs(Opt, factOpt, async function (err, api) {
    if (err) {
      if (err.error == 'submit2FA') {
        log('Login', 'Bạn đang bật 2fa, tiến hành lấy mã...', 2);
        if (facebook.authCode != '') {
          if (isNaN(facebook.authCode)) {
            var codeApprovals = await utils.getCodeFromAuth(facebook.authCode);
            err.continue(codeApprovals);
          } else if (facebook.authCode == 6) 
            err.continue(facebook.authCode);
          else {
            log('Login', 'Mã xác thực không hợp lệ', 3);
            process.exit(0);
          }
        } else {
          log('Login', 'Không tìm thấy mã 2fa.', 2);
          process.exit(0);
        }
      }
      else
        process.exit(1, err instanceof Error ? err : JSON.stringify(err, null, 2));
    } else {
      var userID = api.getCurrentUserID();
      global.clientBot.botID = userID;

      var appState = JSON.stringify(api.getAppState(), null, 2);
      if (facebook.appStatePath == '') {
        var pathSt = userID + '.json';
        facebook.appStatePath = pathSt;
        getConfig({ facebook });
      }
      if (facebook.encryptSt) {
        var key = process.env.Encrypt;
        if (!key) 
          log('Encrypt', 'Không tìm thấy mật khẩu mã hóa, vui lòng thêm mật mã vào process.env.Encrypt', 2);
        else 
          appState = utils.encrypt(appState, key);
      }
      fs.writeFileSync(facebook.appStatePath, appState);
      
      log('BotID', userID, 1);
      log('Botname', config.Botname, 1);
      log('Prefix', config.Prefix, 1);
      log();
      await getAccess_token(api);
      await require('./main')(api);
      //return require('./dashboard');
    }
  });
}

function thisChild(status, error) {
  process.exit = thisChild;
  switch (status) {
    case 0:
      log('Bot', 'Đang tiến hành thoát server.', 1);
      log();
      process.kill(process.pid);
      break;
    case 1:
      log('Bot', 'Đã xảy ra lỗi trong lúc hoạt động, ' + error, 3);
      log();
      process.kill(process.pid);
      break;
    case 2:
      log('Bot', 'Đang khởi động lại server sau 5s.', 1);
      setTimeout(function () {
        console.clear();
        return thisChild();
      }, 5000);
      break;
    default:
      log();
      startProject();
      break;
  }
  
  return;
}

thisChild();
