var { utils, log, clientBot, dataBot, cwd, config } = global;

async function Dashboard(event, model) {
  var { box, user } = model;
  var { consoleDev } = config();
  let outLog;
  if (!consoleDev.chatEvent) {
    var info = await box.getData(event.threadID);
    var infoUser = await user.getData(event.senderID);
    outLog = 
      log.hex('#FF66FF', `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`) + '\n' +
      log.hex('#CC66FF', '┣➤ Tên nhóm: ') + info.name + '\n' +
      log.hex('#9966FF', '┣➤ ID nhóm: ') + info.threadID + '\n' +
      log.hex('#6666FF', '┣➤ Tên người dùng: ') + infoUser.name + '\n' + 
      log.hex('#3366FF', '┣➤ ID người dùng: ') + infoUser.userID + '\n' +
      log.hex('#0066FF', '┣➤ Nội dung: ') + (event.body || 'Ảnh, video...') + '\n' +
      log.hex('#0033FF', '┣➤ Thời gian: ') + utils.getTime() + '\n' +
      log.hex('#0000FF', '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
  } else {
    outLog = Object.assign({}, event);
    outLog.participantIDs = (event.participantIDs || []).length;
  }
  !consoleDev.chatEvent ? console.log(outLog) : log(event.type.toUpperCase(), outLog, 1);
}

async function createDataBase(model, event) {
  var { threadID, participantIDs } = event;
  var { box, user } = model;
  var { dataBase } = config();

  if (!dataBase.saveData) return;
  try {
    var dataSrc = await box.createData(threadID);
    if (dataSrc.isGroup && !dataBot.allBoxID.includes(threadID)) 
      dataBot.allBoxID.push(threadID);
    
    for (let userID of (participantIDs || [])) {
      await user.createData(userID);
      if (dataBot.allUserID.includes(userID)) break;
      dataBot.allUserID.push(userID);
    }
  } catch (e) {
    log('DataBase', 'Đã xảy ra lỗi trong lúc ghi data!', 3);
  }
}

async function refreshDataMS(model) {
  var { box, user } = model;
  var { dataBase } = config();

  function formatData(dataOri, isUser) {
    if (isUser) 
      return {
        name: dataOri.name,
        shortName: dataOri.shortName,
        website: dataOri.website,
        follower: dataOri.follower,
        hometown: dataOri.hometown,
        profileUrl: dataOri.profileUrl,
        location: dataOri.location,
        username: dataOri.username,
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
        createAt: Date.now()
      }

    return {
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
      createAt: Date.now()
    }
  }

  for (let dataSrc of user.getAll()) {
    try {
      if ((Date.now() - dataSrc.createAt) > (dataBase.refreshData * 1000)) {
        let dataOri = await user.graphGet(dataSrc.userID);
        dataOri = formatData(dataOri, true);
        dataOri.avatar = await user.getAvatar(dataSrc.userID);
        await user.setData(dataSrc.userID, dataOri);
      }
    } catch (e) {
      log('DataBase', `Không thể làm mới data cho ${dataSrc.userID}, lỗi: ` + e.message, 3);
    }
  }

  for (let dataSrc of box.getAll()) {
    try {
      if ((Date.now() - dataSrc.createAt) > (dataBase.refreshData * 1000)) {
        let dataOri = await box.graphGet(dataSrc.threadID);
        await box.setData(dataSrc.threadID, formatData(dataOri));
      }
    } catch (e) {
      log('DataBase', `Không thể làm mới data cho ${dataSrc.threadID}, lỗi: ` + e.message, 3);
    }
  }
}

async function OnChat(api, event, model) {
  var { box, user } = model;
  var { body, threadID, senderID } = event;
  var thread = await box.getData(threadID);
  var { Prefix, ownerIDs } = config();
  var regPrefix = thread.data.Prefix || Prefix;
  if (!(body || '').startsWith(regPrefix)) return;
  var message = utils.createMessage(api, event);
  var permission = 
    ownerIDs.includes(senderID) ? 2 :
    thread.adminIDs.includes(senderID) ? 1 : 0;
  var userData = await user.getData(senderID);
  if (userData.hasBan && permission < 2) {
    var msg =
      `Bạn đã bị cấm xử dụng bot!\nLí do: ` +
      userData.reason + '\nLúc: ' + utils.getTime(null, userData.banAt);
    return message
      .reply(msg)
      .then(info => setTimeout(message.unsend, 10000, info.messageID));
  }
  if (thread.hasBan) {
    var msg =
      `Nhóm đã bị cấm xử dụng bot!\nLí do: ` +
      thread.reason + '\nLúc: ' + utils.getTime(null, thread.banAt);
    return message
      .reply(msg)
      .then(info => setTimeout(message.unsend, 10000, info.messageID));
  }

  var args = body.replace(regPrefix, '').split(' ');
  var command = args.shift().trim();
  if (command.length == 0)
    return message
      .reply(`Dùng ${regPrefix}help để biết thêm!`);
  var run = clientBot.module.passive.find(item => item.name == command);
  if (!run)
    return message
      .reply(`Lệnh ${command} không tồn tại!\nDùng ${regPrefix}help để biết thêm!`);
  try {
    var input = {
      message,
      event, 
      args,
      user, 
      box, 
      moduleConfig: run.moduleConfig,
      api,
      permission
    }
    await run.OnChat(input);
  } catch (e) {
    log('OnChat', 'Lỗi khi chạy biến cho ' + command + ', ' + e.message, 3);
    return message
      .reply(`Lệnh ${command} đã xảy ra lỗi!\nLỗi: ` + e.message);
  }
}

async function OnReply(api, event, model) {
  var { messageReply, threadID, senderID, body } = event;
  var { box, user } = model;
  var message = utils.createMessage(api, event);

  if (event.type != 'message_reply') return;
  var replyData = clientBot.replyData[messageReply.messageID];
  if (!replyData || !replyData.nameCommand) return;

  var thread = await box.getData(threadID);
  var userData = await user.getData(senderID);
  var { ownerIDs } = config();
  var permission = 
    ownerIDs.includes(senderID) ? 2 :
    thread.adminIDs.includes(senderID) ? 1 : 0;

  if (userData.hasBan && permission < 2) return;
  if (thread.hasBan) return;

  var args = (body || '').trim().split(' ');
  var run = clientBot.module.passive.find(item => item.name == replyData.nameCommand);
  try {
    var input = {
      message,
      event, 
      args,
      user, 
      box, 
      moduleConfig: run.moduleConfig,
      api,
      permission,
      replyData
    }
    await run.OnReply(input);
  } catch (e) {
    log('OnChat', 'Lỗi khi chạy biến cho ' + replyData.nameCommand + ', ' + e.message, 3);
    return message
      .reply(`Lệnh ${replyData.nameCommand} đã xảy ra lỗi!\nLỗi: ` + e.message);
  }
}

module.exports = function (api, model) {
  var { box, user } = model;
  var { dataBase } = config();
  var allUser = user.getAll();
  var allBox = box.getAll();

  for (let userData of allUser) {
    var { userID, hasBan } = userData;
    hasBan ? dataBot.userBannedID.push(userID) : dataBot.allUserID.push(userID);
  }

  for (let boxData of allBox) {
    var { threadID, hasBan } = boxData;
    hasBan ? dataBot.boxBannedID.push(threadID) : dataBot.allBoxID.push(threadID);
  }

  var { allBoxID, allUserID } = dataBot;
  if (dataBase.refreshData > 0) setInterval(refreshDataMS, 1000, model);
  log('DataBase', `Success loaded ${allBoxID.length} box và ${allUserID.length} user`, 1);
  log('Env', 'Success Connection!', 1);
  log();
  
  return async function (err, event) {
    if (err) 
      process.exit(1, err instanceof Error ? err.message : JSON.stringify(err, null, 2));
  
    switch (event.type) {
      case 'message': 
      case 'message_reply':
      case 'message_unsend': 
        await createDataBase(model, event);
        Dashboard(event, model);
        OnChat(api, event, model);
        OnReply(api, event, model);
        break;
      case 'event': 
      case 'change_thread_image':
        break;
      case 'message_reaction':
        break;
      default:
        break;
    }
  }
}