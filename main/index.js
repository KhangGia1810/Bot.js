var { log, utils, clientBot, dataBot, cwd, config } = global;
var configBot = config();
var { readdirSync } = require('node:fs');
var pathModule = cwd + '/module/';
var { execSync } = require('node:child_process');

function requestActive(api, model) {
  let lent = 0;
  var path = pathModule + 'active/';
  var allCommand = readdirSync(path)
    .filter(item => !configBot.module.noUseActive.includes(item) && item.endsWith('.js'));

  for (let command of allCommand) {
    try {
      var info = require(path + command);
      var { moduleConfig, OnChat, OnLoad } = info;
      if (moduleConfig instanceof Object) {
        var { type, author, note, depent } = moduleConfig;
        if (!Array.isArray(type) || type.length == 0) break;
        if (!Array.isArray(author)) break;
        if (!note) moduleConfig.note = '';
        if (depent instanceof Array) {
          for (let package of depent) {
            try {
              require(package.split('@')[0]);
            } catch (e) {
              execSync('npm install ' + package + ' --save', {
                env: process.env,
                cwd,
                stdio: 'pipe',
                shell: true
              });
            }
          }
        }
        if (typeof OnChat != 'function') break;
        if (typeof OnLoad == 'function') OnLoad({ api, ...model });
        clientBot.module.active.push({
          type,
          moduleConfig,
          OnChat
        });
        lent += 1;
      }
    } catch (e) { /* nothing here */ }
  }
  return lent;
}

function requestPassive(api, model) {
  let lent = 0;
  var path = pathModule + 'passive/';
  var allCommand = readdirSync(path)
    .filter(item => !configBot.module.noUsePassive.includes(item) && item.endsWith('.js'));

  for (let command of allCommand) {
    try {
      var info = require(path + command);
      var { moduleConfig, OnChat, OnReact, OnReply, OnLoop, OnListen, OnLoad } = info;

      if (moduleConfig instanceof Object) {
        var { name, per, author, note, requestLimit, depent, moduleType, use } = moduleConfig;
        if (!name || clientBot.module.passive.some(item => item.name == name)) break;
        if (per > 2 || per < 0) moduleConfig.per = 0;
        if (!use) break;
        if (typeof use != 'string') break;
        if (!Array.isArray(author)) break;
        if (!requestLimit || isNaN(requestLimit)) moduleConfig.requestLimit = 5;
        if (!moduleType) break;
        if (!note) moduleConfig.note = '';
        if (depent instanceof Array) {
          for (let package of depent) {
            try {
              require(package.split('@')[0]);
            } catch (e) {
              execSync('npm install ' + package + ' --save', {
                env: process.env,
                cwd,
                stdio: 'pipe',
                shell: true
              });
            }
          }
        }
        if (!OnChat || typeof OnChat != 'function') break;
        if (typeof OnLoad == 'function') OnLoad({ api, ...model });
        clientBot.module.passive.push({
          name,
          moduleConfig,
          OnChat, 
          OnReact, 
          OnReply, 
          OnLoop, 
          OnListen
        });
        lent += 1;
      }
    } catch (e) { /* nothing here */ }
  }

  return lent;
}

module.exports = async function (api) {
  var database = require('./database');
  var model = new database(api);
  global.clientBot.model = model;
  var lentA = await requestActive(api, model);
  var lentP = await requestPassive(api, model);
  log('Module', `Success loaded ${lentP} lệnh và ${lentA} event`, 1);
  
  var action = require('./handleAction')(api, model);
  return api.listenMqtt(action);
}