var { utils } = global;
var checkURL = /[w|m|youtube|com|be|\.]\/(watch\?v=|embed\/|shorts\/|)([^\?]+)/g;
var maxSize = [
  87031808,
  27262976
];

async function getDetailsURL(url) {
  var axios = require('axios');
  var { data: html } = await axios.get(url);
  var play = JSON.parse(/var ytInitialPlayerResponse = ([^<]+);/g.exec(html)[1]);
  var contents = JSON.parse(/var ytInitialData = ([^<]+);/g.exec(html)[1]).contents.twoColumnWatchNextResults.results.results.contents;
  var plays = Object.assign(play.videoDetails, { contents });
  var dataOwner = plays.contents.find(item => item.videoSecondaryInfoRenderer).videoSecondaryInfoRenderer.owner.videoOwnerRenderer;

  return {
    title: plays.title,
    viewCount: plays.viewCount,
    likeCount: plays.contents.find(item => item.videoPrimaryInfoRenderer).videoPrimaryInfoRenderer.videoActions.menuRenderer.topLevelButtons.find(item => item.segmentedLikeDislikeButtonRenderer).segmentedLikeDislikeButtonRenderer.likeCount,
    lengthSeconds: plays.lengthSeconds.replace(/\D+/g, ''),
    description: plays.shortDescription,
    image: plays.thumbnail.thumbnails.pop().url,
    author: plays.author,
    channel: {
      id: dataOwner.navigationEndpoint.browseEndpoint.browseId,
      username: dataOwner.navigationEndpoint.browseEndpoint.canonicalBaseUrl,
      name: dataOwner.title.runs[0].text,
      image: dataOwner.thumbnail.thumbnails.pop().url
    },
    uploadDate: play.microformat.playerMicroformatRenderer.uploadDate
  }
}

async function search(keyword) {
  var axios = require('axios');
  var { data: html } = await axios.get('https://www.youtube.com/results?search_query=' + encodeURIComponent(keyword));
  var plays = JSON.parse(/var ytInitialData = ([^<]+);/g.exec(html)[1]).contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
  var results = [];
  for (let play of plays) {
    play = play.videoRenderer;
    if (!play.lengthText.simpleText) break;
    results.push({
      id: play.videoId,
      title: play.title.runs[0].text,
      viewCount: play.viewCountText.simpleText.replace(/\D+/g, ''),
      image: play.thumbnail.thumbnails.pop().url,
      time: play.lengthText.simpleText,
      author: play.ownerText.runs[0].text
    });
  }

  return results;
}

async function Youtube(url, isAudio, message) {
  var Yt = require('@distube/ytdl-core').getInfo;
  var { formats } = await Yt(url);
  format = formats
    .filter(item => item.hasAudio && (isAudio ? !item.hasVideo : item.hasVideo))
    .sort((a, b) => b.contentLength - a.contentLength)
    .find(item => (item.contentLength || 0) < maxSize[isAudio ? 1 : 0]);

  var path = Date.now() + '.' + (isAudio ? 'mp3' : 'mp4');
  var info = await utils.downloadAsFile(format.url, path);
  if (info.stat.size > maxSize[isAudio ? 1 : 0])
    return message
      .reply('𝑪𝒂𝒏𝒕 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅!!');

  var detail = await getDetailsURL(url);
  var msg =
    `𝑴𝒖𝒔𝒊𝒄: ` + detail.title;
  return mesage
    .reply({
      body: msg,
      attachment: info.stream
    });
}

this.moduleConfig = {
  name: 'ytb',
  per: 0,
  author: [
    'Sam'
  ],
  note: 'Tải & Lấy Thông Tin URL Từ Youtube',
  moduleType: 'USER',
  requestLimit: 5,
  use: '-h/help để xem cách dùng!',
  depent: [
    'axios@latest',
    '@distube/ytdl-core@latest'
  ]
}

this.OnChat = async function ({ message, args, event }) {
  var { senderID } = event;
  if (args.length == 0) 
    return message
      .reply('𝑻𝒉𝒆 𝑺𝒆𝒂𝒓𝒄𝒉 𝑺𝒆𝒄𝒕𝒊𝒐𝒏 𝑪𝒂𝒏𝒕 𝑩𝒆 𝑬𝒎𝒑𝒕𝒚!');

  var key = args[0].toLowerCase();
  switch (key) {
    case 'help':
    case '-h':
      break;
    case 'video':
    case '-v': 
      break;
    case '-a':
    case 'audio':
      var input = args.slice(1).join(' ');
      var isURL = checkURL.exec(input);

      if (isURL) {
        var url = 'https://www.youtube.com/watch?v=' + isURL.pop();
        return await Youtube(url, true, message);
      }
      break;
    default:
      break;
  }
}