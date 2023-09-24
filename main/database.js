var { cwd, utils, log } = global;
var { writeFileSync, existsSync } = require('node:fs');
var pathData = cwd + '/database/';
let graphUser, graphBox, getAvatarUser, searchPage;

function isAccept(id) {
  if (!isNaN(id) && String(id).length <= 16)
    return true;
  throw new Error('id must be number and has length <= 16, not ' + typeof id);
}

class DataBase {
  constructor(apis) {
    if (apis instanceof Object) {
      var dbFunction = [
        'getUserInfo',
        'getThreadInfo',
        'getAvatarUser',
        'getUserID',
      ]

      for (let name of dbFunction) {
        if (!apis[name])
          throw new Error('Cant find database function');
      }

      graphUser = apis.getUserInfo;
      graphBox = apis.getThreadInfo;
      getAvatarUser = apis.getAvatarUser;
      searchPage = apis.getUserID;

      return 
    } else 
      throw new Error(`facebookAPIs must be an object!`);
  }
  
  get box() {
    var path = pathData + '/box.json';
    if (!existsSync(path)) 
      writeFileSync(path, '[]');

    async function graphGet(id) {
      isAccept(id);
      var dataOri = await graphBox(id);
      return dataOri;
    }

    async function createData(id) {
      isAccept(id);
      var data = require(path);
      let dataSrc = data.find(item => item.threadID == id);
      if (!dataSrc) {
        var dataOri = await graphGet(id);
        dataSrc = {
          threadID: id,
          name: dataOri.name,
          participantIDs: dataOri.participantIDs,
          image: dataOri.imageSrc,
          adminIDs: dataOri.adminIDs.map(item => item.id),
          nicknames: dataOri.nicknames,
          approvalMode: dataOri.approvalMode,
          emoji: dataOri.emoji,
          color: dataOri.color,
          isGroup: dataOri.isGroup,
          inviteLink: dataOri.inviteLink,
          hasBan: false,            
          reason: null,
          banAt: null,
          data: {},
          createAt: Date.now()
        }
        data.push(dataSrc);
        writeFileSync(path, JSON.stringify(data, null, 2));
      }
      return dataSrc;
    }

    async function deleteData(id) {
      isAccept(id);
      var data = require(path);
      var index = data.find(item => item.threadID == id);
      if (index > -1) {
        data.splice(data.indexOf(data[index]), 1);
        writeFileSync(path, JSON.stringify(data, null, 2));
      }

      return;
    }

    async function setData(id, newOpt) {
      isAccept(id);
      if (utils.getType(newOpt) != 'Object') 
        throw new Error('newOpt must be an object, not ' + utils.getType(newOpt));

      var data = require(path);
      var index = data.findIndex(item => item.threadID == id);
      if (index < 0) {
        await createData(id);
        return await setData(id, newOpt);
      }
      Object.assign(data[index], newOpt);
      writeFileSync(path, JSON.stringify(data, null, 2));
      return data[index];
    }

    async function getData(id) {
      isAccept(id);
      var data = require(path);
      let dataSrc = data.find(item => item.threadID == id);
      if (!dataSrc) 
        dataSrc = await createData(id);

      return dataSrc;
    }

    return {
      getAll: () => require(path).filter(item => item.isGroup),
      graphGet,
      createData,
      deleteData,
      setData,
      getData
    }
  }

  get user() {
    var path = pathData + '/user.json';
    if (!existsSync(path)) 
      writeFileSync(path, '[]');

    async function graphGet(id) {
      isAccept(id);
      var dataOri = await graphUser(id, true);
      return dataOri[id];
    }

    async function createData(id) {
      isAccept(id);
      var data = require(path);
      let dataSrc = data.find(item => item.userID == id);
      if (!dataSrc) {
        var dataOri = await graphGet(id);
        dataSrc = {
          userID: id,
          name: dataOri.name,
          shortName: dataOri.shortName,
          website: dataOri.website,
          follower: dataOri.follower,        
          hometown: dataOri.hometown,
          profileUrl: dataOri.profileUrl,
          location: dataOri.location,
          username: dataOri.username,
          avatar: await getAvatar(id),
          relationship_status: dataOri.relationship_status,
          birthday: dataOri.birthday,
          languages: dataOri.languages,
          gender: dataOri.gender,
          email: dataOri.email,
          lover: dataOri.lover,
          cover: dataOri.cover,
          first_name: dataOri.first_name,
          middle_name: dataOri.middle_name,
          last_name: dataOri.last_name,
          hasBan: false,
          reason: null,
          banAt: null,
          data: {},
          createAt: Date.now()
        }
        data.push(dataSrc);
        writeFileSync(path, JSON.stringify(data, null, 2));
      }

      return dataSrc;
    }

    async function getAvatar(id, x = 1500, y = 1500) {
      isAccept(id);
      if (isNaN(x) || isNaN(y))
        throw new Error('x, y must be number!');

      var data = await getAvatarUser(id, [x, y]);
      return data[id];
    }

    async function setData(id, newOpt) {
      isAccept(id);
      if (utils.getType(newOpt) != 'Object')
        throw new Error('newOpt must be an object, not ' + utils.getType(newOpt));

      var data = require(path);
      var index = data.findIndex(item => item.userID == id);
      if (index == -1) {
        await createData(id);
        return await setData(id, newOpt);
      }
      Object.assign(data[index], newOpt);
      writeFileSync(path, JSON.stringify(data, null, 2));
      return data[index];
    }

    async function getData(id) {
      isAccept(id);
      var data = require(path);
      let dataSrc = data.find(item => item.userID == id);
      if (!dataSrc) 
        dataSrc = await createData(id);
      return dataSrc;
    }

    async function getUID(username) {
      var data = require(path);
      var dataSrc = data.find(item => item.username == username);
      if (dataSrc) 
        return dataSrc.userID;
      var page = await searchPage(username);
      return page[0].userID;
    }

    async function deleteData(id) {
      isAccept(id);
      var data = require(path);
      var index = data.findIndex(item => item.userID == id);
      if (index > -1) {
        data.splice(data.indexOf(data[index]), 1);
        writeFileSync(path, JSON.stringify(data, null, 2));
      }

      return;
    }

    return {
      getAll: () => require(path),
      setData,
      deleteData,
      createData,
      getData,
      graphGet,
      getAvatar,
      getUID
    }
  }
}

module.exports = DataBase;